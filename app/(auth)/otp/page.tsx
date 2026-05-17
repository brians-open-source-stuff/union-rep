import OTPForm from "@/components/forms/otp-form";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const metadata = {
	title: "MFA"
}

export default async function OTPPage() {
	const cookieStore = await cookies();
	const pendingToken = cookieStore.get("ur_mfa_pending")?.value;

	if (!pendingToken) {
		redirect("/login");
	}

	return <OTPForm />;
}
