"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import searchEmployeesAction from "./search-employees-action";

const SEGMENT_LABELS: Record<string, string> = {
	settings: "Indstillinger",
	employees: "Medarbejdere",
	employee: "Medarbejder",
	departments: "Afdelinger",
	roles: "Roller",
	managers: "Ledere",
	sessions: "Sessioner",
	users: "Brugere",
	keys: "Nøgler",
	new: "Ny",
	login: "Login",
	"change-password": "Skift adgangskode",
};

function formatSegment(segment: string): string {
	if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment];
	if (/^[0-9a-f-]{8,}$/i.test(segment)) return "Detaljer";
	const text = decodeURIComponent(segment).replace(/[-_]/g, " ");
	return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function AppHeader() {
	const pathname = usePathname();
	const router = useRouter();
	const segments = pathname.split("/").filter(Boolean);
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<Array<{ id: string; name: string }>>([]);
	const trimmedQuery = query.trim();
	const crumbs = segments.map((segment, index) => ({
		label: formatSegment(segment),
		href: `/${segments.slice(0, index + 1).join("/")}`,
		isLast: index === segments.length - 1,
	}));
	const visibleResults = useMemo(
		() => (trimmedQuery.length < 2 ? [] : results),
		[trimmedQuery, results],
	);

	const resultMap = useMemo(
		() => new Map(visibleResults.map((employee) => [employee.name, employee.id])),
		[visibleResults],
	);

	useEffect(() => {
		if (trimmedQuery.length < 2) {
			return;
		}

		let isCancelled = false;
		const timeout = setTimeout(async () => {
			const found = await searchEmployeesAction(trimmedQuery);
			if (!isCancelled) {
				setResults(found);
			}
		}, 180);

		return () => {
			isCancelled = true;
			clearTimeout(timeout);
		};
	}, [trimmedQuery]);

	function handleSearchInput(value: string) {
		setQuery(value);
		const employeeId = resultMap.get(value);
		if (employeeId) {
			router.push(`/employees/${employeeId}`);
			setQuery("");
		}
	}

	return (
		<header className="flex h-16 shrink-0 items-center gap-2 px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
			<div className="flex min-w-0 items-center gap-2">
				<SidebarTrigger className="-ml-1" />
				<Separator
					orientation="vertical"
					className="mr-2 data-[orientation=vertical]:h-4"
				/>
				<Breadcrumb className="min-w-0">
					<BreadcrumbList>
						<BreadcrumbItem>
							{crumbs.length === 0 ? (
								<BreadcrumbPage>Forside</BreadcrumbPage>
							) : (
								<BreadcrumbLink render={<Link href="/" />}>Forside</BreadcrumbLink>
							)}
						</BreadcrumbItem>
						{crumbs.map((crumb) => (
							<Fragment key={crumb.href}>
								<BreadcrumbSeparator />
								<BreadcrumbItem>
									{crumb.isLast ? (
										<BreadcrumbPage>{crumb.label}</BreadcrumbPage>
									) : (
										<BreadcrumbLink render={<Link href={crumb.href} />}>
											{crumb.label}
										</BreadcrumbLink>
									)}
								</BreadcrumbItem>
							</Fragment>
						))}
					</BreadcrumbList>
				</Breadcrumb>
			</div>
			<div className="ml-auto w-full max-w-md">
				<Input
					type="search"
					list="employee-search-datalist"
					value={query}
					onChange={(event) => handleSearchInput(event.currentTarget.value)}
					onBlur={(event) => handleSearchInput(event.currentTarget.value)}
					placeholder="Søg medarbejder..."
					aria-label="Søg medarbejder"
					className="h-10"
				/>
				<datalist id="employee-search-datalist">
					{visibleResults.map((employee) => (
						<option key={employee.id} value={employee.name} />
					))}
				</datalist>
			</div>
		</header>
	);
}