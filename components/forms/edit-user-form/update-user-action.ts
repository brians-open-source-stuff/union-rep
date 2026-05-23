"use server";

import prisma from "@/config/prisma";
import { getCurrentSession } from "@/data/session";
import { can } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import z from "zod";

export type UpdateUserFormState = {
  success: boolean;
  error?: string;
};

const BaseSchema = z.object({
  userId: z.string().uuid(),
  password: z.string().optional(),
});

export default async function updateUserAction(
  _prevState: UpdateUserFormState,
  formData: FormData,
): Promise<UpdateUserFormState> {
  const session = await getCurrentSession();
  if (!session || !can(session.user, "user:update")) {
    return { success: false, error: "Du har ikke rettigheder til at redigere brugere" };
  }

  const payload = BaseSchema.safeParse({
    userId: formData.get("userId"),
    password: formData.get("password"),
  });

  if (!payload.success) {
    return { success: false, error: "Ugyldige data" };
  }

  const departmentIds = formData
    .getAll("departmentIds")
    .filter((value): value is string => typeof value === "string")
    .filter((value) => z.uuid().safeParse(value).success);

  const roleIds = formData
    .getAll("roleIds")
    .filter((value): value is string => typeof value === "string")
    .filter((value) => z.uuid().safeParse(value).success);

  const selectedDepartmentIds = [...new Set(departmentIds)];
  const selectedRoleIds = [...new Set(roleIds)];
  const password = payload.data.password?.trim() ?? "";

  if (selectedRoleIds.length === 0) {
    return { success: false, error: "Vælg mindst én rolle" };
  }

  if (password.length > 0 && password.length < 8) {
    return { success: false, error: "Nyt password skal være mindst 8 tegn" };
  }

  try {
    await prisma.user.update({
      where: {
        id: payload.data.userId,
      },
      data: {
        ...(password.length > 0 ? { password, needsPasswordChange: true } : {}),
        roles: {
          set: selectedRoleIds.map((id) => ({ id })),
        },
        assignments: {
          deleteMany: {
            relationshipType: "department_scope",
          },
          ...(selectedDepartmentIds.length > 0
            ? {
              createMany: {
                data: selectedDepartmentIds.map((departmentId) => ({
                  departmentId,
                  relationshipType: "department_scope",
                  grantedByUserId: session.user.id,
                })),
                skipDuplicates: true,
              },
            }
            : {}),
        },
      },
    });
  } catch {
    return { success: false, error: "Kunne ikke opdatere brugeren" };
  }

  revalidatePath("/settings/users");
  return { success: true };
}
