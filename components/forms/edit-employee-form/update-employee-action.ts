"use server";

import { revalidatePath } from "next/cache";
import z from "zod";
import { updateEmployee } from "@/data/employee-dto";

export type UpdateEmployeeFormState = {
  success: boolean;
  error?: string;
};

const UpdateEmployeeSchema = z.object({
  employeeId: z.uuid(),
  name: z.string().trim().min(1),
  title: z.string().trim().optional(),
  email: z.string().trim().optional(),
  emailAlt: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  phoneAlt: z.string().trim().optional(),
  primaryUserId: z.string().trim().optional(),
  secondaryUserId: z.string().trim().optional(),
});

function emptyToNull(value?: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export default async function updateEmployeeAction(
  _prevState: UpdateEmployeeFormState,
  formData: FormData,
): Promise<UpdateEmployeeFormState> {
  const parsed = UpdateEmployeeSchema.safeParse({
    employeeId: formData.get("employeeId"),
    name: formData.get("name"),
    title: formData.get("title"),
    email: formData.get("email"),
    emailAlt: formData.get("emailAlt"),
    phone: formData.get("phone"),
    phoneAlt: formData.get("phoneAlt"),
    primaryUserId: formData.get("primaryUserId"),
    secondaryUserId: formData.get("secondaryUserId"),
  });

  if (!parsed.success) {
    return { success: false, error: "Ugyldige data" };
  }

  const primaryUserId = emptyToNull(parsed.data.primaryUserId);
  const secondaryUserId = emptyToNull(parsed.data.secondaryUserId);

  const result = await updateEmployee({
    employeeId: parsed.data.employeeId,
    name: parsed.data.name,
    title: emptyToNull(parsed.data.title),
    email: emptyToNull(parsed.data.email),
    emailAlt: emptyToNull(parsed.data.emailAlt),
    phone: emptyToNull(parsed.data.phone),
    phoneAlt: emptyToNull(parsed.data.phoneAlt),
    primaryUserId,
    secondaryUserId,
  });

  if (!result.ok) {
    return { success: false, error: result.reason ?? "Kunne ikke opdatere medarbejderen" };
  }

  revalidatePath(`/employees/${parsed.data.employeeId}`);
  revalidatePath("/employees");

  return { success: true };
}
