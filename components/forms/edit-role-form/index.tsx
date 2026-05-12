"use client";

import { Button } from "@/components/ui/button";
import { DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Role } from "@/generated/prisma/client";

export default function EditRoleForm({ role }: { role: Readonly<Role> }) {

	return (
		<form>
			<DialogHeader>
				<DialogTitle>Rediger rolle</DialogTitle>
				<DialogDescription></DialogDescription>
				<FieldGroup>
					<FieldLabel className="flex flex-col items-start">
						<span>Rollenavn</span>
						<Input type="text" name="role" defaultValue={role.name} />
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