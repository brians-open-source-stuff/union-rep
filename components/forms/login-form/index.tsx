"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useActionState, useEffect } from "react";
import loginAction from "./login-action";
import { LoginFormState } from "@/types";
import { useRouter } from "next/navigation";

const initialLoginFormState: LoginFormState = {
	success: false,
	fields: {
		email: "",
	},
	errors: {},
};

export default function LoginForm() {
	const router = useRouter();
	const [formState, formAction] = useActionState<LoginFormState, FormData>(loginAction, initialLoginFormState);

	useEffect(function () {
		if (!formState.success) return;
		if (!formState.userId) return;
		const userId = formState.userId;

		async function enrollAndRedirect() {
			const {
				generateAndStoreDeviceKey,
				getDeviceKeysForUser,
				setActiveDeviceUser,
			} = await import("@/lib/device-crypto");

			setActiveDeviceUser(userId);

			// Ask the server if this user already has active device keys
			const res = await fetch(`/api/keys/public?users=${userId}`);
			const { keys } = await res.json();
			const serverKeyIds = new Set<string>((keys ?? []).map((k: { keyId: string }) => k.keyId));

			const localKeys = await getDeviceKeysForUser(userId);
			const hasMatchingLocalKey = localKeys.some((k) => serverKeyIds.has(k.keyId));

			if (hasMatchingLocalKey) {
				router.push("/");
				return;
			}

			const latestLocalKey = localKeys[localKeys.length - 1];
			if (latestLocalKey) {
				await fetch("/api/keys/public", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						keyId: latestLocalKey.keyId,
						publicKeyJwk: latestLocalKey.publicKeyJwk,
						algorithm: latestLocalKey.algorithm,
					}),
				});
				router.push("/");
				return;
			}

			// No matching key between browser and server for this user.
			const { keyId, publicKeyJwk, algorithm } = await generateAndStoreDeviceKey(userId);
			await fetch("/api/keys/public", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ keyId, publicKeyJwk, algorithm }),
			});

			router.push("/");
		}

		enrollAndRedirect().catch(console.error);
	}, [formState.success, formState.userId, router]);

	return (
		<div className="flex flex-col gap-6">
			<Card>
				<CardHeader>
					<CardTitle>Log ind på din konto</CardTitle>
					<CardDescription>
						Skriv din e-mail herunder for at logge ind på din konto
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form action={formAction}>
						<FieldGroup>
							<Field>
								<FieldLabel className="flex flex-col items-start">
									<span>E-mail</span>
									<Input
										key={formState.fields.email}
										tabIndex={1}
										name="email"
										type="email"
										defaultValue={formState.fields.email}
										placeholder="din@e-mail.dk"
										required
									/>
									{formState.errors?.email && <span>{formState.errors.email.errors}</span>}
								</FieldLabel>
							</Field>
							<Field>
								<FieldLabel className="flex flex-col items-start">
									<div className="flex justify-between w-full">
										<span>Adgangskode</span>
										<a
											href="#"
											className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
										>
											Glemt din adgangskode?
										</a>
									</div>
									<Input tabIndex={2} name="password" type="password" required />
								</FieldLabel>
							</Field>
							<Field>
								<Button tabIndex={3} type="submit">Log ind</Button>
							</Field>
						</FieldGroup>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}