"use server";

import { logAuditEvent } from "@/data/audit-log-dto";
import { getCurrentSession } from "@/data/session";
import { can } from "@/lib/utils";
import { deleteSession } from "@/data/session";
import { getIP } from "@/lib/ip";
import { revalidatePath } from "next/cache";
import z from "zod";

export type RevokeSessionFormState = {
	success: boolean;
	error?: string;
};

const RevokeSessionSchema = z.object({
	sessionId: z.string().min(1),
});

export default async function revokeSessionAction(
	_prevState: RevokeSessionFormState,
	formData: FormData,
): Promise<RevokeSessionFormState> {
	const currentSession = await getCurrentSession();
	if (!currentSession) {
		return { success: false, error: "Du er ikke logget ind" };
	}

	if (!can(currentSession.user, "session:delete")) {
		return { success: false, error: "Du har ikke tilladelse til at slette sessioner" };
	}

	const parsed = RevokeSessionSchema.safeParse({
		sessionId: formData.get("sessionId"),
	});

	if (!parsed.success) {
		return { success: false, error: "Ugyldige data" };
	}

	try {
		await deleteSession(parsed.data.sessionId);
		await logAuditEvent({
			userId: currentSession.user.id,
			sessionId: currentSession.sessionId,
			ipAddress: await getIP(),
			action: "delete",
			targetResourceId: parsed.data.sessionId,
			success: true,
		});
		revalidatePath("/settings/sessions");
		return { success: true };
	} catch (error) {
		await logAuditEvent({
			userId: currentSession.user.id,
			sessionId: currentSession.sessionId,
			ipAddress: await getIP(),
			action: "delete",
			targetResourceId: parsed.data.sessionId,
			success: false,
		});
		console.error(error);
		return { success: false, error: "Kunne ikke tilbagekalde sessionen" };
	}
}
