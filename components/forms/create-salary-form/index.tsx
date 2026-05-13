"use client";

import { Button } from "@/components/ui/button";
import { DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { EmployeeSalary } from "@/types";
import { FormEvent, startTransition, useActionState, useMemo, useState } from "react";
import createSalaryAction, { type CreateSalaryFormState } from "./salary-action";

const initialState: CreateSalaryFormState = { success: false };

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

export default function CreateSalaryForm({ employeeId, currentUserName }: { employeeId: string; currentUserName: string }) {
  const [formState, formAction, pending] = useActionState(createSalaryAction, initialState);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [qualification, setQualification] = useState("0");
  const [functional, setFunctional] = useState("0");
  const [bonus, setBonus] = useState("0");
  const [retentionBonus, setRetentionBonus] = useState("0");
  const [totalApproved, setTotalApproved] = useState("0");
  const [notes, setNotes] = useState("");

  const isValid = useMemo(() => {
    const yearNum = Number.parseInt(year, 10);
    return Number.isInteger(yearNum) && yearNum >= 2000 && yearNum <= 2100;
  }, [year]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const { getActiveDeviceKeyId } = await import("@/lib/device-crypto");
    const { encryptSalaryPayload } = await import("@/lib/salary-crypto");

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

    const salary: EmployeeSalary = {
      year: new Date(Number(year), 0, 1),
      employeeId,
      qualification: Number.parseFloat(qualification) || 0,
      function: Number.parseFloat(functional) || 0,
      bonus: Number.parseFloat(bonus) || 0,
      retention_bonus: Number.parseFloat(retentionBonus) || 0,
      total_approved: Number.parseFloat(totalApproved) || 0,
    };

    const envelope = await encryptSalaryPayload(
      {
        year: salary.year.getFullYear(),
        qualification: salary.qualification,
        function: salary.function,
        bonus: salary.bonus,
        retention_bonus: salary.retention_bonus,
        total_approved: salary.total_approved,
        notes: notes.trim()
          ? [{ createdAt: new Date().toISOString(), createdBy: currentUserName, content: notes.trim() }]
          : [],
      },
      { employeeId, keyVersion: 1, kid: activeKeyId, cek },
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
    fd.set("year", String(salary.year.getFullYear()));
    fd.set("envelope", JSON.stringify(envelope));
    fd.set("wrappedKeys", JSON.stringify(wrappedKeys));

    startTransition(() => {
      formAction(fd);
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="employeeId" value={employeeId} />
      <DialogHeader>
        <DialogTitle>Ny lønforhandling</DialogTitle>
        <DialogDescription>Krypteres på klienten før den gemmes.</DialogDescription>
        <FieldGroup>
          <FieldLabel className="flex flex-col items-start">
            <span>År</span>
            <Input type="number" name="year" min="2000" max="2100" value={year} onChange={(e) => setYear(e.target.value)} required />
          </FieldLabel>
          <FieldLabel className="flex flex-col items-start">
            <span>Kvalifikation</span>
            <Input type="number" name="qualification" min="0" step="0.01" value={qualification} onChange={(e) => setQualification(e.target.value)} />
          </FieldLabel>
          <FieldLabel className="flex flex-col items-start">
            <span>Funktion</span>
            <Input type="number" name="function" min="0" step="0.01" value={functional} onChange={(e) => setFunctional(e.target.value)} />
          </FieldLabel>
          <FieldLabel className="flex flex-col items-start">
            <span>Bonus</span>
            <Input type="number" name="bonus" min="0" step="0.01" value={bonus} onChange={(e) => setBonus(e.target.value)} />
          </FieldLabel>
          <FieldLabel className="flex flex-col items-start">
            <span>Fastholdelsestillæg</span>
            <Input type="number" name="retention_bonus" min="0" step="0.01" value={retentionBonus} onChange={(e) => setRetentionBonus(e.target.value)} />
          </FieldLabel>
          <FieldLabel className="flex flex-col items-start">
            <span>I alt godkendt</span>
            <Input type="number" name="total_approved" min="0" step="0.01" value={totalApproved} onChange={(e) => setTotalApproved(e.target.value)} />
          </FieldLabel>
          <FieldLabel className="flex flex-col items-start">
            <span>Noter</span>
            <textarea name="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-md border px-2 py-1" rows={3} />
          </FieldLabel>
          {formState.error && <p className="text-sm text-red-600">{formState.error}</p>}
          {formState.success && <p className="text-sm text-green-700">Lønforhandling oprettet</p>}
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline">Annuller</Button>} />
          <Button type="submit" disabled={pending || !isValid}>{pending ? "Gemmer..." : "Opret"}</Button>
        </DialogFooter>
      </DialogHeader>
    </form>
  );
}
