import { getDictionary, hasLocale } from "@/data/dictionaries";
import { notFound } from "next/navigation";

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;

  if (!hasLocale(locale)) notFound();

  const dict = await getDictionary(locale);

  return <h1>{dict.title}</h1>;
}
