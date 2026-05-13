"use server";

import { EncryptedSalaryEnvelopeV1 } from "@/types";
import { revalidatePath } from "next/cache";
import z from "zod";
import { createEncryptedSalary } from "@/data/salary-dto";

export type CreateSalaryFormState = {
  success: boolean;
  error?: string;
};

const CreateSalarySchema = z.object({
  employeeId: z.string().uuid(),
  year: z.coerce.number().int().min(2000).max(2100),
  envelope: z.string().min(1),
  wrappedKeys: z.string().min(1),
});

const EnvelopeSchema = z.object({
  v: z.literal(1),
  alg: z.literal("A256GCM"),
  keyVersion: z.number().int().positive(),
  kid: z.string().min(1),
  iv: z.string().min(1),
  ct: z.string().min(1),
  aad: z.string().min(1),
});

const WrappedKeysSchema = z.array(z.object({
  userId: z.string().uuid(),
  keyId: z.string().uuid(),
  edk: z.string().min(1),
  wrapAlg: z.literal("RSA-OAEP-256"),
})).min(1);

export default async function createSalaryAction(
  _prevState: CreateSalaryFormState,
  formData: FormData,
): Promise<CreateSalaryFormState> {
  const parsed = CreateSalarySchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { success: false, error: "Ugyldige data" };
  }

  let envelope: EncryptedSalaryEnvelopeV1;
  let wrappedKeys: z.infer<typeof WrappedKeysSchema>;
  try {
    envelope = EnvelopeSchema.parse(JSON.parse(parsed.data.envelope));
    wrappedKeys = WrappedKeysSchema.parse(JSON.parse(parsed.data.wrappedKeys));
  } catch {
    return { success: false, error: "Kunne ikke læse krypteret payload" };
  }

  const result = await createEncryptedSalary({
    employeeId: parsed.data.employeeId,
    year: parsed.data.year,
    envelope,
    wrappedKeys,
  });

  if (!result.ok) {
    return { success: false, error: result.reason ?? "Kunne ikke oprette lønforhandling" };
  }

  revalidatePath(`/employees/${parsed.data.employeeId}`);
  return { success: true };
}
