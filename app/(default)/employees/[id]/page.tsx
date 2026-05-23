import EditEmployeeForm from "@/components/forms/edit-employee-form";
import DeleteEmployeeForm from "@/components/forms/delete-employee-form";
import CreateCaseForm from "@/components/forms/create-case-form";
import CreateSalaryForm from "@/components/forms/create-salary-form";
import ModalDialog from "@/components/layout/modal-dialog";
import CaseList from "@/components/layout/case-list";
import SalaryList from "@/components/layout/salary-list";
import { getSingleEmployee } from "@/data/employee-dto";
import { getCasesForEmployee } from "@/data/case-dto";
import { getSalariesForEmployee } from "@/data/salary-dto";
import { getCurrentSession } from "@/data/session";
import { getEmployeeAssignmentUserOptions } from "@/data/user-dto";
import { can } from "@/lib/utils";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata(
  { params }: Props
): Promise<Metadata> {
  // read route params
  const { id } = await params;

  // fetch data
  const employee = await getSingleEmployee(id);

  if (!employee) notFound();

  return {
    title: employee.name,
  }
}

export default async function EmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [employee, cases, salaries, currentSession, users] = await Promise.all([
    getSingleEmployee(id),
    getCasesForEmployee(id),
    getSalariesForEmployee(id),
    getCurrentSession(),
    getEmployeeAssignmentUserOptions(),
  ]);

  if (!employee) notFound();

  const nearestContact =
    employee.assignments.find((assignment) => assignment.isPrimary)?.user ??
    employee.assignments[0]?.user ??
    null;

  const canUpdateEmployee = currentSession ? can(currentSession.user, "employee:update") : false;
  const canDeleteEmployee = currentSession ? can(currentSession.user, "employee:delete") : false;

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        {canUpdateEmployee ? (
          <ModalDialog buttonText="Rediger staminfo" buttonVariant="default">
            <EditEmployeeForm employee={employee} users={users} />
          </ModalDialog>
        ) : null}
        {canDeleteEmployee ? (
          <ModalDialog buttonText="Slet medarbejder" buttonVariant="destructive">
            <DeleteEmployeeForm employeeId={employee.id} employeeName={employee.name} />
          </ModalDialog>
        ) : null}
      </div>
      <h1 className="text-xl">{employee.name}, {employee.title}</h1>
      <p>Ansættelsesdato: {Intl.DateTimeFormat("da-DK", { dateStyle: "long" }).format(employee.employedAt)}</p>
      <p>{employee.memberSince ? <span className="bg-green-800 text-white px-2">Er medlem</span> : <span className="bg-red-500 text-white px-2">Er ikke medlem</span>}</p>
      <p>Primær kontakt: {nearestContact?.name ?? "Ikke tildelt"}</p>
      <section className="mt-6">
        <h2 className="text-lg font-semibold">Sager <ModalDialog buttonText="Opret sag" buttonVariant="outline">
          <CreateCaseForm employeeId={id} currentUserName={currentSession?.user.name ?? "Ukendt"} />
        </ModalDialog></h2>
        <CaseList cases={cases} employeeId={id} currentUserName={currentSession?.user.name ?? "Ukendt"} />
      </section>
      <section className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Lønforhandlinger</h2>
          <ModalDialog buttonText="Ny lønforhandling" buttonVariant="outline">
            <CreateSalaryForm employeeId={id} currentUserName={currentSession?.user.name ?? "Ukendt"} />
          </ModalDialog>
        </div>
        <SalaryList salaries={salaries} employeeId={id} />
      </section>
    </>
  );
}