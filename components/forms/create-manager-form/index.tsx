"use client";

import { Button } from "@/components/ui/button";
import { DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useActionState } from "react";
import createManagerAction, { type CreateManagerFormState } from "./create-manager-action";

type ManagerOption = {
  id: string;
  name: string;
};

type DepartmentOption = {
  id: string;
  name: string;
};

const initialState: CreateManagerFormState = {
  success: false,
};

export default function CreateManagerForm({
  managerOptions,
  departmentOptions,
}: {
  managerOptions: ReadonlyArray<ManagerOption>;
  departmentOptions: ReadonlyArray<DepartmentOption>;
}) {
  const [state, formAction, pending] = useActionState(createManagerAction, initialState);

  return (
    <form action={formAction}>
      <DialogHeader>
        <DialogTitle>Tilføj leder</DialogTitle>
        <DialogDescription>Udfyld lederens oplysninger.</DialogDescription>
        <FieldGroup>
          <FieldLabel className="flex flex-col items-start">
            <span>Navn</span>
            <Input type="text" name="name" required />
          </FieldLabel>
          <FieldLabel className="flex flex-col items-start">
            <span>Titel</span>
            <Input type="text" name="title" required />
          </FieldLabel>
          <FieldLabel className="flex flex-col items-start">
            <span>Chefsleder</span>
            <select name="chiefId" className="w-full rounded-md border px-3 py-2 text-sm">
              <option value="">— Ingen chefsleder —</option>
              {managerOptions.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.name}
                </option>
              ))}
            </select>
          </FieldLabel>
          <div className="space-y-2">
            <p className="text-sm font-medium">Afdelinger</p>
            <div className="grid gap-2 max-h-48 overflow-y-auto rounded-md border p-3">
              {departmentOptions.map((department) => (
                <label key={department.id} className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" name="departmentIds" value={department.id} />
                  <span>{department.name}</span>
                </label>
              ))}
            </div>
          </div>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          {state.success && <p className="text-sm text-green-700">Leder oprettet</p>}
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline">Annuller</Button>} />
          <Button type="submit" disabled={pending}>{pending ? "Gemmer..." : "Opret"}</Button>
        </DialogFooter>
      </DialogHeader>
    </form>
  );
}
