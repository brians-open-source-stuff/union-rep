import EditEmployeeForm from "@/components/forms/edit-employee-form";
import ModalDialog from "@/components/layout/modal-dialog";
import { getSingleEmployee } from "@/data/employee-dto";
import { notFound } from "next/navigation";

export default async function EmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const employee = await getSingleEmployee(id);

  if (!employee) notFound();

  return (
    <>
      <ModalDialog buttonText="Rediger staminfo" buttonVariant="default">
        <EditEmployeeForm employee={employee} />
      </ModalDialog>
      <h1 className="text-xl">{employee.name}, {employee.title}</h1>
      <p>Ansættelsesdato: {Intl.DateTimeFormat("da-DK", { dateStyle: "long" }).format(employee.employedAt)}</p>
      <p>{employee.memberSince ? <span className="bg-green-800 text-white px-2">Er medlem</span> : <span className="bg-red-500 text-white px-2">Er ikke medlem</span>}</p>
      <p>Nærmeste leder: {employee.managers[0].name}</p>
    </>
  );
}