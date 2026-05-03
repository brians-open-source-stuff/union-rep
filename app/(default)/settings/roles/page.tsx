import RoleForm from "@/components/forms/create-role-form";
import EditRoleForm from "@/components/forms/edit-role-form";
import ModalDialog from "@/components/layout/modal-dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getRoles } from "@/data/role-dto";
import { FiPenTool, FiTrash2 } from "react-icons/fi";

export default async function RolesPage() {
	const roles = await getRoles();

	return (
		<>
			<h1>Administrer roller</h1>
			<ModalDialog buttonText={"Tilføj rolle"} buttonVariant="default">
				<RoleForm />
			</ModalDialog>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead colSpan={2}>
							Rolle
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{roles.map(role => (
						<TableRow key={role.id}>
							<TableCell className="w-fit">
								{role.name !== "admin" && <ModalDialog buttonText={<FiPenTool />} buttonVariant="ghost"><EditRoleForm role={role} /></ModalDialog>}
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