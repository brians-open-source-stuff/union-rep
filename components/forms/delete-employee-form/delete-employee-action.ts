"use server";

import { offboardEmployee } from "@/data/employee-dto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import z from "zod";

export type DeleteEmployeeFormState = {
  success: boolean;
  error?: string;
};

const DeleteEmployeeSchema = z.object({
  employeeId: z.uuid(),
  employmentEndedAt: z.coerce.date(),
  confirmText: z.literal("FRATRAED"),
});

export default async function deleteEmployeeAction(
  _prevState: DeleteEmployeeFormState,
  formData: FormData,
): Promise<DeleteEmployeeFormState> {
  const parsed = DeleteEmployeeSchema.safeParse({
    employeeId: formData.get("employeeId"),
    employmentEndedAt: formData.get("employmentEndedAt"),
    confirmText: formData.get("confirmText"),
  });

  if (!parsed.success) {
    return { success: false, error: "Udfyld fratraedelsesdato og skriv FRATRAED for at bekraefte" };
  }

  const result = await offboardEmployee({
    employeeId: parsed.data.employeeId,
    employmentEndedAt: parsed.data.employmentEndedAt,
  });
  if (!result.ok) {
    return { success: false, error: result.reason ?? "Kunne ikke registrere fratraedelse" };
  }

  revalidatePath("/");
  revalidatePath("/employees");
  redirect("/employees");
}