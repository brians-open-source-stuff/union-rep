"use server";

import { deleteManager } from "@/data/manager-dto";
import { revalidatePath } from "next/cache";
import z from "zod";

export type DeleteManagerFormState = {
  success: boolean;
  error?: string;
};

const DeleteManagerSchema = z.object({
  managerId: z.uuid(),
  confirmText: z.literal("SLET"),
});

export default async function deleteManagerAction(
  _prevState: DeleteManagerFormState,
  formData: FormData,
): Promise<DeleteManagerFormState> {
  const parsed = DeleteManagerSchema.safeParse({
    managerId: formData.get("managerId"),
    confirmText: formData.get("confirmText"),
  });

  if (!parsed.success) {
    return { success: false, error: "Skriv SLET for at bekræfte" };
  }

  const result = await deleteManager(parsed.data.managerId);

  if (!result.ok) {
    return { success: false, error: result.reason ?? "Kunne ikke slette lederen" };
  }

  revalidatePath("/settings/managers");
  return { success: true };
}
