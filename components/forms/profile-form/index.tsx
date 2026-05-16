"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import profileAction, { type ProfileFormState } from "./profile-action";

const initialState: ProfileFormState = {
	success: false,
};

type ProfileFormProps = {
	name: string;
	needsPasswordChange?: boolean;
};

export default function ProfileForm({ name, needsPasswordChange }: Readonly<ProfileFormProps>) {
	const router = useRouter();
	const [state, formAction, pending] = useActionState(profileAction, initialState);

	useEffect(() => {
		if (!state.success) return;

		const timeout = setTimeout(() => {
			router.refresh();
		}, 800);

		return () => clearTimeout(timeout);
	}, [state.success, router]);

	return (
		<>
			{needsPasswordChange && (
				<div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
					<p className="text-sm font-semibold text-amber-900">Skift dit password</p>
					<p className="text-sm text-amber-800">
						Dit password skal skiftes. Skift det venligst i formularen nedenfor.
					</p>
				</div>
			)}
			<Card>
				<CardHeader>
					<CardTitle>Min profil</CardTitle>
					<CardDescription>Opdater dit navn og skift din adgangskode.</CardDescription>
				</CardHeader>
				<CardContent>
					<form action={formAction} className="space-y-6">
						<FieldGroup>
							<FieldLabel className="flex flex-col items-start">
								<span>Navn</span>
								<Input type="text" name="name" defaultValue={name} required />
							</FieldLabel>
							<div className="space-y-3 rounded-lg border p-4">
								<div className="space-y-1">
									<p className="text-sm font-medium">Skift adgangskode</p>
									<p className="text-sm text-muted-foreground">
										{needsPasswordChange
											? "Du skal skiftet dit password for at fortsætte."
											: "Udfyld kun dette afsnit, hvis du vil ændre din adgangskode."}
									</p>
								</div>
								<div className="grid gap-4">
									<FieldLabel className="flex flex-col items-start">
										<span>Nuværende adgangskode</span>
										<Input type="password" name="currentPassword" placeholder="Nuværende adgangskode" />
									</FieldLabel>
									<FieldLabel className="flex flex-col items-start">
										<span>Nyt password</span>
										<Input type="password" name="newPassword" placeholder="Mindst 8 tegn" />
									</FieldLabel>
									<FieldLabel className="flex flex-col items-start">
										<span>Bekræft nyt password</span>
										<Input type="password" name="confirmPassword" placeholder="Gentag dit nye password" />
									</FieldLabel>
								</div>
							</div>
							{state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
							{state.success ? <p className="text-sm text-green-700">Profil opdateret</p> : null}
						</FieldGroup>
						<div className="flex justify-end">
							<Button type="submit" disabled={pending}>
								{pending ? "Gemmer..." : "Gem ændringer"}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</>
	);
}
