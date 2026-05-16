"use client";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActiveSessionListItem } from "@/data/session";
import { useActionState } from "react";
import revokeSessionAction, { type RevokeSessionFormState } from "@/components/forms/revoke-session-form/revoke-session-action";
import { FiTrash2 } from "react-icons/fi";

type SessionsTableProps = {
	sessions: ActiveSessionListItem[];
};

export default function SessionsTable({ sessions }: Readonly<SessionsTableProps>) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Oprettet</TableHead>
					<TableHead>Bruger</TableHead>
					<TableHead>Tilladelser</TableHead>
					<TableHead className="w-fit"></TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{sessions.map((session) => (
					<SessionRow key={session.id} session={session} />
				))}
			</TableBody>
		</Table>
	);
}

function SessionRow({ session }: Readonly<{ session: ActiveSessionListItem }>) {
	const [state, formAction, pending] = useActionState<RevokeSessionFormState, FormData>(
		revokeSessionAction,
		{ success: false },
	);

	return (
		<TableRow>
			<TableCell>
				{Intl.DateTimeFormat("da-DK", {
					dateStyle: "long",
					timeStyle: "short",
				}).format(new Date(session.createdAt))}
			</TableCell>
			<TableCell>{session.userName}</TableCell>
			<TableCell>
				<details>
					<summary className="cursor-pointer select-none">
						Vis tilladelser ({session.permissions.length})
					</summary>
					<ul className="mt-2 text-sm text-muted-foreground">
						{session.permissions.map(perm => <li key={perm}>{perm}</li>)}
					</ul>
				</details>
			</TableCell>
			<TableCell className="w-fit">
				<form action={formAction} className="inline">
					<input type="hidden" name="sessionId" value={session.sessionId} />
					<Button
						type="submit"
						variant="ghost"
						size="sm"
						disabled={pending}
						title="Tilbagekald session"
					>
						<FiTrash2 className="h-4 w-4" />
					</Button>
				</form>
				{state.error && (
					<div className="text-xs text-red-600 mt-1">{state.error}</div>
				)}
			</TableCell>
		</TableRow>
	);
}
