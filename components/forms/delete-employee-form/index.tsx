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
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction}>
      <input type="hidden" name="employeeId" value={employeeId} />
      <DialogHeader>
        <DialogTitle>Registrer fratraedelse</DialogTitle>
        <DialogDescription>
          Denne handling anonymiserer {employeeName} og sletter sager samt loenforhandlinger. Udfyld fratraedelsesdato og skriv FRATRAED for at bekraefte.
        </DialogDescription>
        <FieldGroup>
          <FieldLabel className="flex flex-col items-start">
            <span>Fratraedelsesdato</span>
            <Input type="date" name="employmentEndedAt" required defaultValue={today} max={today} />
          </FieldLabel>
          <FieldLabel className="flex flex-col items-start">
            <span>Bekraft med teksten FRATRAED</span>
            <Input type="text" name="confirmText" required />
          </FieldLabel>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline">Annuller</Button>} />
          <Button type="submit" variant="destructive" disabled={pending}>{pending ? "Gemmer..." : "Registrer fratraedelse"}</Button>
        </DialogFooter>
      </DialogHeader>
    </form>
  );
}