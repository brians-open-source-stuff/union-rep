"use server";

import { updateEncryptedCase } from "@/data/case-dto";
import { EncryptedCaseEnvelopeV1 } from "@/types";
import { revalidatePath } from "next/cache";
import z from "zod";

export type ManageCaseNotesFormState = {
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
  caseId: z.string().uuid(),
  employeeId: z.string().uuid(),
  envelope: z.string().min(1),
  wrappedKeys: z.string().min(1),
});

const WrappedKeysSchema = z.array(z.object({
  userId: z.string().uuid(),
  keyId: z.string().uuid(),
  edk: z.string().min(1),
  wrapAlg: z.literal("RSA-OAEP-256"),
})).min(1);

export default async function manageCaseNotesAction(
  _prevState: ManageCaseNotesFormState,
  formData: FormData
): Promise<ManageCaseNotesFormState> {
  const payload = ActionSchema.safeParse(Object.fromEntries(formData));
  if (!payload.success) {
    return { success: false, error: "Ugyldige data" };
  }

  let envelope: EncryptedCaseEnvelopeV1;
  let wrappedKeys: z.infer<typeof WrappedKeysSchema>;
  try {
    envelope = EnvelopeSchema.parse(JSON.parse(payload.data.envelope));
    wrappedKeys = WrappedKeysSchema.parse(JSON.parse(payload.data.wrappedKeys));
  } catch {
    return { success: false, error: "Kunne ikke læse krypteret payload" };
  }

  const result = await updateEncryptedCase({
    caseId: payload.data.caseId,
    envelope,
    wrappedKeys,
  });

  if (!result.ok) {
    return { success: false, error: result.reason ?? "Kunne ikke opdatere sagen" };
  }

  revalidatePath(`/employees/${payload.data.employeeId}`);
  return { success: true };
}
