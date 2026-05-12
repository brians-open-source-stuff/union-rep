import EditUserForm from "@/components/forms/edit-user-form";
import ModalDialog from "@/components/layout/modal-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getUserDepartmentOptions, getUsers } from "@/data/user-dto";
import { FiPenTool } from "react-icons/fi";

export default async function UsersPage() {
	const users = await getUsers();
	const departments = await getUserDepartmentOptions();

	return (
		<>
			<h2>Brugere</h2>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead></TableHead>
						<TableHead>Navn</TableHead>
						<TableHead>Rolle</TableHead>
						<TableHead>Afdeling</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{users.map((user) => (
						<TableRow key={user.id}>
							<TableCell className="w-fit">
								<ModalDialog buttonText={<FiPenTool />} buttonVariant="ghost">
									<EditUserForm user={user} departments={departments} />
								</ModalDialog>
							</TableCell>
							<TableCell>{user.name}</TableCell>
							<TableCell>{user.roles.join(", ")}</TableCell>
							<TableCell>{user.departments.join(", ")}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</>
	);
}
