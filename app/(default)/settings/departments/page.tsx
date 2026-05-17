import CreateDepartmentForm from "@/components/forms/create-department-form";
import EditDepartmentForm from "@/components/forms/edit-department-form";
import DeleteDepartmentForm from "@/components/forms/delete-department-form";
import ModalDialog from "@/components/layout/modal-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDepartments } from "@/data/department-dto";
import { getCurrentSession } from "@/data/session";
import { can } from "@/lib/utils";
import { notFound } from "next/navigation";
import { FiPenTool, FiTrash2 } from "react-icons/fi";

export const metadata = {
  title: "Afdelinger"
}

export default async function DepartmentsPage() {
  const [departments, currentSession] = await Promise.all([getDepartments(), getCurrentSession()]);

  if (!currentSession || !can(currentSession.user, "department:read")) {
    notFound();
  }

  const canCreateDepartment = can(currentSession.user, "department:create");
  const canUpdateDepartment = can(currentSession.user, "department:update");
  const canDeleteDepartment = can(currentSession.user, "department:delete");

  return (
    <>
      <h1>Administrer afdelinger</h1>
      {canCreateDepartment ? (
        <ModalDialog buttonText="Tilføj afdeling" buttonVariant="default">
          <CreateDepartmentForm />
        </ModalDialog>
      ) : null}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead></TableHead>
            <TableHead>Navn</TableHead>
            <TableHead>Adresse</TableHead>
            <TableHead>By</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {departments.map((department) => (
            <TableRow key={department.id}>
              <TableCell className="w-fit">
                <div className="flex items-center gap-1">
                  {canUpdateDepartment ? (
                    <ModalDialog buttonText={<FiPenTool />} buttonVariant="ghost">
                      <EditDepartmentForm department={department} />
                    </ModalDialog>
                  ) : null}
                  {canDeleteDepartment ? (
                    <ModalDialog buttonText={<FiTrash2 />} buttonVariant="ghost">
                      <DeleteDepartmentForm departmentId={department.id} departmentName={department.name} />
                    </ModalDialog>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>{department.name}</TableCell>
              <TableCell>
                {department.streetaddress1}
                {department.streetaddress2 ? `, ${department.streetaddress2}` : ""}
              </TableCell>
              <TableCell>{department.zipcode} {department.city}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
