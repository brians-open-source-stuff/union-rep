
import EditUserForm from "@/components/forms/edit-user-form";
import CreateUserForm from "@/components/forms/create-user-form";
import DeleteUserForm from "@/components/forms/delete-user-form";
import ModalDialog from "@/components/layout/modal-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getUserDepartmentOptions, getUserRoleOptions, getUsers } from "@/data/user-dto";
import { FiPenTool, FiTrash2, FiUserPlus } from "react-icons/fi";

export default async function UsersPage() {
	const [users, departments, roles] = await Promise.all([
		getUsers(),
		getUserDepartmentOptions(),
		getUserRoleOptions(),
	]);

	return (
		<>
			<div className="flex items-center justify-between mb-4">
				<h2>Brugere</h2>
				<ModalDialog buttonText={<span className="flex items-center gap-2"><FiUserPlus /> Opret bruger</span>} buttonVariant="default">
					<CreateUserForm roles={roles} />
				</ModalDialog>
			</div>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead></TableHead>
						<TableHead>Navn</TableHead>
						<TableHead>Rolle</TableHead>
						<TableHead>Afdeling</TableHead>
						<TableHead></TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{users.map((user) => (
						<TableRow key={user.id}>
							<TableCell className="w-fit">
								<ModalDialog buttonText={<FiPenTool />} buttonVariant="ghost">
									<EditUserForm user={user} departments={departments} roles={roles} />
								</ModalDialog>
							</TableCell>
							<TableCell>{user.name}</TableCell>
							<TableCell>{user.roles.join(", ")}</TableCell>
							<TableCell>{user.departments.join(", ")}</TableCell>
							<TableCell className="w-fit">
								<ModalDialog buttonText={<FiTrash2 />} buttonVariant="ghost">
									<DeleteUserForm userId={user.id} userName={user.name} />
								</ModalDialog>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</>
	);
}
