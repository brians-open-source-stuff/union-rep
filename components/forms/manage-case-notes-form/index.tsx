"use client";

import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CasePayloadV1 } from "@/types";
import { FormEvent, startTransition, useActionState, useState } from "react";
import manageCaseNotesAction, { ManageCaseNotesFormState } from "./note-action";

type DecryptedCase = CasePayloadV1 & { id: string; createdAt: Date };

const initialState: ManageCaseNotesFormState = { success: false };

function b64urlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

type RecipientPublicKey = {
  keyId: string;
  userId: string;
  publicKey: JsonWebKey;
  algorithm: "RSA-OAEP-256";
};

export default function ManageCaseNotesForm({
  decryptedCase,
  employeeId,
  currentUserName,
}: {
  decryptedCase: DecryptedCase;
  employeeId: string;
  currentUserName: string;
}) {
  const [formState, formAction, pending] = useActionState(manageCaseNotesAction, initialState);
  const [notes, setNotes] = useState(decryptedCase.notes ?? []);
  const [newNoteContent, setNewNoteContent] = useState("");

  function addNote() {
    const trimmed = newNoteContent.trim();
    if (!trimmed) return;
    setNotes((prev) => [
      ...prev,
      {
        createdAt: new Date().toISOString(),
        createdBy: currentUserName,
        content: trimmed,
      },
    ]);
    setNewNoteContent("");
  }

  function deleteNote(index: number) {
    setNotes((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const { getActiveDeviceKeyId } = await import("@/lib/device-crypto");
    const { encryptCasePayload } = await import("@/lib/case-crypto");

    const activeKeyId = await getActiveDeviceKeyId();
    if (!activeKeyId) throw new Error("Ingen aktiv enhedsnøgle fundet");

    const recipientsResponse = await fetch(`/api/keys/public?employeeId=${employeeId}`);
    if (!recipientsResponse.ok) {
      throw new Error("Kunne ikke hente modtagernes nøgler");
    }

    const recipientsPayload = await recipientsResponse.json() as { keys: RecipientPublicKey[] };
    const recipientKeys = recipientsPayload.keys.filter((key) => key.algorithm === "RSA-OAEP-256");
    if (recipientKeys.length === 0) {
      throw new Error("Ingen aktive modtagernøgler fundet");
    }

    const cek = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );

    const envelope = await encryptCasePayload(
      {
        name: decryptedCase.name,
        description: decryptedCase.description,
        notes: notes.map((n) => ({
          createdAt: typeof n.createdAt === "string" ? n.createdAt : new Date(n.createdAt).toISOString(),
          createdBy: String(n.createdBy),
          content: String(n.content),
        })),
      },
      { employeeId, keyVersion: 1, kid: activeKeyId, cek }
    );

    const wrappedKeys = await Promise.all(
      recipientKeys.map(async (recipient) => {
        const publicKey = await crypto.subtle.importKey(
          "jwk",
          recipient.publicKey,
          { name: "RSA-OAEP", hash: "SHA-256" },
          true,
          ["wrapKey"],
        );

        const wrapped = await crypto.subtle.wrapKey("raw", cek, publicKey, { name: "RSA-OAEP" });
        return {
          userId: recipient.userId,
          keyId: recipient.keyId,
          edk: b64urlEncode(wrapped),
          wrapAlg: "RSA-OAEP-256" as const,
        };
      }),
    );

    if (!wrappedKeys.some((wrappedKey) => wrappedKey.keyId === activeKeyId)) {
      throw new Error("Din aktive enhedsnøgle mangler i modtagerlisten");
    }

    const fd = new FormData();
    fd.set("caseId", decryptedCase.id);
    fd.set("employeeId", employeeId);
    fd.set("envelope", JSON.stringify(envelope));
    fd.set("wrappedKeys", JSON.stringify(wrappedKeys));

    startTransition(() => {
      formAction(fd);
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Administrer noter</DialogTitle>
        <DialogDescription>{decryptedCase.name}</DialogDescription>
      </DialogHeader>

      <div className="my-4 flex flex-col gap-2">
        {notes.length === 0 && (
          <p className="text-sm text-muted-foreground">Ingen noter endnu.</p>
        )}
        {notes.map((note, i) => (
          <div key={i} className="flex items-start gap-2 rounded-md border p-3">
            <div className="flex-1 text-sm">
              <span className="font-medium">{note.createdBy}</span>:{" "}
              {note.content}
            </div>
            <Button
              type="button"
              variant="ghost"
              className="shrink-0 text-destructive"
              onClick={() => deleteNote(i)}
            >
              Slet
            </Button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <textarea
          value={newNoteContent}
          onChange={(e) => setNewNoteContent(e.target.value)}
          placeholder="Skriv ny note..."
          className="min-h-16 flex-1 rounded-md border p-2 text-sm"
        />
        <Button type="button" variant="outline" onClick={addNote} disabled={!newNoteContent.trim()}>
          Tilføj
        </Button>
      </div>

      {formState.error && (
        <p className="mt-2 text-sm text-destructive">{formState.error}</p>
      )}
      {formState.success && (
        <p className="mt-2 text-sm text-green-700">Ændringer gemt.</p>
      )}

      <DialogFooter className="mt-4">
        <DialogClose render={<Button type="button" variant="outline">Annuller</Button>} />
        <Button type="submit" disabled={pending}>
          {pending ? "Gemmer..." : "Gem ændringer"}
        </Button>
      </DialogFooter>
    </form>
  );
}
