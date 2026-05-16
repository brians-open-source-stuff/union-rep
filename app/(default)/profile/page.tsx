import ProfileForm from "@/components/forms/profile-form";
import { getCurrentUser } from "@/data/user-dto";
import { redirect } from "next/navigation";

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
		</div>
	);
}
