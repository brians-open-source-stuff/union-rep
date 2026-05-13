"use client";

import { Button } from "@/components/ui/button";
import { DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { EmployeeCase } from "@/types";
import { FormEvent, startTransition, useActionState, useMemo, useState } from "react";
import createCaseAction, { CreateCaseFormState } from "./case-action";

type NoteDraft = { content: string };

const initialState: CreateCaseFormState = { success: false };

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

export default function CreateCaseForm({ employeeId, currentUserName }: { employeeId: string; currentUserName: string }) {
  const [formState, formAction, pending] = useActionState(createCaseAction, initialState);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState<NoteDraft[]>([{ content: "" }]);

  const hasNotes = useMemo(() => notes.some((n) => n.content.trim().length > 0), [notes]);

  function updateNote(index: number, content: string) {
    setNotes((prev) => prev.map((n, i) => (i === index ? { content } : n)));
  }

  function addNote() {
    setNotes((prev) => [...prev, { content: "" }]);
  }

  function removeNote(index: number) {
    setNotes((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const { getActiveDeviceKeyId } = await import("@/lib/device-crypto");
    const { encryptCasePayload } = await import("@/lib/case-crypto");

    const activeKeyId = await getActiveDeviceKeyId();
    if (!activeKeyId) {
      throw new Error("Ingen aktiv enhedsnøgle fundet");
    }

    const recipientsResponse = await fetch(`/api/keys/public?employeeId=${employeeId}`);
    if (!recipientsResponse.ok) {
      throw new Error("Kunne ikke hente modtagernes nøgler");
    }

    const recipientsPayload = await recipientsResponse.json() as { keys: RecipientPublicKey[] };
    const recipientKeys = recipientsPayload.keys.filter((key) => key.algorithm === "RSA-OAEP-256");
    if (recipientKeys.length === 0) {
      throw new Error("Ingen aktive modtagernøgler fundet");
    }

    const cek = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);

    const employeeCase: EmployeeCase = {
      createdAt: new Date(),
      createdBy: currentUserName,
      name,
      description,
      notes: notes
        .filter((n) => n.content.trim().length > 0)
        .map((n) => ({
          createdAt: new Date(),
          createdBy: currentUserName,
          content: n.content.trim(),
        })),
    };

    const envelope = await encryptCasePayload(
      {
        name: String(employeeCase.name),
        description: String(employeeCase.description),
        notes: (employeeCase.notes ?? []).map((note) => ({
          createdAt: new Date(note.createdAt).toISOString(),
          createdBy: String(note.createdBy),
          content: String(note.content),
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
        <DialogTitle>Opret sag</DialogTitle>
        <DialogDescription>Krypteres på klienten før den gemmes.</DialogDescription>
        <FieldGroup>
          <FieldLabel className="flex flex-col items-start">
            <span>Titel</span>
            <Input name="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </FieldLabel>
          <FieldLabel className="flex flex-col items-start">
            <span>Beskrivelse</span>
            <textarea
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-24 w-full rounded-md border p-2"
              required
            />
          </FieldLabel>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Noter</span>
              <Button type="button" variant="outline" onClick={addNote}>Tilføj note</Button>
            </div>
            {notes.map((note, i) => (
              <div key={i} className="space-y-1">
                <textarea
                  value={note.content}
                  onChange={(e) => updateNote(i, e.target.value)}
                  className="min-h-20 w-full rounded-md border p-2"
                  placeholder="Skriv note..."
                />
                {notes.length > 1 && (
                  <Button type="button" variant="ghost" onClick={() => removeNote(i)}>
                    Fjern
                  </Button>
                )}
              </div>
            ))}
          </div>
        </FieldGroup>
        {formState.error && <p className="text-sm text-destructive">{formState.error}</p>}
        {formState.success && <p className="text-sm text-green-700">Sagen er oprettet.</p>}
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline">Annuller</Button>} />
          <Button type="submit" disabled={pending || !name.trim() || !description.trim() || !hasNotes}>
            {pending ? "Gemmer..." : "Opret sag"}
          </Button>
        </DialogFooter>
      </DialogHeader>
    </form>
  );
}
