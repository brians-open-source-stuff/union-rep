"use client";

import { Button } from "@/components/ui/button";
import { DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useActionState } from "react";
import deleteUserAction, { type DeleteUserFormState } from "./delete-user-action";

const initialState: DeleteUserFormState = {
	success: false,
};

type DeleteUserFormProps = {
	userId: string;
	userName: string;
};

export default function DeleteUserForm({ userId, userName }: Readonly<DeleteUserFormProps>) {
	const [state, formAction, pending] = useActionState(deleteUserAction, initialState);

	return (
		<form action={formAction}>
			<input type="hidden" name="userId" value={userId} />
			<DialogHeader>
				<DialogTitle>Slet bruger</DialogTitle>
				<DialogDescription>Er du sikker på, at du vil slette brugeren <b>{userName}</b>?</DialogDescription>
				{state.error && <p className="text-sm text-red-600">{state.error}</p>}
				{state.success && <p className="text-sm text-green-700">Bruger slettet</p>}
				<DialogFooter>
					<DialogClose render={<Button type="button" variant="outline">Annuller</Button>} />
					<Button type="submit" disabled={pending} variant="destructive">{pending ? "Sletter..." : "Slet bruger"}</Button>
				</DialogFooter>
			</DialogHeader>
		</form>
	);
}
