"use client";

import { Button } from "@/components/ui/button";
import { DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useActionState } from "react";
import updateManagerAction, { type UpdateManagerFormState } from "./update-manager-action";

type ManagerForEditForm = {
  id: string;
  name: string;
  title: string;
  chiefId: string | null;
  departments: { id: string; name: string }[];
};

type ManagerOption = {
  id: string;
  name: string;
};

type DepartmentOption = {
  id: string;
  name: string;
};

const initialState: UpdateManagerFormState = {
  success: false,
};

export default function EditManagerForm({
  manager,
  managerOptions,
  departmentOptions,
}: {
  manager: Readonly<ManagerForEditForm>;
  managerOptions: ReadonlyArray<ManagerOption>;
  departmentOptions: ReadonlyArray<DepartmentOption>;
}) {
  const [state, formAction, pending] = useActionState(updateManagerAction, initialState);
  const assignedDepartmentIds = new Set(manager.departments.map((d) => d.id));

  return (
    <form action={formAction}>
      <input type="hidden" name="managerId" value={manager.id} />
      <DialogHeader>
        <DialogTitle>Rediger leder</DialogTitle>
        <DialogDescription>Opdater lederens oplysninger.</DialogDescription>
        <FieldGroup>
          <FieldLabel className="flex flex-col items-start">
            <span>Navn</span>
            <Input type="text" name="name" defaultValue={manager.name} required />
          </FieldLabel>
          <FieldLabel className="flex flex-col items-start">
            <span>Titel</span>
            <Input type="text" name="title" defaultValue={manager.title} required />
          </FieldLabel>
          <FieldLabel className="flex flex-col items-start">
            <span>Chefsleder</span>
            <select name="chiefId" defaultValue={manager.chiefId ?? ""} className="w-full rounded-md border px-3 py-2 text-sm">
              <option value="">— Ingen chefsleder —</option>
              {managerOptions
                .filter((m) => m.id !== manager.id)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </select>
          </FieldLabel>
          <div className="space-y-2">
            <p className="text-sm font-medium">Afdelinger</p>
            <div className="grid gap-2 max-h-48 overflow-y-auto rounded-md border p-3">
              {departmentOptions.map((department) => (
                <label key={department.id} className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="departmentIds"
                    value={department.id}
                    defaultChecked={assignedDepartmentIds.has(department.id)}
                  />
                  <span>{department.name}</span>
                </label>
              ))}
            </div>
          </div>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          {state.success && <p className="text-sm text-green-700">Leder opdateret</p>}
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline">Annuller</Button>} />
          <Button type="submit" disabled={pending}>{pending ? "Gemmer..." : "Rediger"}</Button>
        </DialogFooter>
      </DialogHeader>
    </form>
  );
}
