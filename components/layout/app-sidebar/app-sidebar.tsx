"use client";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenuButton, SidebarMenuItem, SidebarRail } from "@/components/ui/sidebar";
import { SessionUser } from "@/types";
import Link from "next/link";
import { FiBookOpen, FiCoffee, FiSettings, FiUmbrella, FiUsers } from "react-icons/fi"

const navItemsConfig = [
	{
		title: "Medarbejdere",
		url: "/employees",
		icon: <FiUsers />,
		items: [
			{ title: "Vis medarbejdere", url: "/employees", requiresPermissions: ["employee:read"] },
			{ title: "Ny medarbejder", url: "/employee/new", requiresPermissions: ["employee:create"] },
		]
	},
	{
		title: "Indstillinger",
		url: "/settings",
		icon: <FiSettings />,
		items: [
			{ title: "Administrer roller", url: "/settings/roles", requiresPermissions: ["role:read"] },
			{ title: "Administrer brugere", url: "/settings/users", requiresPermissions: ["user:read"] },
			{ title: "Administrer ledere", url: "/settings/managers", requiresPermissions: ["manager:read"] },
			{ title: "Administrer afdelinger", url: "/settings/departments", requiresPermissions: ["department:read"] },
		],
	},
	{
		title: "Test",
		url: "/Test",
		icon: <FiCoffee />,
		items: [
			{ title: "Test thing A", url: "/settings/roles", requiresPermissions: ["role:read", "something:something"] },
			{ title: "Test thing B", url: "/settings/users", requiresPermissions: ["user:manage"] },
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

export function AppSidebar({ user, ...props }: React.ComponentProps<SessionUser, typeof Sidebar>) {
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
				<NavUser user={user} />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}