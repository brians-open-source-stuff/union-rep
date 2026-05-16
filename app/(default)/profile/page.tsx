import ProfileForm from "@/components/forms/profile-form";
import { getCurrentSession } from "@/data/session";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
	const session = await getCurrentSession();
	if (!session) {
		redirect("/login");
	}

	return (
		<div className="mx-auto w-full max-w-2xl space-y-4">
			<div>
				<h2>Profil</h2>
				<p className="text-sm text-muted-foreground">Rediger dit navn og din adgangskode.</p>
			</div>
			<ProfileForm key={session.user.name} name={session.user.name} />
		</div>
	);
}
