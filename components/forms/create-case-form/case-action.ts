"use server";

import { createEncryptedCase } from "@/data/case-dto";
import { EncryptedCaseEnvelopeV1 } from "@/types";
import { revalidatePath } from "next/cache";
import z from "zod";

export type CreateCaseFormState = {
  success: boolean;
  error?: string;
};

const EnvelopeSchema = z.object({
  v: z.literal(1),
  alg: z.literal("A256GCM"),
  keyVersion: z.number().int().positive(),
  kid: z.string().min(1),
  iv: z.string().min(1),
  ct: z.string().min(1),
  aad: z.string().min(1),
});

const ActionSchema = z.object({
  employeeId: z.string().uuid(),
  envelope: z.string().min(1),
  edk: z.string().min(1),
  keyId: z.string().uuid(),
  wrapAlg: z.literal("RSA-OAEP-256"),
});

export default async function createCaseAction(
  _prevState: CreateCaseFormState,
  formData: FormData
): Promise<CreateCaseFormState> {
  const payload = ActionSchema.safeParse(Object.fromEntries(formData));
  if (!payload.success) {
    return { success: false, error: "Ugyldige data" };
  }

  let envelope: EncryptedCaseEnvelopeV1;
  try {
    envelope = EnvelopeSchema.parse(JSON.parse(payload.data.envelope));
  } catch {
    return { success: false, error: "Kunne ikke læse krypteret payload" };
  }

  const created = await createEncryptedCase({
    employeeId: payload.data.employeeId,
    envelope,
    wrappedKey: {
      edk: payload.data.edk,
      keyId: payload.data.keyId,
      wrapAlg: payload.data.wrapAlg,
    },
  });

  if (!created.ok) {
    return { success: false, error: created.reason ?? "Kunne ikke oprette sag" };
  }

  revalidatePath(`/employees/${payload.data.employeeId}`);
  return { success: true };
}
