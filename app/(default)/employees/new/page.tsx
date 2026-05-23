import CreateEmployeeForm from "@/components/forms/create-employee-form";
import { getDepartmentOptions } from "@/data/department-dto";
import { getManagers } from "@/data/manager-dto";
import { getEmployeeAssignmentUserOptions } from "@/data/user-dto";
import { getCurrentSession } from "@/data/session";
import { can } from "@/lib/utils";
import { notFound } from "next/navigation";

export default async function NewEmployeePage() {
  const currentSession = await getCurrentSession();
  if (!currentSession) notFound();

  if (!can(currentSession.user, "employee:create")) notFound();

  const [users, managers, departments] = await Promise.all([
    getEmployeeAssignmentUserOptions(),
    getManagers(),
    getDepartmentOptions(),
  ]);

  return (
    <>
      <h2>Ny medarbejder</h2>
      <CreateEmployeeForm users={users} managers={managers} departments={departments} />
    </>
  );
}