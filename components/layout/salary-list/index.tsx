"use client";

import { EncryptedSalaryEnvelopeV1, EncryptedSalaryForClient, SalaryPayloadV1 } from "@/types";
import { useEffect, useState } from "react";
import { decryptSalaryPayload } from "@/lib/salary-crypto";
import { toast } from "sonner";
import { rewrapRecordWithAccessKeys } from "@/lib/client-rewrap";
import type { DeviceKeyForRewrap, RecordForRewrap } from "@/lib/client-rewrap";

type SalaryRecordForRewrap = Omit<RecordForRewrap, "payload"> & {
  payload: EncryptedSalaryEnvelopeV1;
};

export default function SalaryList({ salaries, employeeId }: { salaries: EncryptedSalaryForClient[]; employeeId: string }) {
  const [decrypted, setDecrypted] = useState<Array<{ id: string; year: number; payload: SalaryPayloadV1 }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function decryptAll() {
      if (salaries.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const { getActiveDeviceUser, unwrapDek } = await import("@/lib/device-crypto");
        const activeUserId = getActiveDeviceUser();
        let updatedCount = 0;
        let unreadableCount = 0;
        let missingOwnHistoricalKeyCount = 0;

        async function fetchRecipients(): Promise<DeviceKeyForRewrap[]> {
          const response = await fetch(`/api/keys/public?employeeId=${employeeId}`);
          if (!response.ok) {
            throw new Error("Kunne ikke hente modtagernogler");
          }

          const data = (await response.json()) as { keys?: DeviceKeyForRewrap[] };
          return data.keys ?? [];
        }

        async function fetchSalaryForRewrap(salaryId: string): Promise<SalaryRecordForRewrap> {
          const response = await fetch(`/api/rewrap/salary/${salaryId}`);
          if (!response.ok) {
            throw new Error("Kunne ikke hente lonforhandling til nogleopdatering");
          }

          return response.json() as Promise<SalaryRecordForRewrap>;
        }

        async function tryDecryptWithAnyEnvelope(record: SalaryRecordForRewrap): Promise<SalaryPayloadV1 | null> {
          for (const envelope of record.keyEnvelopes) {
            try {
              const cek = await unwrapDek(envelope.edk, envelope.recipientKeyId);
              return await decryptSalaryPayload(record.payload, {
                employeeId: record.employeeId,
                cek,
              });
            } catch {
              // Try next envelope.
            }
          }

          return null;
        }

        async function ensureSalaryReadable(salaryId: string): Promise<SalaryPayloadV1 | null> {
          const salaryRecord = await fetchSalaryForRewrap(salaryId);
          const directPayload = await tryDecryptWithAnyEnvelope(salaryRecord);
          if (directPayload) {
            return directPayload;
          }

          if (
            activeUserId &&
            salaryRecord.keyEnvelopes.some((envelope) => envelope.recipientUserId === activeUserId)
          ) {
            missingOwnHistoricalKeyCount += 1;
          }

          const recipients = await fetchRecipients();
          const wrappedKeys = await rewrapRecordWithAccessKeys(salaryRecord, recipients);
          if (!wrappedKeys || wrappedKeys.length === 0) {
            return null;
          }

          const updateResponse = await fetch("/api/rewrap/update-salary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ salaryId, wrappedKeys }),
          });

          if (!updateResponse.ok) {
            return null;
          }

          updatedCount += 1;

          const refreshed = await fetchSalaryForRewrap(salaryId);
          return tryDecryptWithAnyEnvelope(refreshed);
        }

        const results = [] as Array<{ id: string; year: number; payload: SalaryPayloadV1 }>;
        for (const salary of salaries) {
          let payload: SalaryPayloadV1 | null = null;

          if (salary.wrappedKey) {
            try {
              const cek = await unwrapDek(salary.wrappedKey.edk, salary.wrappedKey.keyId);
              payload = await decryptSalaryPayload(salary.envelope, {
                employeeId: salary.employeeId,
                cek,
              });
            } catch {
              payload = await ensureSalaryReadable(salary.id);
            }
          } else {
            payload = await ensureSalaryReadable(salary.id);
          }

          if (!payload) {
            unreadableCount += 1;
            continue;
          }

          results.push({ id: salary.id, year: salary.year, payload });
        }

        if (updatedCount > 0) {
          toast.success(`Opdaterede noegleadgang for ${updatedCount} lonforhandling${updatedCount === 1 ? "" : "er"}.`);
        }

        if (unreadableCount > 0) {
          if (missingOwnHistoricalKeyCount > 0) {
            toast.warning(
              "Nogle historiske lonforhandlinger er krypteret med en noegle fra en anden enhed. Aabn medarbejderen pa en enhed med eksisterende adgang for at opdatere noegler.",
            );
          } else {
            toast.warning(
              `Kunne ikke dekryptere ${unreadableCount} lonforhandling${unreadableCount === 1 ? "" : "er"}.`,
            );
          }
        }

        if (results.length === 0 && unreadableCount > 0) {
          if (missingOwnHistoricalKeyCount > 0) {
            setError(
              "Historiske lonforhandlinger er krypteret med en noegle fra en anden enhed. Aabn medarbejderen pa en enhed med eksisterende adgang for at opdatere noegler.",
            );
          } else {
            setError("Manglende noegleadgang for mindst en lonforhandling");
          }
        }

        setDecrypted(results);
      } catch (error) {
        console.error("Failed to decrypt salaries", error);
        setError(error instanceof Error ? error.message : "Ukendt dekrypteringsfejl");
      } finally {
        setLoading(false);
      }
    }

    decryptAll();
  }, [employeeId, salaries]);

  if (loading) return <p>Indlæser lønforhandlinger...</p>;

  if (error) {
    return <p className="text-sm text-destructive">Dekryptering fejlede: {error}</p>;
  }

  if (decrypted.length === 0) {
    return <p className="text-gray-600">Ingen lønforhandlinger registreret</p>;
  }

  return (
    <div className="space-y-4">
      {decrypted.map((item) => (
        <div key={item.id} className="rounded-lg border p-4">
          <h3 className="text-lg font-semibold">{item.year}</h3>
          <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Kvalifikation:</span> {item.payload.qualification}
            </div>
            <div>
              <span className="font-medium">Funktion:</span> {item.payload.function}
            </div>
            <div>
              <span className="font-medium">Bonus:</span> {item.payload.bonus}
            </div>
            <div>
              <span className="font-medium">Fastholdelsestillæg:</span> {item.payload.retention_bonus}
            </div>
            <div className="col-span-2">
              <span className="font-medium">I alt godkendt:</span> {item.payload.total_approved}
            </div>
          </div>
          {item.payload.notes.length > 0 && (
            <div className="mt-3 border-t pt-3">
              <p className="font-medium text-sm mb-2">Noter:</p>
              {item.payload.notes.map((note, idx) => (
                <p key={idx} className="text-sm text-gray-700">
                  <strong>{note.createdBy}</strong> ({new Date(note.createdAt).toLocaleDateString("da-DK")}): {note.content}
                </p>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
