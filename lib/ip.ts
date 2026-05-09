import "server-only";
import { headers } from "next/headers";

export async function getIP() {
	const h = await headers();
	const forwardedFor = h.get("x-forwarded-for");
	const realIp = h.get("x-real-ip")
	return forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";
}
