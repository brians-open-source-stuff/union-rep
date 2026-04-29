import RoleForm from "@/components/forms/role-form";
import ModalDialog from "@/components/layout/modal-dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getRoles } from "@/data/role-dto";
import { FiPenTool, FiTrash2 } from "react-icons/fi";

export default async function RolesPage() {
	const roles = await getRoles();

	return (
		<>
			<h1>Role Management</h1>
			<ModalDialog buttonText={"Add Role"} buttonVariant="default">
				<RoleForm />
			</ModalDialog>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead colSpan={2}>
							Role
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{roles.map(role => (
						<TableRow key={role.id}>
							<TableCell className="w-fit">
								<Button variant="ghost" disabled={role.name === "admin"}><FiPenTool /></Button>
								<Button variant="ghost" disabled={role.name === "admin"}><FiTrash2 /></Button>
							</TableCell>
							<TableCell className="text-left w-auto">{role.name}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</>
	);
}