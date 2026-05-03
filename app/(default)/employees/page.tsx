import EmployeeTableClient from "@/components/layout/employee-table-client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getEmployees } from "@/data/employee-dto";

export default async function EmployeePage() {
  const employees = await getEmployees();

  return (
    <>
      <h2>Medarbejdere</h2>
      <EmployeeTableClient employees={employees} />
    </>
  );
}