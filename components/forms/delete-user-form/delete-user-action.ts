"use server";

import prisma from "@/config/prisma";
import redis from "@/config/redis";
import { getCurrentSession } from "@/data/session";
import { can } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import z from "zod";

export type DeleteUserFormState = {
	success: boolean;
	error?: string;
};

const DeleteUserSchema = z.object({
	userId: z.string().uuid(),
});

export default async function deleteUserAction(
	_prevState: DeleteUserFormState,
	formData: FormData,
): Promise<DeleteUserFormState> {
	const session = await getCurrentSession();
	if (!session || !can(session.user, "user:delete")) {
		return { success: false, error: "Du har ikke rettigheder til at slette brugere" };
	}

	const payload = DeleteUserSchema.safeParse({
		userId: formData.get("userId"),
	});

	if (!payload.success) {
		return { success: false, error: "Ugyldige data" };
	}

	// Revoke all sessions for this user (DB and Redis)
	const sessions = await prisma.session.findMany({
		where: { userId: payload.data.userId },
		select: { sessionId: true },
	});

	await Promise.all([
		...sessions.map(({ sessionId }) => redis.del(sessionId)),
		prisma.session.deleteMany({ where: { userId: payload.data.userId } }),
	]);

	try {
		await prisma.user.delete({
			where: { id: payload.data.userId },
		});
	} catch {
		return { success: false, error: "Kunne ikke slette brugeren" };
	}

	revalidatePath("/settings/users");
	return { success: true };
}
