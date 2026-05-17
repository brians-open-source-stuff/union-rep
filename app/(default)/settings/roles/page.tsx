import RoleForm from "@/components/forms/create-role-form";
import EditRoleForm from "@/components/forms/edit-role-form";
import DeleteRoleForm from "@/components/forms/delete-role-form";
import ModalDialog from "@/components/layout/modal-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getRolePermissionOptions, getRoles } from "@/data/role-dto";
import { getCurrentSession } from "@/data/session";
import { can } from "@/lib/utils";
import { notFound } from "next/navigation";
import { FiPenTool, FiTrash2 } from "react-icons/fi";

export const metadata = {
	title: "Roller"
}

export default async function RolesPage() {
	const [roles, currentSession] = await Promise.all([getRoles(), getCurrentSession()]);

	if (!currentSession || !can(currentSession.user, "role:read")) {
		notFound();
	}

	const canCreateRole = can(currentSession.user, "role:create");
	const canUpdateRole = can(currentSession.user, "role:update");
	const canDeleteRole = can(currentSession.user, "role:delete");
	const permissionOptions = (canCreateRole || canUpdateRole) ? await getRolePermissionOptions() : [];

	return (
		<>
			<h1>Administrer roller</h1>
			{canCreateRole ? (
				<ModalDialog buttonText={"Tilføj rolle"} buttonVariant="default">
					<RoleForm permissionOptions={permissionOptions} />
				</ModalDialog>
			) : null}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead></TableHead>
						<TableHead>Rolle</TableHead>
						<TableHead>Tilladelser</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{roles.map(role => (
						<TableRow key={role.id}>
							<TableCell className="w-fit">
								<div className="flex items-center gap-1">
									{canUpdateRole && role.name !== "admin" ? (
										<ModalDialog buttonText={<FiPenTool />} buttonVariant="ghost">
											<EditRoleForm role={role} permissionOptions={permissionOptions} />
										</ModalDialog>
									) : null}
									{canDeleteRole && role.name !== "admin" ? (
										<ModalDialog buttonText={<FiTrash2 />} buttonVariant="ghost">
											<DeleteRoleForm roleId={role.id} roleName={role.name} />
										</ModalDialog>
									) : null}
								</div>
							</TableCell>
							<TableCell className="text-left w-auto">{role.name}</TableCell>
							<TableCell className="text-left w-auto">{role.permissions.map((permission) => permission.name).join(", ")}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</>
	);
}