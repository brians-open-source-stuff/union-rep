import LoginForm from "@/components/forms/login-form";
import { getDictionary, hasLocale } from "@/data/dictionaries";
import { notFound } from "next/navigation";

export default async function LoginPage({ params }: PageProps<"/[locale]">) {
	const { locale } = await params;

	if (!hasLocale(locale)) notFound();

	const dict = await getDictionary(locale);

	return (
		<LoginForm dict={dict.auth.login} />
	);
}