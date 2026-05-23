"use server";

import { revalidatePath } from "next/cache";
import { registerEmployeeContactNow } from "@/data/employee-dto";

export default async function registerContactAction(employeeId: string) {
	if (!employeeId) return;

	const result = await registerEmployeeContactNow(employeeId);
	if (!result.ok) return;

	revalidatePath(`/employees/${employeeId}`);
	revalidatePath("/");
}
