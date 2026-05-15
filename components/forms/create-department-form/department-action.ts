"use server";

import { createDepartment } from "@/data/department-dto";
import { revalidatePath } from "next/cache";
import z from "zod";

export type CreateDepartmentFormState = {
  success: boolean;
  error?: string;
};

const CreateDepartmentSchema = z.object({
  name: z.string().trim().min(1),
  streetaddress1: z.string().trim().min(1),
  streetaddress2: z.string().trim().optional(),
  zipcode: z.coerce.number().int().positive(),
  city: z.string().trim().min(1),
});

export default async function createDepartmentAction(
  _prevState: CreateDepartmentFormState,
  formData: FormData,
): Promise<CreateDepartmentFormState> {
  const parsed = CreateDepartmentSchema.safeParse({
    name: formData.get("name"),
    streetaddress1: formData.get("streetaddress1"),
    streetaddress2: formData.get("streetaddress2") || undefined,
    zipcode: formData.get("zipcode"),
    city: formData.get("city"),
  });

  if (!parsed.success) {
    return { success: false, error: "Ugyldige data" };
  }

  const result = await createDepartment({
    name: parsed.data.name,
    streetaddress1: parsed.data.streetaddress1,
    streetaddress2: parsed.data.streetaddress2,
    zipcode: parsed.data.zipcode,
    city: parsed.data.city,
  });

  if (!result.ok) {
    return { success: false, error: result.reason ?? "Kunne ikke oprette afdelingen" };
  }

  revalidatePath("/settings/departments");
  return { success: true };
}
