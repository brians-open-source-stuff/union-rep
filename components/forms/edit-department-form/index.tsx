"use client";

import { Button } from "@/components/ui/button";
import { DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useActionState } from "react";
import updateDepartmentAction, { type UpdateDepartmentFormState } from "./update-department-action";

type DepartmentForEditForm = {
  id: string;
  name: string;
  streetaddress1: string;
  streetaddress2: string | null;
  zipcode: number;
  city: string;
};

const initialState: UpdateDepartmentFormState = {
  success: false,
};

export default function EditDepartmentForm({ department }: { department: Readonly<DepartmentForEditForm> }) {
  const [state, formAction, pending] = useActionState(updateDepartmentAction, initialState);

  return (
    <form action={formAction}>
      <input type="hidden" name="departmentId" value={department.id} />
      <DialogHeader>
        <DialogTitle>Rediger afdeling</DialogTitle>
        <DialogDescription>Opdater afdelingens oplysninger.</DialogDescription>
        <FieldGroup>
          <FieldLabel className="flex flex-col items-start">
            <span>Navn</span>
            <Input type="text" name="name" defaultValue={department.name} required />
          </FieldLabel>
          <FieldLabel className="flex flex-col items-start">
            <span>Adresse</span>
            <Input type="text" name="streetaddress1" defaultValue={department.streetaddress1} required />
          </FieldLabel>
          <FieldLabel className="flex flex-col items-start">
            <span>Adresse 2</span>
            <Input type="text" name="streetaddress2" defaultValue={department.streetaddress2 ?? ""} />
          </FieldLabel>
          <div className="flex gap-3">
            <FieldLabel className="flex flex-col items-start shrink-0">
              <span>Postnummer</span>
              <Input type="number" name="zipcode" defaultValue={department.zipcode} required className="w-28" />
            </FieldLabel>
            <FieldLabel className="flex flex-col items-start flex-1">
              <span>By</span>
              <Input type="text" name="city" defaultValue={department.city} required />
            </FieldLabel>
          </div>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          {state.success && <p className="text-sm text-green-700">Afdeling opdateret</p>}
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline">Annuller</Button>} />
          <Button type="submit" disabled={pending}>{pending ? "Gemmer..." : "Rediger"}</Button>
        </DialogFooter>
      </DialogHeader>
    </form>
  );
}
