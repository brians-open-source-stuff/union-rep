import ProfileForm from "@/components/forms/profile-form";
import { getCurrentUser } from "@/data/user-dto";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ProfilePage() {
	const user = await getCurrentUser();
	if (!user) {
		redirect("/login");
	}

	return (
		<div className="mx-auto w-full max-w-2xl space-y-4">
			<div>
				<h2>Profil</h2>
				<p className="text-sm text-muted-foreground">Rediger dit navn og din adgangskode.</p>
			</div>
			<ProfileForm key={user.name} name={user.name} needsPasswordChange={user.needsPasswordChange} />
			<Card>
				<CardHeader>
					<CardTitle>To-faktor godkendelse</CardTitle>
					<CardDescription>
						{user.mfaSetupComplete
							? "To-faktor godkendelse er aktiveret for din konto."
							: "Øg sikkerheden på din konto ved at aktivere to-faktor godkendelse."}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{user.mfaSetupComplete ? (
						<p className="text-sm text-green-700 font-medium">MFA er aktiveret</p>
					) : (
						<Link href="/profile/mfa-setup">Opsæt MFA</Link>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
