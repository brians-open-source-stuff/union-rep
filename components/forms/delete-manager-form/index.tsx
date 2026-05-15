"use client";

import { Button } from "@/components/ui/button";
import { DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useActionState } from "react";
import deleteManagerAction, { type DeleteManagerFormState } from "./delete-manager-action";

const initialState: DeleteManagerFormState = {
  success: false,
};

export default function DeleteManagerForm({ managerId, managerName }: { managerId: string; managerName: string }) {
  const [state, formAction, pending] = useActionState(deleteManagerAction, initialState);

  return (
    <form action={formAction}>
      <input type="hidden" name="managerId" value={managerId} />
      <DialogHeader>
        <DialogTitle>Slet leder</DialogTitle>
        <DialogDescription>
          Denne handling kan ikke fortrydes. Skriv SLET for at bekræfte sletning af lederen {managerName}.
        </DialogDescription>
        <FieldGroup>
          <FieldLabel className="flex flex-col items-start">
            <span>Bekræft med teksten SLET</span>
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
