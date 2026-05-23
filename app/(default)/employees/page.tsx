import EmployeeTableClient from "@/components/layout/employee-table-client";
import { buttonVariants } from "@/components/ui/button";
import { getEmployees } from "@/data/employee-dto";
import { getCurrentSession } from "@/data/session";
import { getEmployeeAssignmentUserOptions } from "@/data/user-dto";
import { can } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";

export const metadata = {
  title: "Medarbejdere"
}

export default async function EmployeePage() {
  const [employees, currentSession] = await Promise.all([getEmployees(), getCurrentSession()]);

  if (!employees) notFound();

  const canCreateEmployee = currentSession ? can(currentSession.user, "employee:create") : false;
  const canUpdateEmployee = currentSession ? can(currentSession.user, "employee:update") : false;
  const canDeleteEmployee = currentSession ? can(currentSession.user, "employee:delete") : false;

  const users = canUpdateEmployee ? await getEmployeeAssignmentUserOptions() : [];

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2>Medarbejdere</h2>
        {canCreateEmployee ? (
          <Link href="/employees/new" className={buttonVariants()}>
            Ny medarbejder
          </Link>
        ) : null}
      </div>
      <EmployeeTableClient
        employees={employees}
        users={users}
        canUpdateEmployee={canUpdateEmployee}
        canDeleteEmployee={canDeleteEmployee}
      />
    </>
  );
}