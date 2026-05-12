import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getManagers, ManagerSummary } from "@/data/manager-dto";

type ManagerRow = {
	id: string;
	name: string;
	title: string;
	depth: number;
	chiefName: string | null;
	departments: string[];
	chiefDepartments: string[];
};

function buildManagerRows(managers: ManagerSummary[]): ManagerRow[] {
	const byId = new Map(managers.map((manager) => [manager.id, manager]));
	const childrenByChiefId = new Map<string, ManagerSummary[]>();

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

	function visit(manager: ManagerSummary, depth: number) {
		if (visited.has(manager.id)) return;
		visited.add(manager.id);

		rows.push({
			id: manager.id,
			name: manager.name,
			title: manager.title,
			depth,
			chiefName: manager.chiefId ? byId.get(manager.chiefId)?.name ?? null : null,
			departments: manager.departments
				.map((department) => department.name)
				.sort((a, b) => a.localeCompare(b, "da")),
			chiefDepartments: manager.chiefId
				? (byId.get(manager.chiefId)?.departments ?? [])
					.map((department) => department.name)
					.sort((a, b) => a.localeCompare(b, "da"))
				: [],
		});

		for (const subordinate of childrenByChiefId.get(manager.id) ?? []) {
			visit(subordinate, depth + 1);
		}
	}

	for (const root of roots) {
		visit(root, 0);
	}

	// Handle unexpected cycles/disconnected groups by appending remaining managers.
	const remaining = managers
		.filter((manager) => !visited.has(manager.id))
		.sort((a, b) => a.name.localeCompare(b.name, "da"));

	for (const manager of remaining) {
		visit(manager, 0);
	}

	return rows;
}

export default async function ManagersPage() {
	const managers = await getManagers();
	const managerRows = buildManagerRows(managers);

	return (
		<>
			<h2>Ledere</h2>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Navn</TableHead>
						<TableHead>Titel</TableHead>
						<TableHead>Afdeling</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{managerRows.map((manager) => (
						<TableRow key={manager.id}>
							<TableCell>
								<span
									className="inline-flex items-center"
									style={{ paddingLeft: `${manager.depth * 1.25}rem` }}
								>
									{manager.depth > 0 && (
										<span className="mr-2 text-muted-foreground" aria-hidden>
											↳
										</span>
									)}
									{manager.name}
								</span>
							</TableCell>
							<TableCell>{manager.title}</TableCell>
							<TableCell>{manager.departments.join(", ")}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</>
	);
}
