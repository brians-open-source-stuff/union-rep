"use client";

import { Button } from "@/components/ui/button";
import { DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useActionState } from "react";
import roleAction from "./role-action";

export default function RoleForm() {
	const [, formAction] = useActionState(roleAction, {});
	return (
		<form action={formAction}>
			<DialogHeader>
				<DialogTitle>Add Role</DialogTitle>
				<DialogDescription></DialogDescription>
				<FieldGroup>
					<FieldLabel className="flex flex-col items-start">
						<span>Role Name</span>
						<Input type="text" name="role" />
					</FieldLabel>
				</FieldGroup>
				<DialogFooter>
					<DialogClose render={<Button type="button" variant="outline">Cancel</Button>} />
					<Button type="submit">Add</Button>
				</DialogFooter>
			</DialogHeader>
		</form>
	);
}