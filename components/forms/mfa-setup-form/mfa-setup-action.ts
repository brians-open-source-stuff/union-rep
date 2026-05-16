"use server";

import { completeMFASetup } from "@/data/mfa-dto";
import { revalidatePath } from "next/cache";

export type MFASetupFormState = {
	success: boolean;
	error?: string;
};

export default async function mfaSetupAction(
	_prevState: MFASetupFormState,
	formData: FormData,
): Promise<MFASetupFormState> {
	const token = String(formData.get("token") ?? "").trim();

	if (!token || token.length !== 6) {
		return { success: false, error: "Indtast en 6-cifret kode" };
	}

	const result = await completeMFASetup(token);

	if (!result.ok) {
		return { success: false, error: result.reason ?? "Kunne ikke aktivere MFA" };
	}

	revalidatePath("/profile");
	return { success: true };
}
