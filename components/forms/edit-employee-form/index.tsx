"use client";

import { Button } from "@/components/ui/button";
import { DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Employee } from "@/generated/prisma/client";

export default function EditEmployeeForm({ employee }: { employee: Readonly<Employee> }) {
	return (
		<form>
			<DialogHeader>
				<DialogTitle>Rediger staminfo</DialogTitle>
				<DialogDescription></DialogDescription>
				<FieldGroup>
					<FieldLabel className="flex flex-col items-start">
						<span>Medarbejders navn</span>
						<Input type="text" name="name" defaultValue={employee.name} />
					</FieldLabel>
					<FieldLabel className="flex flex-col items-start">
						<span>Titel</span>
						<Input type="text" name="title" defaultValue={employee.title} />
					</FieldLabel>
					<FieldLabel className="flex flex-col items-start">
						<span>Nærmeste leder</span>
						<select name="manager">
							<option value={employee.managers[0].id}>{employee.managers[0].name}</option>
						</select>
					</FieldLabel>
				</FieldGroup>
				<DialogFooter>
					<DialogClose render={<Button type="button" variant="outline">Annuller</Button>} />
					<Button type="submit">Rediger</Button>
				</DialogFooter>
			</DialogHeader>
		</form>
	);
}