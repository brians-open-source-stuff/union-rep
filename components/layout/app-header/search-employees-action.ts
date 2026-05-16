"use server";

import { searchEmployeesByName } from "@/data/employee-dto";

export default async function searchEmployeesAction(query: string) {
	return searchEmployeesByName(query);
}
