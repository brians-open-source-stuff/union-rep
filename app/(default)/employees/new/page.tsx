import CreateEmployeeForm from "@/components/forms/create-employee-form";
import { getManagers } from "@/data/manager-dto";
import { getCurrentSession } from "@/data/session";
import { can } from "@/lib/utils";
import { notFound } from "next/navigation";

export default async function NewEmployeePage() {
  const currentSession = await getCurrentSession();
  if (!currentSession) notFound();

  if (!can(currentSession.user, "employee:create")) notFound();

  const managers = await getManagers();

  return (
    <>
      <h2>Ny medarbejder</h2>
      <CreateEmployeeForm managers={managers} />
    </>
  );
}