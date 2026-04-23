"use client";

import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarHeader>
				<h2>Dims</h2>
			</SidebarHeader>
			<SidebarContent>
				noget
			</SidebarContent>
			<SidebarFooter>
				noget andet
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	)
}