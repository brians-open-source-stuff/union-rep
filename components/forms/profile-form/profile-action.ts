"use server";

import { updateCurrentUserProfile } from "@/data/user-dto";
import { revalidatePath } from "next/cache";
import z from "zod";

export type ProfileFormState = {
	success: boolean;
	error?: string;
};

const ProfileSchema = z.object({
	name: z.string().trim().min(1, "Navn må ikke være tomt"),
	currentPassword: z.string().optional(),
	newPassword: z.string().optional(),
	confirmPassword: z.string().optional(),
});

export default async function profileAction(
	_prevState: ProfileFormState,
	formData: FormData,
): Promise<ProfileFormState> {
	const parsed = ProfileSchema.safeParse({
		name: formData.get("name"),
		currentPassword: formData.get("currentPassword"),
		newPassword: formData.get("newPassword"),
		confirmPassword: formData.get("confirmPassword"),
	});

	if (!parsed.success) {
		return { success: false, error: "Ugyldige data" };
	}

	const result = await updateCurrentUserProfile(parsed.data);
	if (!result.ok) {
		return { success: false, error: result.reason ?? "Kunne ikke opdatere profilen" };
	}

	revalidatePath("/profile");
	return { success: true };
}
