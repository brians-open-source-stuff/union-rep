import prisma from "@/config/prisma";
import { headers } from "next/headers";
import "server-only";

export async function getRoles() {
	const h = await headers();
	const forwardedFor = h.get("x-forwarded-for");
	const realIp = h.get("x-real-ip")
	const ip_address = forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";

	console.log(ip_address);

	const roles = await prisma.role.findMany({
		include: {
			permissions: true
		}
	});
	return roles;
}

export async function createRole(role: string) {
	const newRole = await prisma.role.create({
		data: {
			name: role
		}
	});
	return newRole;
}