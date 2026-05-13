"use client";

import { Button } from "@/components/ui/button";
import { DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useActionState } from "react";
import updateEmployeeAction, { type UpdateEmployeeFormState } from "./update-employee-action";

type ManagerOption = {
	id: string;
	name: string;
	title: string;
	chiefId: string | null;
};

type EmployeeForEditForm = {
	id: string;
	name: string;
	title: string | null;
	email: string | null;
	emailAlt: string | null;
	phone: string | null;
	phoneAlt: string | null;
	managers: Array<{
		id: string;
		name: string;
		chiefId: string | null;
	}>;
};

const initialState: UpdateEmployeeFormState = {
	success: false,
};

export default function EditEmployeeForm({
	employee,
	managers,
}: {
	employee: Readonly<EmployeeForEditForm>;
	managers: ReadonlyArray<ManagerOption>;
}) {
	const [state, formAction, pending] = useActionState(updateEmployeeAction, initialState);
	const currentManager = employee.managers.find((manager) => manager.chiefId !== null);
	const currentChiefManager = employee.managers.find((manager) => manager.chiefId === null);
	const chiefManagers = managers.filter((manager) => manager.chiefId === null);
	const directManagers = managers.filter((manager) => manager.chiefId !== null);

	return (
		<form action={formAction} key={`employee-${employee.id}-${currentManager?.id ?? 'none'}-${currentChiefManager?.id ?? 'none'}`}>
			<input type="hidden" name="employeeId" value={employee.id} />
			<DialogHeader>
				<DialogTitle>Rediger staminfo</DialogTitle>
				<DialogDescription>{employee.name}</DialogDescription>
				<FieldGroup>
					<FieldLabel className="flex flex-col items-start">
						<span>Medarbejders navn</span>
						<Input type="text" name="name" defaultValue={employee.name} />
					</FieldLabel>
					<FieldLabel className="flex flex-col items-start">
						<span>Titel</span>
						<Input type="text" name="title" defaultValue={employee.title ?? ""} />
					</FieldLabel>
					<FieldLabel className="flex flex-col items-start">
						<span>Email</span>
						<Input type="email" name="email" defaultValue={employee.email ?? ""} />
					</FieldLabel>
					<FieldLabel className="flex flex-col items-start">
						<span>Alternativ email</span>
						<Input type="email" name="emailAlt" defaultValue={employee.emailAlt ?? ""} />
					</FieldLabel>
					<FieldLabel className="flex flex-col items-start">
						<span>Telefon</span>
						<Input type="tel" name="phone" defaultValue={employee.phone ?? ""} />
					</FieldLabel>
					<FieldLabel className="flex flex-col items-start">
						<span>Alternativ telefon</span>
						<Input type="tel" name="phoneAlt" defaultValue={employee.phoneAlt ?? ""} />
					</FieldLabel>
					<FieldLabel className="flex flex-col items-start">
						<span>Manager</span>
						<select name="managerId" defaultValue={currentManager?.id ?? ""} className="h-9 w-full rounded-md border px-2">
							<option value="">Ingen</option>
							{directManagers.map((manager) => (
								<option key={manager.id} value={manager.id}>{manager.name} ({manager.title})</option>
							))}
						</select>
					</FieldLabel>
					<FieldLabel className="flex flex-col items-start">
						<span>Chefleder</span>
						<select name="chiefManagerId" defaultValue={currentChiefManager?.id ?? ""} className="h-9 w-full rounded-md border px-2">
							<option value="">Ingen</option>
							{chiefManagers.map((manager) => (
								<option key={manager.id} value={manager.id}>{manager.name} ({manager.title})</option>
							))}
						</select>
					</FieldLabel>
					{state.error && <p className="text-sm text-red-600">{state.error}</p>}
					{state.success && <p className="text-sm text-green-700">Medarbejder opdateret</p>}
				</FieldGroup>
				<DialogFooter>
					<DialogClose render={<Button type="button" variant="outline">Annuller</Button>} />
					<Button type="submit" disabled={pending}>{pending ? "Gemmer..." : "Rediger"}</Button>
				</DialogFooter>
			</DialogHeader>
		</form>
	);
}