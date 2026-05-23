"use client";

import { Button } from "@/components/ui/button";
import { FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useActionState } from "react";
import createEmployeeAction, { type CreateEmployeeFormState } from "./create-employee-action";

type UserOption = {
  id: string;
  name: string;
  roles: string[];
};

type ManagerOption = {
  id: string;
  name: string;
  title: string;
};

type DepartmentOption = {
  id: string;
  name: string;
};

const initialState: CreateEmployeeFormState = {
  success: false,
};

export default function CreateEmployeeForm({
  users,
  managers,
  departments,
}: {
  users: ReadonlyArray<UserOption>;
  managers: ReadonlyArray<ManagerOption>;
  departments: ReadonlyArray<DepartmentOption>;
}) {
  const [state, formAction, pending] = useActionState(createEmployeeAction, initialState);

  const sortedUsers = [...users].sort((a, b) => a.name.localeCompare(b.name, "da"));
  const sortedManagers = [...managers].sort((a, b) => a.name.localeCompare(b.name, "da"));
  const sortedDepartments = [...departments].sort((a, b) => a.name.localeCompare(b.name, "da"));

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      <FieldGroup>
        <FieldLabel className="flex flex-col items-start">
          <span>Navn</span>
          <Input type="text" name="name" required />
        </FieldLabel>
        <FieldLabel className="flex flex-col items-start">
          <span>Ansat dato</span>
          <Input type="date" name="employedAt" required />
        </FieldLabel>
        <FieldLabel className="flex flex-col items-start">
          <span>Medlem siden</span>
          <Input type="date" name="memberSince" />
        </FieldLabel>
        <FieldLabel className="flex flex-col items-start">
          <span>Sidste kontakt</span>
          <Input type="date" name="lastContact" />
        </FieldLabel>
        <FieldLabel className="flex flex-col items-start">
          <span>Fodselsdato</span>
          <Input type="date" name="birthdate" />
        </FieldLabel>
        <FieldLabel className="flex flex-col items-start">
          <span>Titel</span>
          <Input type="text" name="title" />
        </FieldLabel>
        <FieldLabel className="flex flex-col items-start">
          <span>Email</span>
          <Input type="email" name="email" />
        </FieldLabel>
        <FieldLabel className="flex flex-col items-start">
          <span>Alternativ email</span>
          <Input type="email" name="emailAlt" />
        </FieldLabel>
        <FieldLabel className="flex flex-col items-start">
          <span>Telefon</span>
          <Input type="tel" name="phone" />
        </FieldLabel>
        <FieldLabel className="flex flex-col items-start">
          <span>Alternativ telefon</span>
          <Input type="tel" name="phoneAlt" />
        </FieldLabel>
        <FieldLabel className="flex flex-col items-start">
          <span>Afdeling</span>
          <select name="departmentId" defaultValue="" className="h-9 w-full rounded-md border px-2">
            <option value="">Ingen</option>
            {sortedDepartments.map((department) => (
              <option key={department.id} value={department.id}>{department.name}</option>
            ))}
          </select>
        </FieldLabel>
        <FieldLabel className="flex flex-col items-start">
          <span>Leder</span>
          <select name="managerId" defaultValue="" className="h-9 w-full rounded-md border px-2">
            <option value="">Ingen</option>
            {sortedManagers.map((manager) => (
              <option key={manager.id} value={manager.id}>{manager.name} ({manager.title})</option>
            ))}
          </select>
        </FieldLabel>
        <FieldLabel className="flex flex-col items-start">
          <span>Primær kontaktperson</span>
          <select name="primaryUserId" defaultValue="" className="h-9 w-full rounded-md border px-2">
            <option value="">Ingen</option>
            {sortedUsers.map((user) => (
              <option key={user.id} value={user.id}>{user.name} ({user.roles.join(", ") || "ingen rolle"})</option>
            ))}
          </select>
        </FieldLabel>
        <FieldLabel className="flex flex-col items-start">
          <span>Sekundær kontaktperson</span>
          <select name="secondaryUserId" defaultValue="" className="h-9 w-full rounded-md border px-2">
            <option value="">Ingen</option>
            {sortedUsers.map((user) => (
              <option key={user.id} value={user.id}>{user.name} ({user.roles.join(", ") || "ingen rolle"})</option>
            ))}
          </select>
        </FieldLabel>
      </FieldGroup>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>{pending ? "Opretter..." : "Opret medarbejder"}</Button>
      </div>
    </form>
  );
}