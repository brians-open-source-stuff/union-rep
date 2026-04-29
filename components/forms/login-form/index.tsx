"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { getDictionary } from "@/data/dictionaries";
import { useActionState, useEffect } from "react";
import loginAction from "./login-action";
import { LoginFormState } from "@/types";

type LoginDict = Awaited<ReturnType<typeof getDictionary>>["auth"]["login"];

interface LoginFormProps extends React.ComponentProps<"div"> {
	locale: string;
	dict: LoginDict;
}

const initialLoginFormState: LoginFormState = {
	success: false,
	fields: {
		email: "",
	},
	errors: {},
};

export default function LoginForm({ className, ...props }: LoginFormProps) {
	const { locale, dict } = props;
	const action: (
		state: LoginFormState,
		payload: FormData
	) => Promise<LoginFormState> = loginAction.bind(null, locale);
	const [formState, formAction, pending] = useActionState<LoginFormState, FormData>(action, initialLoginFormState);

	useEffect(function () {
		console.log(formState)
	}, [formState]);

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Card>
				<CardHeader>
					<CardTitle>{dict.title}</CardTitle>
					<CardDescription>
						{dict.description}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form action={formAction}>
						<FieldGroup>
							<Field>
								<FieldLabel className="flex flex-col items-start">
									<span>{dict.fields.email.label}</span>
									<Input
										tabIndex={1}
										name="email"
										type="email"
										defaultValue={formState.fields.email}
										placeholder={dict.fields.email.placeholder}
										required
									/>
									{formState.errors?.email && <span>{formState.errors.email.errors}</span>}
								</FieldLabel>
							</Field>
							<Field>
								<FieldLabel className="flex flex-col items-start">
									<div className="flex justify-between w-full">
										<span>{dict.fields.password.label}</span>
										<a
											href="#"
											className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
										>
											{dict.fields.password.forgotLinkText}
										</a>
									</div>
									<Input tabIndex={2} name="password" type="password" required />
								</FieldLabel>
							</Field>
							<Field>
								<Button tabIndex={3} type="submit">{dict.submit}</Button>
								<FieldDescription className="text-center">
									{dict.noAccountText} <a href="/register">{dict.registerText}</a>
								</FieldDescription>
							</Field>
						</FieldGroup>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}