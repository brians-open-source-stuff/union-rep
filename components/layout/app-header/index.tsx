"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

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
	const segments = pathname.split("/").filter(Boolean);
	const crumbs = segments.map((segment, index) => ({
		label: formatSegment(segment),
		href: `/${segments.slice(0, index + 1).join("/")}`,
		isLast: index === segments.length - 1,
	}));

	return (
		<header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
			<div className="flex items-center gap-2 px-4">
				<SidebarTrigger className="-ml-1" />
				<Separator
					orientation="vertical"
					className="mr-2 data-[orientation=vertical]:h-4"
				/>
				<Breadcrumb>
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
		</header>
	);
}