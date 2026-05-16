"use client";

import { Button } from "@/components/ui/button";
import { DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useActionState } from "react";
import updateUserAction, { type UpdateUserFormState } from "./update-user-action";

type EditUserFormProps = {
  user: {
    id: string;
    name: string;
    roleIds: string[];
    departmentIds: string[];
  };
  roles: Array<{
    id: string;
    name: string;
  }>;
  departments: Array<{
    id: string;
    name: string;
  }>;
};

const initialState: UpdateUserFormState = {
  success: false,
};

export default function EditUserForm({ user, roles, departments }: Readonly<EditUserFormProps>) {
  const [state, formAction, pending] = useActionState(updateUserAction, initialState);
  const assignedRoleIds = new Set(user.roleIds);
  const assignedDepartmentIds = new Set(user.departmentIds);

  return (
    <form action={formAction}>
      <input type="hidden" name="userId" value={user.id} />
      <DialogHeader>
        <DialogTitle>Rediger bruger</DialogTitle>
        <DialogDescription>{user.name}</DialogDescription>
        <FieldGroup>
          <FieldLabel className="flex flex-col items-start">
            <span>Nyt password</span>
            <Input type="password" name="password" placeholder="Lad feltet stå tomt for uændret" />
          </FieldLabel>
          <div className="space-y-2">
            <p className="text-sm font-medium">Roller</p>
            <div className="grid gap-2 max-h-56 overflow-y-auto rounded-md border p-3">
              {roles.map((role) => (
                <label key={role.id} className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="roleIds"
                    value={role.id}
                    defaultChecked={assignedRoleIds.has(role.id)}
                  />
                  <span>{role.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Afdelinger</p>
            <div className="grid gap-2 max-h-56 overflow-y-auto rounded-md border p-3">
              {departments.map((department) => (
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
          {state.success && <p className="text-sm text-green-700">Bruger opdateret</p>}
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline">Annuller</Button>} />
          <Button type="submit" disabled={pending}>{pending ? "Gemmer..." : "Gem"}</Button>
        </DialogFooter>
      </DialogHeader>
    </form>
  );
}
