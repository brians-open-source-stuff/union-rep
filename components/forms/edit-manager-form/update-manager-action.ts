"use server";

import { updateManager } from "@/data/manager-dto";
import { revalidatePath } from "next/cache";
import z from "zod";

export type UpdateManagerFormState = {
  success: boolean;
  error?: string;
};

const UpdateManagerSchema = z.object({
  managerId: z.uuid(),
  name: z.string().trim().min(1),
  title: z.string().trim().min(1),
  chiefId: z.uuid().optional(),
});

export default async function updateManagerAction(
  _prevState: UpdateManagerFormState,
  formData: FormData,
): Promise<UpdateManagerFormState> {
  const rawChiefId = formData.get("chiefId");
  const parsed = UpdateManagerSchema.safeParse({
    managerId: formData.get("managerId"),
    name: formData.get("name"),
    title: formData.get("title"),
    chiefId: rawChiefId && typeof rawChiefId === "string" && rawChiefId.trim() !== "" ? rawChiefId.trim() : undefined,
  });

  if (!parsed.success) {
    return { success: false, error: "Ugyldige data" };
  }

  const departmentIds = formData
    .getAll("departmentIds")
    .filter((value): value is string => typeof value === "string")
    .filter((value) => z.uuid().safeParse(value).success);

  const result = await updateManager({
    managerId: parsed.data.managerId,
    name: parsed.data.name,
    title: parsed.data.title,
    chiefId: parsed.data.chiefId,
    departmentIds,
  });

  if (!result.ok) {
    return { success: false, error: result.reason ?? "Kunne ikke opdatere lederen" };
  }

  revalidatePath("/settings/managers");
  return { success: true };
}
