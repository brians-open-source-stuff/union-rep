"use client";

import { Button } from "@/components/ui/button";
import { DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useActionState } from "react";
import createRoleAction, { type CreateRoleFormState } from "./role-action";

type PermissionOption = {
	id: string;
	name: string;
};

const initialState: CreateRoleFormState = {
	success: false,
};

export default function RoleForm({ permissionOptions }: { permissionOptions: ReadonlyArray<PermissionOption> }) {
	const [state, formAction, pending] = useActionState(createRoleAction, initialState);

	return (
		<form action={formAction}>
			<DialogHeader>
				<DialogTitle>Tilføj rolle</DialogTitle>
				<DialogDescription>Vælg de tilladelser rollen skal have.</DialogDescription>
				<FieldGroup>
					<FieldLabel className="flex flex-col items-start">
						<span>Rollenavn</span>
						<Input type="text" name="name" required />
					</FieldLabel>
					<div className="space-y-2">
						<p className="text-sm font-medium">Tilladelser</p>
						<div className="grid gap-2 max-h-64 overflow-y-auto rounded-md border p-3">
							{permissionOptions.map((permission) => (
								<label key={permission.id} className="inline-flex items-center gap-2 text-sm">
									<input type="checkbox" name="permissionIds" value={permission.id} />
									<span>{permission.name}</span>
								</label>
							))}
						</div>
					</div>
					{state.error && <p className="text-sm text-red-600">{state.error}</p>}
					{state.success && <p className="text-sm text-green-700">Rolle oprettet</p>}
				</FieldGroup>
				<DialogFooter>
					<DialogClose render={<Button type="button" variant="outline">Annuller</Button>} />
					<Button type="submit" disabled={pending}>{pending ? "Gemmer..." : "Opret"}</Button>
				</DialogFooter>
			</DialogHeader>
		</form>
	);
}