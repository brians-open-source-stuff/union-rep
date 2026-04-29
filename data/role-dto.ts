import prisma from "@/config/prisma";
import "server-only";

export async function getRoles() {
	const roles = await prisma.role.findMany();
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