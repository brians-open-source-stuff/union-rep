"use server";

import { createEmployee } from "@/data/employee-dto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import z from "zod";

export type CreateEmployeeFormState = {
  success: boolean;
  error?: string;
};

const CreateEmployeeSchema = z.object({
  name: z.string().trim().min(1),
  employedAt: z.string().trim().min(1),
  memberSince: z.string().trim().optional(),
  birthdate: z.string().trim().optional(),
  title: z.string().trim().optional(),
  email: z.string().trim().optional(),
  emailAlt: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  phoneAlt: z.string().trim().optional(),
  managerId: z.string().trim().optional(),
  chiefManagerId: z.string().trim().optional(),
});

function emptyToNull(value?: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseDateInput(value?: string): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export default async function createEmployeeAction(
  _prevState: CreateEmployeeFormState,
  formData: FormData,
): Promise<CreateEmployeeFormState> {
  const parsed = CreateEmployeeSchema.safeParse({
    name: formData.get("name"),
    employedAt: formData.get("employedAt"),
    memberSince: formData.get("memberSince"),
    birthdate: formData.get("birthdate"),
    title: formData.get("title"),
    email: formData.get("email"),
    emailAlt: formData.get("emailAlt"),
    phone: formData.get("phone"),
    phoneAlt: formData.get("phoneAlt"),
    managerId: formData.get("managerId"),
    chiefManagerId: formData.get("chiefManagerId"),
  });

  if (!parsed.success) {
    return { success: false, error: "Ugyldige data" };
  }

  const employedAt = parseDateInput(parsed.data.employedAt);
  if (!employedAt) {
    return { success: false, error: "Ansat dato er ugyldig" };
  }

  const result = await createEmployee({
    name: parsed.data.name,
    employedAt,
    memberSince: parseDateInput(parsed.data.memberSince),
    birthdate: parseDateInput(parsed.data.birthdate),
    title: emptyToNull(parsed.data.title),
    email: emptyToNull(parsed.data.email),
    emailAlt: emptyToNull(parsed.data.emailAlt),
    phone: emptyToNull(parsed.data.phone),
    phoneAlt: emptyToNull(parsed.data.phoneAlt),
    managerId: emptyToNull(parsed.data.managerId),
    chiefManagerId: emptyToNull(parsed.data.chiefManagerId),
  });

  if (!result.ok || !result.employeeId) {
    return { success: false, error: result.reason ?? "Kunne ikke oprette medarbejderen" };
  }

  revalidatePath("/employees");
  redirect(`/employees/${result.employeeId}`);
}