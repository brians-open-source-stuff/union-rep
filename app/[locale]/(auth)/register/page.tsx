import RegisterForm from "@/components/forms/register-form";
import { getDictionary, hasLocale } from "@/data/dictionaries";
import { notFound } from "next/navigation";

export default async function RegisterPage({ params }: PageProps<"/[locale]">) {
	const { locale } = await params;

	if (!hasLocale(locale)) notFound();

	const dict = await getDictionary(locale);
	return (
		<RegisterForm dict={dict.auth.register} />
	);
}