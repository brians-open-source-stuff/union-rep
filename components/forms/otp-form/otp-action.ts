"use server";

import { logAuditEvent } from "@/data/audit-log-dto";
import { verifyPendingMFALogin } from "@/data/mfa-dto";
import { headers, cookies } from "next/headers";

export type OTPFormState = {
	success: boolean;
	userId?: string;
	error?: string;
};

export default async function otpAction(_prevState: OTPFormState, formData: FormData): Promise<OTPFormState> {
	const token = String(formData.get("token") ?? "").trim();

	if (!token || token.length !== 6) {
		return { success: false, error: "Indtast en 6-cifret kode" };
	}

	const cookieStore = await cookies();
	const pendingToken = cookieStore.get("ur_mfa_pending")?.value;

	if (!pendingToken) {
		return { success: false, error: "Sessionen er udløbet. Log ind igen." };
	}

	const h = await headers();
	const forwardedFor = h.get("x-forwarded-for");
	const realIp = h.get("x-real-ip");
	const ipAddress = forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";

	const result = await verifyPendingMFALogin(pendingToken, token, ipAddress);

	if (!result.ok || !result.sessionId || !result.userId) {
		/* await logAuditEvent({
			action: "login",
			ipAddress,
			success: false,
		}); */

		return { success: false, error: result.reason ?? "Forkert kode. Prøv igen." };
	}

	cookieStore.set("ur_session", result.sessionId, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		maxAge: 60 * 60 * 24,
		path: "/",
	});

	cookieStore.delete("ur_mfa_pending");

	await logAuditEvent({
		userId: result.userId,
		action: "login",
		targetResourceId: result.userId,
		sessionId: result.sessionId,
		ipAddress,
		success: true,
	});

	return { success: true, userId: result.userId };
}
