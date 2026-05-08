"use client";

import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";

type Employee = {
	id: string;
	name: string;
	employedAt: string | Date;
	memberSince: string | Date | null;
	departments: { id: string; name: string }[];
	managers: { id: string; name: string }[];
};

type Props = {
	employees: Employee[];
};

type MembershipFilter = "all" | "members" | "non-members";
type SortOption = "name" | "employedAt";

export default function EmployeeTableClient({ employees }: Props) {
	const [membershipFilter, setMembershipFilter] = useState<MembershipFilter>("all");
	const [departmentFilter, setDepartmentFilter] = useState("");
	const [managerFilter, setManagerFilter] = useState("");
	const [sortBy, setSortBy] = useState<SortOption>("name");

	const departments = useMemo(() => {
		const map = new Map<string, { id: string; name: string }>();

		for (const employee of employees) {
			for (const department of employee.departments) {
				map.set(department.id, department);
			}
		}

		return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "da"));
	}, [employees]);

	const managers = useMemo(() => {
		const map = new Map<string, { id: string; name: string }>();

		for (const employee of employees) {
			for (const manager of employee.managers) {
				map.set(manager.id, manager);
			}
		}

		return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "da"));
	}, [employees]);

	const filteredEmployees = useMemo(() => {
		const filtered = employees.filter((employee) => {
			if (membershipFilter === "members" && !employee.memberSince) return false;
			if (membershipFilter === "non-members" && employee.memberSince) return false;

			if (
				departmentFilter &&
				!employee.departments.some((department) => department.id === departmentFilter)
			) {
				return false;
			}

			if (
				managerFilter &&
				!employee.managers.some((manager) => manager.id === managerFilter)
			) {
				return false;
			}

			return true;
		});

		filtered.sort((a, b) => {
			if (sortBy === "employedAt") {
				return new Date(a.employedAt).getTime() - new Date(b.employedAt).getTime();
			}

			return a.name.localeCompare(b.name, "da");
		});

		return filtered;
	}, [employees, membershipFilter, departmentFilter, managerFilter, sortBy]);

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap gap-3">
				<select
					value={membershipFilter}
					onChange={(event) => setMembershipFilter(event.target.value as MembershipFilter)}
					className="rounded-md border px-3 py-2"
				>
					<option value="all">Alle medarbejdere</option>
					<option value="members">Kun medlemmer</option>
					<option value="non-members">Kun ikke-medlemmer</option>
				</select>

				<select
					value={departmentFilter}
					onChange={(event) => setDepartmentFilter(event.target.value)}
					className="rounded-md border px-3 py-2"
				>
					<option value="">Alle afdelinger</option>
					{departments.map((department) => (
						<option key={department.id} value={department.id}>
							{department.name}
						</option>
					))}
				</select>

				<select
					value={managerFilter}
					onChange={(event) => setManagerFilter(event.target.value)}
					className="rounded-md border px-3 py-2"
				>
					<option value="">Alle ledere</option>
					{managers.map((manager) => (
						<option key={manager.id} value={manager.id}>
							{manager.name}
						</option>
					))}
				</select>

				<select
					value={sortBy}
					onChange={(event) => setSortBy(event.target.value as SortOption)}
					className="rounded-md border px-3 py-2"
				>
					<option value="name">Sorter efter navn</option>
					<option value="employedAt">Sorter efter ansættelsesdato</option>
				</select>
			</div>

			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Navn</TableHead>
						<TableHead>Afdeling</TableHead>
						<TableHead>Titel</TableHead>
						<TableHead>Chef/leder</TableHead>
						<TableHead>Ansat dato</TableHead>
						<TableHead>Indmeldelsesdato</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{filteredEmployees.map((employee) => (
						<TableRow key={employee.id}>
							<TableCell><Link href={"/employees/" + employee.id}>{employee.name}</Link></TableCell>
							<TableCell>{employee.departments[0]?.name ?? ""}</TableCell>
							<TableCell>{employee.title}</TableCell>
							<TableCell>{employee.managers[0]?.name ?? ""}</TableCell>
							<TableCell>
								{Intl.DateTimeFormat("da-DK", { dateStyle: "long" }).format(new Date(employee.employedAt))}
							</TableCell>
							<TableCell>
								{employee.memberSince
									? Intl.DateTimeFormat("da-DK", { dateStyle: "long" }).format(new Date(employee.memberSince))
									: ""}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}