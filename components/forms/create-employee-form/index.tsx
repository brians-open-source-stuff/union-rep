"use client";

import { Button } from "@/components/ui/button";
import { FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useActionState } from "react";
import createEmployeeAction, { type CreateEmployeeFormState } from "./create-employee-action";

type ManagerOption = {
  id: string;
  name: string;
  title: string;
  chiefId: string | null;
};

const initialState: CreateEmployeeFormState = {
  success: false,
};

export default function CreateEmployeeForm({ managers }: { managers: ReadonlyArray<ManagerOption> }) {
  const [state, formAction, pending] = useActionState(createEmployeeAction, initialState);

  const chiefManagers = managers.filter((manager) => manager.chiefId === null);
  const directManagers = managers.filter((manager) => manager.chiefId !== null);

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
          <span>Manager</span>
          <select name="managerId" defaultValue="" className="h-9 w-full rounded-md border px-2">
            <option value="">Ingen</option>
            {directManagers.map((manager) => (
              <option key={manager.id} value={manager.id}>{manager.name} ({manager.title})</option>
            ))}
          </select>
        </FieldLabel>
        <FieldLabel className="flex flex-col items-start">
          <span>Chefleder</span>
          <select name="chiefManagerId" defaultValue="" className="h-9 w-full rounded-md border px-2">
            <option value="">Ingen</option>
            {chiefManagers.map((manager) => (
              <option key={manager.id} value={manager.id}>{manager.name} ({manager.title})</option>
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