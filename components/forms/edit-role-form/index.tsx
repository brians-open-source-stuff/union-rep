"use client";

import { Button } from "@/components/ui/button";
import { DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useActionState } from "react";
import updateRoleAction, { type UpdateRoleFormState } from "./update-role-action";

type RoleForEditForm = {
	id: string;
	name: string;
	permissions: Array<{
		id: string;
		name: string;
	}>;
};

type PermissionOption = {
	id: string;
	name: string;
};

const initialState: UpdateRoleFormState = {
	success: false,
};

export default function EditRoleForm({
	role,
	permissionOptions,
}: {
	role: Readonly<RoleForEditForm>;
	permissionOptions: ReadonlyArray<PermissionOption>;
}) {
	const [state, formAction, pending] = useActionState(updateRoleAction, initialState);
	const assignedPermissionIds = new Set(role.permissions.map((permission) => permission.id));

	return (
		<form action={formAction}>
			<input type="hidden" name="roleId" value={role.id} />
			<DialogHeader>
				<DialogTitle>Rediger rolle</DialogTitle>
				<DialogDescription>Opdater navnet og hvilke tilladelser rollen har.</DialogDescription>
				<FieldGroup>
					<FieldLabel className="flex flex-col items-start">
						<span>Rollenavn</span>
						<Input type="text" name="name" defaultValue={role.name} required />
					</FieldLabel>
					<div className="space-y-2">
						<p className="text-sm font-medium">Tilladelser</p>
						<div className="grid gap-2 max-h-64 overflow-y-auto rounded-md border p-3">
							{permissionOptions.map((permission) => (
								<label key={permission.id} className="inline-flex items-center gap-2 text-sm">
									<input
										type="checkbox"
										name="permissionIds"
										value={permission.id}
										defaultChecked={assignedPermissionIds.has(permission.id)}
									/>
									<span>{permission.name}</span>
								</label>
							))}
						</div>
					</div>
					{state.error && <p className="text-sm text-red-600">{state.error}</p>}
					{state.success && <p className="text-sm text-green-700">Rolle opdateret</p>}
				</FieldGroup>
				<DialogFooter>
					<DialogClose render={<Button type="button" variant="outline">Annuller</Button>} />
					<Button type="submit" disabled={pending}>{pending ? "Gemmer..." : "Rediger"}</Button>
				</DialogFooter>
			</DialogHeader>
		</form>
	);
}