import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default function RegisterForm({ className, ...props }: React.ComponentProps<typeof Card>) {
	const { dict } = props;
	return (
		<Card {...props}>
			<CardHeader>
				<CardTitle>{dict.title}</CardTitle>
				<CardDescription>
					{dict.description}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form>
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="name">{dict.fields.name.label}</FieldLabel>
							<Input id="name" type="text" placeholder={dict.fields.name.placeholder} required />
						</Field>
						<Field>
							<FieldLabel htmlFor="email">{dict.fields.email.label}</FieldLabel>
							<Input
								id="email"
								type="email"
								placeholder={dict.fields.email.placeholder}
								required
							/>
							<FieldDescription>
								{dict.fields.email.usageDescriptionText}
							</FieldDescription>
						</Field>
						<Field>
							<FieldLabel htmlFor="password">{dict.fields.password.label}</FieldLabel>
							<Input id="password" type="password" required />
							<FieldDescription>
								{dict.fields.password.rules}
							</FieldDescription>
						</Field>
						<Field>
							<FieldLabel htmlFor="confirm-password">
								{dict.fields.confirmPassword.label}
							</FieldLabel>
							<Input id="confirm-password" type="password" required />
							<FieldDescription>{dict.fields.confirmPassword.rules}</FieldDescription>
						</Field>
						<FieldGroup>
							<Field>
								<Button type="submit">{dict.submit}</Button>
								<FieldDescription className="px-6 text-center">
									{dict.hasAccountText} <a href="/login">{dict.loginText}</a>
								</FieldDescription>
							</Field>
						</FieldGroup>
					</FieldGroup>
				</form>
			</CardContent>
		</Card>
	);
}