"use client";

import { useEffect, useState } from "react";
import { EncryptedCaseForClient } from "@/data/case-dto";
import { CasePayloadV1, EncryptedCaseEnvelopeV1 } from "@/types";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ManageCaseNotesForm from "@/components/forms/manage-case-notes-form";
import { toast } from "sonner";
import { rewrapRecordWithAccessKeys } from "@/lib/client-rewrap";
import type { DeviceKeyForRewrap, RecordForRewrap } from "@/lib/client-rewrap";

type CaseRecordForRewrap = Omit<RecordForRewrap, "payload"> & {
  payload: EncryptedCaseEnvelopeV1;
};

type DecryptedCase = CasePayloadV1 & { id: string; createdAt: Date };

type CaseState =
  | { status: "pending" }
  | { status: "decrypted"; data: DecryptedCase[] }
  | { status: "no-key" }
  | { status: "error"; message: string };

export default function CaseList({
  cases,
  employeeId,
  currentUserName,
}: {
  cases: EncryptedCaseForClient[];
  employeeId: string;
  currentUserName: string;
}) {
  const [state, setState] = useState<CaseState>({ status: "pending" });

  useEffect(
    function () {
      if (cases.length === 0) {
        return;
      }

      async function decryptAll() {
        const { unwrapDek } = await import("@/lib/device-crypto");
        const { decryptCasePayload } = await import("@/lib/case-crypto");

        const results: DecryptedCase[] = [];
        let updatedCount = 0;

        async function fetchRecipients(): Promise<DeviceKeyForRewrap[]> {
          const response = await fetch(`/api/keys/public?employeeId=${employeeId}`);
          if (!response.ok) {
            throw new Error("Kunne ikke hente modtagernogler");
          }

          const data = (await response.json()) as { keys?: DeviceKeyForRewrap[] };
          return data.keys ?? [];
        }

        async function fetchCaseForRewrap(caseId: string): Promise<CaseRecordForRewrap> {
          const response = await fetch(`/api/rewrap/case/${caseId}`);
          if (!response.ok) {
            throw new Error("Kunne ikke hente sag til nogleopdatering");
          }

          return response.json() as Promise<CaseRecordForRewrap>;
        }

        async function tryDecryptWithAnyEnvelope(record: CaseRecordForRewrap): Promise<CasePayloadV1 | null> {
          for (const envelope of record.keyEnvelopes) {
            try {
              const cek = await unwrapDek(envelope.edk, envelope.recipientKeyId);
              return await decryptCasePayload(record.payload, { employeeId, cek });
            } catch {
              // Try next envelope.
            }
          }

          return null;
        }

        async function ensureCaseReadable(caseId: string): Promise<CasePayloadV1 | null> {
          const caseRecord = await fetchCaseForRewrap(caseId);
          const directPayload = await tryDecryptWithAnyEnvelope(caseRecord);
          if (directPayload) {
            return directPayload;
          }

          const recipients = await fetchRecipients();
          const wrappedKeys = await rewrapRecordWithAccessKeys(caseRecord, recipients);
          if (!wrappedKeys || wrappedKeys.length === 0) {
            return null;
          }

          const updateResponse = await fetch("/api/rewrap/update-case", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ caseId, wrappedKeys }),
          });

          if (!updateResponse.ok) {
            return null;
          }

          updatedCount += 1;

          const refreshed = await fetchCaseForRewrap(caseId);
          return tryDecryptWithAnyEnvelope(refreshed);
        }

        for (const c of cases) {
          let payload: CasePayloadV1 | null = null;

          if (c.wrappedKey) {
            try {
              const cek = await unwrapDek(c.wrappedKey.edk, c.wrappedKey.keyId);
              payload = await decryptCasePayload(c.envelope, { employeeId, cek });
            } catch {
              payload = await ensureCaseReadable(c.id);
            }
          } else {
            payload = await ensureCaseReadable(c.id);
          }

          if (!payload) {
            setState({ status: "no-key" });
            return;
          }

          results.push({ id: c.id, createdAt: c.createdAt, ...payload });
        }

        if (updatedCount > 0) {
          toast.success(`Opdaterede noegleadgang for ${updatedCount} sag${updatedCount === 1 ? "" : "er"}.`);
        }

        setState({ status: "decrypted", data: results });
      }

      decryptAll().catch((err) =>
        setState({ status: "error", message: err instanceof Error ? err.message : String(err) })
      );
    },
    [cases, employeeId]
  );

  if (cases.length === 0) {
    return <p className="text-sm text-muted-foreground">Ingen sager registreret.</p>;
  }

  if (state.status === "pending") {
    return <p className="text-sm text-muted-foreground">Dekrypterer sager…</p>;
  }

  if (state.status === "no-key") {
    return (
      <p className="text-sm text-destructive">
        Din enhed har ikke adgang til at dekryptere disse sager endnu.
      </p>
    );
  }

  if (state.status === "error") {
    return (
      <p className="text-sm text-destructive">
        Dekryptering fejlede: {state.message}
      </p>
    );
  }

  return (
    <ul className="mt-2 flex flex-col gap-4">
      {state.data.map((c) => (
        <li key={c.id} className="rounded-md border p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{c.name}</h3>
            <span className="text-xs text-muted-foreground">
              {Intl.DateTimeFormat("da-DK", { dateStyle: "long" }).format(c.createdAt)}
            </span>
          </div>
          <p className="mt-1 text-sm">{c.description}</p>
          {c.notes && c.notes.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer select-none text-sm text-muted-foreground">
                Noter ({c.notes.length})
              </summary>
              <ul className="mt-2 flex flex-col gap-1">
                {c.notes.map((note, i) => (
                  <li key={i} className="text-sm">
                    <span className="font-medium">{note.createdBy}</span>:{" "}
                    {note.content}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <div className="mt-3">
            <Dialog>
              <DialogTrigger render={<Button type="button" variant="outline" size="sm">Administrer noter</Button>} />
              <DialogContent>
                <ManageCaseNotesForm
                  decryptedCase={c}
                  employeeId={employeeId}
                  currentUserName={currentUserName}
                />
              </DialogContent>
            </Dialog>
          </div>
        </li>
      ))}
    </ul>
  );
}
