"use client";

import { Button } from "@/components/ui/button";
import { DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useActionState, useState } from "react";
import updateEmployeeAction, { type UpdateEmployeeFormState } from "./update-employee-action";

type UserOption = {
	id: string;
	name: string;
	roles: string[];
};

type EmployeeForEditForm = {
	id: string;
	name: string;
	title: string | null;
	email: string | null;
	emailAlt: string | null;
	phone: string | null;
	phoneAlt: string | null;
	assignments: Array<{
		id: string;
		userId: string;
		isPrimary: boolean;
		user: {
			id: string;
			name: string;
		};
	}>;
};

const initialState: UpdateEmployeeFormState = {
	success: false,
};

export default function EditEmployeeForm({
	employee,
	users,
}: {
	employee: Readonly<EmployeeForEditForm>;
	users: ReadonlyArray<UserOption>;
}) {
	const [state, formAction, pending] = useActionState(updateEmployeeAction, initialState);
	const [name, setName] = useState(employee.name);
	const [title, setTitle] = useState(employee.title ?? "");
	const [email, setEmail] = useState(employee.email ?? "");
	const [emailAlt, setEmailAlt] = useState(employee.emailAlt ?? "");
	const [phone, setPhone] = useState(employee.phone ?? "");
	const [phoneAlt, setPhoneAlt] = useState(employee.phoneAlt ?? "");
	const currentPrimaryAssignment = employee.assignments.find((assignment) => assignment.isPrimary);
	const currentSecondaryAssignment = employee.assignments.find((assignment) => !assignment.isPrimary);
	const [primaryUserId, setPrimaryUserId] = useState(currentPrimaryAssignment?.userId ?? "");
	const [secondaryUserId, setSecondaryUserId] = useState(currentSecondaryAssignment?.userId ?? "");
	const sortedUsers = [...users].sort((a, b) => a.name.localeCompare(b.name, "da"));

	return (
		<form action={formAction}>
			<input type="hidden" name="employeeId" value={employee.id} />
			<DialogHeader>
				<DialogTitle>Rediger staminfo</DialogTitle>
				<DialogDescription>{employee.name}</DialogDescription>
				<FieldGroup>
					<FieldLabel className="flex flex-col items-start">
						<span>Medarbejders navn</span>
						<Input type="text" name="name" value={name} onChange={(event) => setName(event.target.value)} />
					</FieldLabel>
					<FieldLabel className="flex flex-col items-start">
						<span>Titel</span>
						<Input type="text" name="title" value={title} onChange={(event) => setTitle(event.target.value)} />
					</FieldLabel>
					<FieldLabel className="flex flex-col items-start">
						<span>Email</span>
						<Input type="email" name="email" value={email} onChange={(event) => setEmail(event.target.value)} />
					</FieldLabel>
					<FieldLabel className="flex flex-col items-start">
						<span>Alternativ email</span>
						<Input
							type="email"
							name="emailAlt"
							value={emailAlt}
							onChange={(event) => setEmailAlt(event.target.value)}
						/>
					</FieldLabel>
					<FieldLabel className="flex flex-col items-start">
						<span>Telefon</span>
						<Input type="tel" name="phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
					</FieldLabel>
					<FieldLabel className="flex flex-col items-start">
						<span>Alternativ telefon</span>
						<Input
							type="tel"
							name="phoneAlt"
							value={phoneAlt}
							onChange={(event) => setPhoneAlt(event.target.value)}
						/>
					</FieldLabel>
					<FieldLabel className="flex flex-col items-start">
						<span>Primær kontaktperson</span>
						<select
							name="primaryUserId"
							value={primaryUserId}
							onChange={(event) => setPrimaryUserId(event.target.value)}
							className="h-9 w-full rounded-md border px-2"
						>
							<option value="">Ingen</option>
							{sortedUsers.map((user) => (
								<option key={user.id} value={user.id}>{user.name} ({user.roles.join(", ") || "ingen rolle"})</option>
							))}
						</select>
					</FieldLabel>
					<FieldLabel className="flex flex-col items-start">
						<span>Sekundær kontaktperson</span>
						<select
							name="secondaryUserId"
							value={secondaryUserId}
							onChange={(event) => setSecondaryUserId(event.target.value)}
							className="h-9 w-full rounded-md border px-2"
						>
							<option value="">Ingen</option>
							{sortedUsers.map((user) => (
								<option key={user.id} value={user.id}>{user.name} ({user.roles.join(", ") || "ingen rolle"})</option>
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