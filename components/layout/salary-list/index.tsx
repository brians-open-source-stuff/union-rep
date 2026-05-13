"use client";

import { EncryptedSalaryForClient, SalaryPayloadV1 } from "@/types";
import { useEffect, useState } from "react";
import { decryptSalaryPayload } from "@/lib/salary-crypto";

export default function SalaryList({ salaries }: { salaries: EncryptedSalaryForClient[] }) {
  const [decrypted, setDecrypted] = useState<Array<{ id: string; year: number; payload: SalaryPayloadV1 }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function decryptAll() {
      try {
        const { unwrapDek } = await import("@/lib/device-crypto");

        const results = await Promise.all(
          salaries.map(async (salary) => {
            if (!salary.wrappedKey) {
              throw new Error("Manglende nøgleadgang for mindst én lønforhandling");
            }

            const cek = await unwrapDek(salary.wrappedKey.edk, salary.wrappedKey.keyId);
            const payload = await decryptSalaryPayload(salary.envelope, {
              employeeId: salary.employeeId,
              cek,
            });
            return { id: salary.id, year: salary.year, payload };
          })
        );
        setDecrypted(results);
      } catch (error) {
        console.error("Failed to decrypt salaries", error);
        setError(error instanceof Error ? error.message : "Ukendt dekrypteringsfejl");
      } finally {
        setLoading(false);
      }
    }

    if (salaries.length > 0) {
      decryptAll();
    } else {
      setLoading(false);
    }
  }, [salaries]);

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
