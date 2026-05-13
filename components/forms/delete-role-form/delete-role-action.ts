"use server";

import { deleteRole } from "@/data/role-dto";
import { revalidatePath } from "next/cache";
import z from "zod";

export type DeleteRoleFormState = {
  success: boolean;
  error?: string;
};

const DeleteRoleSchema = z.object({
  roleId: z.uuid(),
  confirmText: z.literal("SLET"),
});

export default async function deleteRoleAction(
  _prevState: DeleteRoleFormState,
  formData: FormData,
): Promise<DeleteRoleFormState> {
  const parsed = DeleteRoleSchema.safeParse({
    roleId: formData.get("roleId"),
    confirmText: formData.get("confirmText"),
  });

  if (!parsed.success) {
    return { success: false, error: "Skriv SLET for at bekrafte" };
  }

  const result = await deleteRole(parsed.data.roleId);
  if (!result.ok) {
    return { success: false, error: result.reason ?? "Kunne ikke slette rollen" };
  }

  revalidatePath("/settings/roles");
  return { success: true };
}