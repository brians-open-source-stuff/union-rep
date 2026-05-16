"use server";

import { logAuditEvent } from "@/data/audit-log-dto";
import { createPendingMFASession } from "@/data/mfa-dto";
import { createSession } from "@/data/session";
import { getUser } from "@/data/user-dto";
import { LoginFormState } from "@/types";
import { cookies, headers } from "next/headers";
import z from "zod";

export default async function loginAction(prevState: LoginFormState, formData: FormData): Promise<LoginFormState> {
	const { email, password } = Object.fromEntries(formData);

	const LoginSchema = z.object({
		email: z.email("Ugyldig e-mail"),
		password: z.string().min(8, "Adgangskoden skal være mindst 8 tegn")
	});

	const validated = LoginSchema.safeParse({
		email, password
	});

	if (!validated.success) return ({
		success: false,
		fields: {
			email: String(email ?? ""),
		},
		errors: {
			...z.treeifyError(validated.error).properties,
		}
	});

	try {
		const h = await headers();
		const forwardedFor = h.get("x-forwarded-for");
		const realIp = h.get("x-real-ip")
		const ip_address = forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";

		const user = await getUser(validated.data.email);

		if (!user || !await user.validate(password as string)) {
			await logAuditEvent({
				action: "login",
				targetResourceId: validated.data.email,
				ipAddress: ip_address,
				success: false,
			});

			return ({
				success: false,
				fields: {
					email: String(email ?? "")
				},
				errors: {
					form: { errors: ["Forkert e-mail eller adgangskode"] }
				}
			});
		}

		if (user.mfaSetupComplete) {
			const { pendingToken } = await createPendingMFASession(user.id);

			const cookieStore = await cookies();
			cookieStore.set("ur_mfa_pending", pendingToken, {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				sameSite: "lax",
				maxAge: 60 * 5,
				path: "/",
			});

			await logAuditEvent({
				userId: user.id,
				action: "login",
				targetResourceId: user.id,
				ipAddress: ip_address,
				success: false,
			});

			return {
				success: true,
				requiresMFA: true,
				fields: { email: validated.data.email },
				errors: {},
			};
		}

		const sessionUser = {
			id: user.id,
			name: user.name,
			needsPasswordChange: user.needsPasswordChange,
			mfaSetupComplete: user.mfaSetupComplete,
			roles: user.roles,
			permissions: user.permissions,
		};

		const sessionId = await createSession(sessionUser, ip_address);

		await logAuditEvent({
			userId: user.id,
			action: "login",
			targetResourceId: user.id,
			sessionId,
			ipAddress: ip_address,
			success: true,
		});

		const cookieStore = await cookies();
		cookieStore.set("ur_session", sessionId, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: 60 * 60 * 24,
			path: "/",
		});

		return {
			success: true,
			userId: user.id,
			fields: { email: validated.data.email },
			errors: {},
		}
	} catch {
		return {
			success: false,
			fields: {
				email: String(email ?? ""),
			},
			errors: {
				form: { errors: ["Noget gik galt. Prøv igen."] },
			},
		};
	}
}