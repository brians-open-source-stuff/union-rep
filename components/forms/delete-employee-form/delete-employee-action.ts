"use server";

import { deleteEmployee } from "@/data/employee-dto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import z from "zod";

export type DeleteEmployeeFormState = {
  success: boolean;
  error?: string;
};

const DeleteEmployeeSchema = z.object({
  employeeId: z.uuid(),
  confirmText: z.literal("SLET"),
});

export default async function deleteEmployeeAction(
  _prevState: DeleteEmployeeFormState,
  formData: FormData,
): Promise<DeleteEmployeeFormState> {
  const parsed = DeleteEmployeeSchema.safeParse({
    employeeId: formData.get("employeeId"),
    confirmText: formData.get("confirmText"),
  });

  if (!parsed.success) {
    return { success: false, error: "Skriv SLET for at bekrafte" };
  }

  const result = await deleteEmployee(parsed.data.employeeId);
  if (!result.ok) {
    return { success: false, error: result.reason ?? "Kunne ikke slette medarbejderen" };
  }

  revalidatePath("/employees");
  redirect("/employees");
}