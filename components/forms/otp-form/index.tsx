"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import otpAction, { type OTPFormState } from "./otp-action";

const initialState: OTPFormState = {
	success: false,
};

export default function OTPForm() {
	const router = useRouter();
	const formRef = useRef<HTMLFormElement>(null);
	const [state, formAction, pending] = useActionState(otpAction, initialState);

	useEffect(() => {
		if (!state.success) return;
		if (!state.userId) return;
		const userId = state.userId;

		async function enrollAndRedirect() {
			const {
				generateAndStoreDeviceKey,
				getDeviceKeysForUser,
				setActiveDeviceUser,
			} = await import("@/lib/device-crypto");

			setActiveDeviceUser(userId);

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

			const { keyId, publicKeyJwk, algorithm } = await generateAndStoreDeviceKey(userId);
			await fetch("/api/keys/public", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ keyId, publicKeyJwk, algorithm }),
			});

			router.push("/");
		}

		enrollAndRedirect().catch(console.error);
	}, [state.success, state.userId, router]);

	function handleOTPComplete(value: string) {
		if (value.length === 6 && formRef.current) {
			formRef.current.requestSubmit();
		}
	}

	return (
		<div className="flex flex-col gap-6">
			<Card>
				<CardHeader>
					<CardTitle>To-faktor godkendelse</CardTitle>
					<CardDescription>
						Indtast den 6-cifrede kode fra din autentifikatorapp.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form ref={formRef} action={formAction} className="space-y-6">
						<div className="flex flex-col items-center gap-4">
							<InputOTP
								maxLength={6}
								pattern={REGEXP_ONLY_DIGITS}
								name="token"
								onComplete={handleOTPComplete}
								disabled={pending}
							>
								<InputOTPGroup>
									<InputOTPSlot index={0} />
									<InputOTPSlot index={1} />
									<InputOTPSlot index={2} />
									<InputOTPSlot index={3} />
									<InputOTPSlot index={4} />
									<InputOTPSlot index={5} />
								</InputOTPGroup>
							</InputOTP>
							{state.error && (
								<p className="text-sm text-destructive">{state.error}</p>
							)}
						</div>
						<Button type="submit" className="w-full" disabled={pending}>
							{pending ? "Bekræfter..." : "Bekræft"}
						</Button>
					</form>
					<p className="mt-4 text-center text-sm text-muted-foreground">
						<a href="/login" className="underline underline-offset-4 hover:text-foreground">
							Tilbage til login
						</a>
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
