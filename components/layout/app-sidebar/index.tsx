import { getSession } from "@/data/session";
import { cookies } from "next/headers";
import { AppSidebar } from "./app-sidebar";

export async function AppSidebarServer() {
	const sessionId = (await cookies()).get("ur_session")?.value;
	let user = null;

	if (sessionId) {
		user = await getSession(sessionId);
	}

	return <AppSidebar user={user} />;
}