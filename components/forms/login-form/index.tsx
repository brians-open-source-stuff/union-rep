"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useActionState, useEffect } from "react";
import loginAction from "./login-action";
import { LoginFormState } from "@/types";

const initialLoginFormState: LoginFormState = {
	success: false,
	fields: {
		email: "",
	},
	errors: {},
};

export default function LoginForm() {

	const [formState, formAction, pending] = useActionState<LoginFormState, FormData>(loginAction, initialLoginFormState);

	useEffect(function () {
		console.log(formState)
	}, [formState]);

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