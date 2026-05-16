"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import mfaSetupAction, { type MFASetupFormState } from "./mfa-setup-action";
import Image from "next/image";

const initialState: MFASetupFormState = {
	success: false,
};

type MFASetupFormProps = {
	otpsecret: string;
	qrCode: string;
};

export default function MFASetupForm({ otpsecret, qrCode }: Readonly<MFASetupFormProps>) {
	const router = useRouter();
	const formRef = useRef<HTMLFormElement>(null);
	const [state, formAction, pending] = useActionState(mfaSetupAction, initialState);

	useEffect(() => {
		if (!state.success) return;
		router.push("/profile");
	}, [state.success, router]);

	function handleOTPComplete(value: string) {
		if (value.length === 6 && formRef.current) {
			formRef.current.requestSubmit();
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Opsæt to-faktor godkendelse</CardTitle>
				<CardDescription>
					Scan QR-koden med din autentifikatorapp (f.eks. Google Authenticator eller Authy),
					og bekræft derefter med en kode fra appen.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				<div className="flex flex-col items-center gap-4">
					<Image
						src={qrCode}
						alt="QR-kode til MFA-opsætning"
						width={200}
						height={200}
						className="rounded-lg border p-2"
					/>
					<div className="w-full space-y-1">
						<p className="text-sm font-medium">Manuel opsætningsnøgle</p>
						<p className="break-all rounded-md bg-muted px-3 py-2 font-mono text-sm select-all">
							{otpsecret}
						</p>
						<p className="text-xs text-muted-foreground">
							Kan du ikke scanne QR-koden? Indtast nøglen manuelt i din app.
						</p>
					</div>
				</div>
				<div className="space-y-3">
					<p className="text-sm font-medium">Bekræft opsætningen</p>
					<form ref={formRef} action={formAction} className="space-y-4">
						<div className="flex flex-col items-center gap-3">
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
							{state.success && (
								<p className="text-sm text-green-700">MFA er nu aktiveret</p>
							)}
						</div>
						<Button type="submit" className="w-full" disabled={pending}>
							{pending ? "Bekræfter..." : "Aktiver MFA"}
						</Button>
					</form>
				</div>
			</CardContent>
		</Card>
	);
}
