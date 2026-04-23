import AppHeader from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<AppHeader />
				<main className="p-4 pt-0">
					{children}
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}