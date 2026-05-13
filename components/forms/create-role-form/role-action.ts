"use server";

import { createRole } from "@/data/role-dto";
import { revalidatePath } from "next/cache";
import z from "zod";

export type CreateRoleFormState = {
	success: boolean;
	error?: string;
};

const CreateRoleSchema = z.object({
	name: z.string().trim().min(1),
});

export default async function createRoleAction(
	_prevState: CreateRoleFormState,
	formData: FormData,
): Promise<CreateRoleFormState> {
	const parsed = CreateRoleSchema.safeParse({
		name: formData.get("name"),
	});

	if (!parsed.success) {
		return { success: false, error: "Ugyldige data" };
	}

	const permissionIds = formData
		.getAll("permissionIds")
		.filter((value): value is string => typeof value === "string")
		.filter((value) => z.uuid().safeParse(value).success);

	const result = await createRole({
		name: parsed.data.name,
		permissionIds,
	});

	if (!result.ok) {
		return { success: false, error: result.reason ?? "Kunne ikke oprette rollen" };
	}

	revalidatePath("/settings/roles");
	return { success: true };
}