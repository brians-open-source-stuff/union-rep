"use server";

import { getDictionary, hasLocale } from "@/data/dictionaries";
import { createSession } from "@/data/session";
import { getUser } from "@/data/user-dto";
import { LoginFormState } from "@/types";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import z from "zod";

export default async function loginAction(locale: string, prevState: LoginFormState, formData: FormData): Promise<LoginFormState> {
	const { email, password } = Object.fromEntries(formData);

	if (!hasLocale(locale)) {
		return {
			success: false,
			fields: { email: "" },
			errors: { form: { errors: ["Invalid locale"] } },
		};
	}

	const dict = await getDictionary(locale);

	const LoginSchema = z.object({
		email: z.email(dict.auth.login.fields.email.errors.invalidEmail),
		password: z.string().min(8, dict.auth.login.fields.password.errors.tooShort)
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

	// TODO: Implement MFA

	try {
		const user = await getUser(validated.data.email);

		if (!user || !user.validate(password as string)) return ({
			success: false,
			fields: {
				email: String(email ?? "")
			},
			errors: {
				form: { errors: [dict.auth.login.errors.badCredentials] }
			}
		});

		const h = await headers();
		const forwardedFor = h.get("x-forwarded-for");
		const realIp = h.get("x-real-ip")

		const ip_address = forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";

		const sessionId = await createSession(user, ip_address);

		const cookieStore = await cookies();
		cookieStore.set("ur_session", sessionId);
	} catch (error) {
		return {
			success: false,
			fields: {
				email: String(email ?? ""),
			},
			errors: {
				form: { errors: [dict.auth.login.errors.other] },
			},
		};
	}

	return redirect("/" + locale);
}