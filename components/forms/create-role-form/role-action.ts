"use server";

export default async function roleAction(prevState, formData: FormData) {
	const { role } = Object.fromEntries(formData);
	console.log("role action", role);
	return {};
}