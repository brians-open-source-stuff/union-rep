"use server";

import { updateRole } from "@/data/role-dto";
import { revalidatePath } from "next/cache";
import z from "zod";

export type UpdateRoleFormState = {
  success: boolean;
  error?: string;
};

const UpdateRoleSchema = z.object({
  roleId: z.uuid(),
  name: z.string().trim().min(1),
});

export default async function updateRoleAction(
  _prevState: UpdateRoleFormState,
  formData: FormData,
): Promise<UpdateRoleFormState> {
  const parsed = UpdateRoleSchema.safeParse({
    roleId: formData.get("roleId"),
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { success: false, error: "Ugyldige data" };
  }

  const permissionIds = formData
    .getAll("permissionIds")
    .filter((value): value is string => typeof value === "string")
    .filter((value) => z.uuid().safeParse(value).success);

  const result = await updateRole({
    roleId: parsed.data.roleId,
    name: parsed.data.name,
    permissionIds,
  });

  if (!result.ok) {
    return { success: false, error: result.reason ?? "Kunne ikke opdatere rollen" };
  }

  revalidatePath("/settings/roles");
  return { success: true };
}