import MFASetupForm from "@/components/forms/mfa-setup-form";
import { getMFASetupData } from "@/data/mfa-dto";
import { redirect } from "next/navigation";

export default async function MFASetupPage() {
	const data = await getMFASetupData();

	if (!data) {
		redirect("/login");
	}

	if (data.mfaSetupComplete) {
		redirect("/profile");
	}

	return (
		<div className="mx-auto w-full max-w-2xl space-y-4">
			<div>
				<h2>Opsæt to-faktor godkendelse</h2>
				<p className="text-sm text-muted-foreground">
					Beskyt din konto med en autentifikatorapp.
				</p>
			</div>
			<MFASetupForm otpsecret={data.otpsecret} qrCode={data.qrCode} />
		</div>
	);
}
