"use server";

import prisma from "@/config/prisma";
import { getCurrentSession } from "@/data/session";
import { can } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { generateSecret } from "otplib";
import z from "zod";

export type CreateUserFormState = {
	success: boolean;
	error?: string;
};

const CreateUserSchema = z.object({
	name: z.string().min(1),
	email: z.string().email(),
	password: z.string().min(8),
});

export default async function createUserAction(
	_prevState: CreateUserFormState,
	formData: FormData,
): Promise<CreateUserFormState> {
	const session = await getCurrentSession();
	if (!session || !can(session.user, "user:create")) {
		return { success: false, error: "Du har ikke rettigheder til at oprette brugere" };
	}

	const payload = CreateUserSchema.safeParse({
		name: formData.get("name"),
		email: formData.get("email"),
		password: formData.get("password"),
	});

	if (!payload.success) {
		return { success: false, error: "Ugyldige data" };
	}

	// Generate OTP secret
	const otpsecret = generateSecret();

	try {
		await prisma.user.create({
			data: {
				name: payload.data.name,
				email: payload.data.email,
				password: payload.data.password,
				otpsecret,
			},
		});
	} catch {
		return { success: false, error: "Kunne ikke oprette brugeren" };
	}

	revalidatePath("/settings/users");
	return { success: true };
}
