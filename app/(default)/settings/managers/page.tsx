import CreateManagerForm from "@/components/forms/create-manager-form";
import EditManagerForm from "@/components/forms/edit-manager-form";
import DeleteManagerForm from "@/components/forms/delete-manager-form";
import ModalDialog from "@/components/layout/modal-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDepartmentOptions } from "@/data/department-dto";
import { getManagersWithAuth, ManagerListItem } from "@/data/manager-dto";
import { getCurrentSession } from "@/data/session";
import { can } from "@/lib/utils";
import { notFound } from "next/navigation";
import { FiPenTool, FiTrash2 } from "react-icons/fi";

type ManagerRow = {
	id: string;
	name: string;
	title: string;
	depth: number;
	chiefName: string | null;
	departments: string[];
};

function buildManagerRows(managers: ManagerListItem[]): ManagerRow[] {
	const byId = new Map(managers.map((manager) => [manager.id, manager]));
	const childrenByChiefId = new Map<string, ManagerListItem[]>();

	for (const manager of managers) {
		if (!manager.chiefId || !byId.has(manager.chiefId)) continue;

		const siblings = childrenByChiefId.get(manager.chiefId) ?? [];
		siblings.push(manager);
		childrenByChiefId.set(manager.chiefId, siblings);
	}

	for (const children of childrenByChiefId.values()) {
		children.sort((a, b) => a.name.localeCompare(b.name, "da"));
	}

	const roots = managers
		.filter((manager) => !manager.chiefId || !byId.has(manager.chiefId))
		.sort((a, b) => a.name.localeCompare(b.name, "da"));

	const rows: ManagerRow[] = [];
	const visited = new Set<string>();

	function visit(manager: ManagerListItem, depth: number) {
		if (visited.has(manager.id)) return;
		visited.add(manager.id);

		rows.push({
			id: manager.id,
			name: manager.name,
			title: manager.title,
			depth,
			chiefName: manager.chiefName,
			departments: manager.departments
				.map((department) => department.name)
				.sort((a, b) => a.localeCompare(b, "da")),
		});

		for (const subordinate of childrenByChiefId.get(manager.id) ?? []) {
			visit(subordinate, depth + 1);
		}
	}

	for (const root of roots) {
		visit(root, 0);
	}

	const remaining = managers
		.filter((manager) => !visited.has(manager.id))
		.sort((a, b) => a.name.localeCompare(b.name, "da"));

	for (const manager of remaining) {
		visit(manager, 0);
	}

	return rows;
}

export default async function ManagersPage() {
	const [managers, currentSession] = await Promise.all([getManagersWithAuth(), getCurrentSession()]);

	if (!currentSession || !can(currentSession.user, "manager:read")) {
		notFound();
	}

	const canCreateManager = can(currentSession.user, "manager:create");
	const canUpdateManager = can(currentSession.user, "manager:update");
	const canDeleteManager = can(currentSession.user, "manager:delete");

	const departmentOptions = (canCreateManager || canUpdateManager)
		? await getDepartmentOptions()
		: [];

	const managerRows = buildManagerRows(managers);

	const managerOptions = managers.map((m) => ({ id: m.id, name: m.name }));

	return (
		<>
			<h1>Administrer ledere</h1>
			{canCreateManager ? (
				<ModalDialog buttonText="Tilføj leder" buttonVariant="default">
					<CreateManagerForm managerOptions={managerOptions} departmentOptions={departmentOptions} />
				</ModalDialog>
			) : null}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead></TableHead>
						<TableHead>Navn</TableHead>
						<TableHead>Titel</TableHead>
						<TableHead>Afdeling</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{managerRows.map((row) => {
						const manager = managers.find((m) => m.id === row.id);
						return (
							<TableRow key={row.id}>
								<TableCell className="w-fit">
									<div className="flex items-center gap-1">
										{canUpdateManager && manager ? (
											<ModalDialog buttonText={<FiPenTool />} buttonVariant="ghost">
												<EditManagerForm
													manager={manager}
													managerOptions={managerOptions}
													departmentOptions={departmentOptions}
												/>
											</ModalDialog>
										) : null}
										{canDeleteManager ? (
											<ModalDialog buttonText={<FiTrash2 />} buttonVariant="ghost">
												<DeleteManagerForm managerId={row.id} managerName={row.name} />
											</ModalDialog>
										) : null}
									</div>
								</TableCell>
								<TableCell>
									<span
										className="inline-flex items-center"
										style={{ paddingLeft: `${row.depth * 1.25}rem` }}
									>
										{row.depth > 0 && (
											<span className="mr-2 text-muted-foreground" aria-hidden>
												↳
											</span>
										)}
										{row.name}
									</span>
								</TableCell>
								<TableCell>{row.title}</TableCell>
								<TableCell>{row.departments.join(", ")}</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</>
	);
}

