"use client";

import { Button } from "@/components/ui/button";
import { DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useActionState } from "react";
import createUserAction, { type CreateUserFormState } from "./create-user-action";

const initialState: CreateUserFormState = {
	success: false,
};

export default function CreateUserForm() {
	const [state, formAction, pending] = useActionState(createUserAction, initialState);

	return (
		<form action={formAction}>
			<DialogHeader>
				<DialogTitle>Opret bruger</DialogTitle>
				<DialogDescription>Indtast oplysninger for at oprette en ny bruger.</DialogDescription>
				<FieldGroup>
					<FieldLabel className="flex flex-col items-start">
						<span>Navn</span>
						<Input type="text" name="name" required />
					</FieldLabel>
					<FieldLabel className="flex flex-col items-start">
						<span>E-mail</span>
						<Input type="email" name="email" required />
					</FieldLabel>
					<FieldLabel className="flex flex-col items-start">
						<span>Adgangskode</span>
						<Input type="password" name="password" required minLength={8} />
					</FieldLabel>
					{state.error && <p className="text-sm text-red-600">{state.error}</p>}
					{state.success && <p className="text-sm text-green-700">Bruger oprettet</p>}
				</FieldGroup>
				<DialogFooter>
					<DialogClose render={<Button type="button" variant="outline">Annuller</Button>} />
					<Button type="submit" disabled={pending}>{pending ? "Opretter..." : "Opret bruger"}</Button>
				</DialogFooter>
			</DialogHeader>
		</form>
	);
}
