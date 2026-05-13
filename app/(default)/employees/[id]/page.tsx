import EditEmployeeForm from "@/components/forms/edit-employee-form";
import CreateCaseForm from "@/components/forms/create-case-form";
import ModalDialog from "@/components/layout/modal-dialog";
import CaseList from "@/components/layout/case-list";
import { getSingleEmployee } from "@/data/employee-dto";
import { getCasesForEmployee } from "@/data/case-dto";
import { getCurrentSession } from "@/data/session";
import { getManagers } from "@/data/manager-dto";
import { notFound } from "next/navigation";

export default async function EmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [employee, cases, currentSession, managers] = await Promise.all([
    getSingleEmployee(id),
    getCasesForEmployee(id),
    getCurrentSession(),
    getManagers(),
  ]);

  if (!employee) notFound();

  const nearestManager =
    employee.managers.find((manager) => manager.chiefId !== null) ??
    employee.managers.find((manager) => manager.chiefId === null) ??
    null;

  return (
    <>
      <ModalDialog buttonText="Rediger staminfo" buttonVariant="default">
        <EditEmployeeForm employee={employee} managers={managers} />
      </ModalDialog>
      <h1 className="text-xl">{employee.name}, {employee.title}</h1>
      <p>Ansættelsesdato: {Intl.DateTimeFormat("da-DK", { dateStyle: "long" }).format(employee.employedAt)}</p>
      <p>{employee.memberSince ? <span className="bg-green-800 text-white px-2">Er medlem</span> : <span className="bg-red-500 text-white px-2">Er ikke medlem</span>}</p>
      <p>Nærmeste leder: {nearestManager?.name ?? "Ikke tildelt"}</p>
      <section className="mt-6">
        <h2 className="text-lg font-semibold">Sager <ModalDialog buttonText="Opret sag" buttonVariant="outline">
          <CreateCaseForm employeeId={id} currentUserName={currentSession?.user.name ?? "Ukendt"} />
        </ModalDialog></h2>
        <CaseList cases={cases} employeeId={id} currentUserName={currentSession?.user.name ?? "Ukendt"} />
      </section>
    </>
  );
}