"use client";

import { Button } from "@/components/ui/button";
import { DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useActionState } from "react";
import deleteRoleAction, { type DeleteRoleFormState } from "./delete-role-action";

const initialState: DeleteRoleFormState = {
  success: false,
};

export default function DeleteRoleForm({ roleId, roleName }: { roleId: string; roleName: string }) {
  const [state, formAction, pending] = useActionState(deleteRoleAction, initialState);

  return (
    <form action={formAction}>
      <input type="hidden" name="roleId" value={roleId} />
      <DialogHeader>
        <DialogTitle>Slet rolle</DialogTitle>
        <DialogDescription>
          Denne handling kan ikke fortrydes. Skriv SLET for at bekræfte sletning af rollen {roleName}.
        </DialogDescription>
        <FieldGroup>
          <FieldLabel className="flex flex-col items-start">
            <span>Bekraft med teksten SLET</span>
            <Input type="text" name="confirmText" required />
          </FieldLabel>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline">Annuller</Button>} />
          <Button type="submit" variant="destructive" disabled={pending}>{pending ? "Sletter..." : "Slet"}</Button>
        </DialogFooter>
      </DialogHeader>
    </form>
  );
}