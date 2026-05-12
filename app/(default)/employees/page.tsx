import EmployeeTableClient from "@/components/layout/employee-table-client";
import { getEmployees } from "@/data/employee-dto";
import { notFound } from "next/navigation";

export default async function EmployeePage() {
  const employees = await getEmployees();

  if (!employees) notFound();

  return (
    <>
      <h2>Medarbejdere</h2>
      <EmployeeTableClient employees={employees} />
    </>
  );
}