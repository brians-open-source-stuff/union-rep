"use server";

import { deleteDepartment } from "@/data/department-dto";
import { revalidatePath } from "next/cache";
import z from "zod";

export type DeleteDepartmentFormState = {
  success: boolean;
  error?: string;
};

const DeleteDepartmentSchema = z.object({
  departmentId: z.uuid(),
  confirmText: z.literal("SLET"),
});

export default async function deleteDepartmentAction(
  _prevState: DeleteDepartmentFormState,
  formData: FormData,
): Promise<DeleteDepartmentFormState> {
  const parsed = DeleteDepartmentSchema.safeParse({
    departmentId: formData.get("departmentId"),
    confirmText: formData.get("confirmText"),
  });

  if (!parsed.success) {
    return { success: false, error: "Skriv SLET for at bekræfte" };
  }

  const result = await deleteDepartment(parsed.data.departmentId);

  if (!result.ok) {
    return { success: false, error: result.reason ?? "Kunne ikke slette afdelingen" };
  }

  revalidatePath("/settings/departments");
  return { success: true };
}
