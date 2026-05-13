"use client";

import { Button } from "@/components/ui/button";
import { DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useActionState } from "react";
import deleteEmployeeAction, { type DeleteEmployeeFormState } from "./delete-employee-action";

const initialState: DeleteEmployeeFormState = {
  success: false,
};

export default function DeleteEmployeeForm({ employeeId, employeeName }: { employeeId: string; employeeName: string }) {
  const [state, formAction, pending] = useActionState(deleteEmployeeAction, initialState);

  return (
    <form action={formAction}>
      <input type="hidden" name="employeeId" value={employeeId} />
      <DialogHeader>
        <DialogTitle>Slet medarbejder</DialogTitle>
        <DialogDescription>
          Denne handling kan ikke fortrydes. Skriv SLET for at bekræfte sletning af {employeeName}.
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
          <Button type="submit" variant="destructive" disabled={pending}>{pending ? "Sletter..." : "Slet medarbejder"}</Button>
        </DialogFooter>
      </DialogHeader>
    </form>
  );
}