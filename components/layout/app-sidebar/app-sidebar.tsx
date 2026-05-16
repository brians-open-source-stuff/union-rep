"use client";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenuButton, SidebarMenuItem, SidebarRail } from "@/components/ui/sidebar";
import { SessionUser } from "@/types";
import Link from "next/link";
import { FiBookOpen, FiCoffee, FiSettings, FiUmbrella, FiUsers } from "react-icons/fi"

type SessionPermission = SessionUser["permissions"][number];

type NavSubItem = {
	title: string;
	url: string;
	requiresPermissions?: SessionPermission[];
};

type NavSection = {
	title: string;
	url: string;
	icon: React.ReactNode;
	items?: NavSubItem[];
};

const navItemsConfig: NavSection[] = [
	{
		title: "Medarbejdere",
		url: "/employees",
		icon: <FiUsers />,
		items: [
			{ title: "Vis medarbejdere", url: "/employees", requiresPermissions: ["employee:read"] },
			{ title: "Ny medarbejder", url: "/employees/new", requiresPermissions: ["employee:create"] },
		]
	},
	{
		title: "Indstillinger",
		url: "/settings",
		icon: <FiSettings />,
		items: [
			{ title: "Roller", url: "/settings/roles", requiresPermissions: ["role:read"] },
			{ title: "Brugere", url: "/settings/users", requiresPermissions: ["user:read"] },
			{ title: "Ledere", url: "/settings/managers", requiresPermissions: ["manager:read"] },
			{ title: "Afdelinger", url: "/settings/departments", requiresPermissions: ["department:read"] },
			{ title: "Sessioner", url: "/settings/sessions", requiresPermissions: ["session:read"] },
			{ title: "Nøgler", url: "/settings/keys", requiresPermissions: ["key:read"] },
		],
	},
	{
		title: "Dokumentation",
		url: "/docs",
		icon: <FiBookOpen />,
		items: [
			{ title: "Introduktion", url: "/docs/intro" },
		],
	},
];

export function AppSidebar({ user, ...props }: React.ComponentProps<typeof Sidebar> & { user?: SessionUser | null }) {
	const visibleItems = navItemsConfig
		.map(section => ({
			...section,
			items: section.items?.filter(item => {
				if (!item.requiresPermissions?.length) return true;
				if (!user) return false;
				return item.requiresPermissions!.every(rp => user.permissions.includes(rp));
			}),
		}))
		.filter(section => !section.items || section.items.length > 0);

	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarHeader>
				<SidebarMenuItem>
					<SidebarMenuButton render={<Link href="/" />}>
						<FiUmbrella /> Union Rep
					</SidebarMenuButton>
				</SidebarMenuItem>
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={visibleItems} />
			</SidebarContent>
			<SidebarFooter>
				{user ? <NavUser user={{ name: user.name, email: "", avatar: "" }} /> : null}
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}