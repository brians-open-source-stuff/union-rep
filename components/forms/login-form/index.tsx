import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
	const { dict } = props;
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
					<form>
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="email">{dict.fields.email.label}</FieldLabel>
								<Input
									id="email"
									type="email"
									placeholder={dict.fields.email.placeholder}
									required
								/>
							</Field>
							<Field>
								<div className="flex items-center">
									<FieldLabel htmlFor="password">{dict.fields.password.label}</FieldLabel>
									<a
										href="#"
										className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
									>
										{dict.fields.password.forgotLinkText}
									</a>
								</div>
								<Input id="password" type="password" required />
							</Field>
							<Field>
								<Button type="submit">{dict.submit}</Button>
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