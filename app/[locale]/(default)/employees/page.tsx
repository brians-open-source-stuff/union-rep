import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getEmployees } from "@/data/employee-dto";

export default async function EmployeePage() {
  const employees = await getEmployees();

  return (
    <>
      <h2>Employees</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Manager</TableHead>
            <TableHead>Employment Date</TableHead>
            <TableHead>Member Since</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map(employee => (
            <TableRow key={employee.id}>
              <TableCell>{employee.name}</TableCell>
              <TableCell>{employee.departments[0].name}</TableCell>
              <TableCell>{employee.managers[0].name}</TableCell>
              <TableCell>{Intl.DateTimeFormat("da-DK", { dateStyle: "long" }).format(new Date(employee.employedAt))}</TableCell>
              <TableCell>{employee.memberSince ? Intl.DateTimeFormat("da-DK", { dateStyle: "long" }).format(new Date(employee.memberSince)) : ""}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}