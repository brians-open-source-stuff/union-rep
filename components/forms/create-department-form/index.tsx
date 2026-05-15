"use client";

import { Button } from "@/components/ui/button";
import { DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useActionState } from "react";
import createDepartmentAction, { type CreateDepartmentFormState } from "./department-action";

const initialState: CreateDepartmentFormState = {
  success: false,
};

export default function CreateDepartmentForm() {
  const [state, formAction, pending] = useActionState(createDepartmentAction, initialState);

  return (
    <form action={formAction}>
      <DialogHeader>
        <DialogTitle>Tilføj afdeling</DialogTitle>
        <DialogDescription>Udfyld afdelingens oplysninger.</DialogDescription>
        <FieldGroup>
          <FieldLabel className="flex flex-col items-start">
            <span>Navn</span>
            <Input type="text" name="name" required />
          </FieldLabel>
          <FieldLabel className="flex flex-col items-start">
            <span>Adresse</span>
            <Input type="text" name="streetaddress1" required />
          </FieldLabel>
          <FieldLabel className="flex flex-col items-start">
            <span>Adresse 2</span>
            <Input type="text" name="streetaddress2" />
          </FieldLabel>
          <div className="flex gap-3">
            <FieldLabel className="flex flex-col items-start flex-shrink-0">
              <span>Postnummer</span>
              <Input type="number" name="zipcode" required className="w-28" />
            </FieldLabel>
            <FieldLabel className="flex flex-col items-start flex-1">
              <span>By</span>
              <Input type="text" name="city" required />
            </FieldLabel>
          </div>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          {state.success && <p className="text-sm text-green-700">Afdeling oprettet</p>}
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline">Annuller</Button>} />
          <Button type="submit" disabled={pending}>{pending ? "Gemmer..." : "Opret"}</Button>
        </DialogFooter>
      </DialogHeader>
    </form>
  );
}
