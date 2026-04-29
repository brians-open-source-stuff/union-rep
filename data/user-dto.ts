import prisma from "@/config/prisma";
import { Permission } from "@/types";
import "server-only";

export async function getUser(email: string) {
	try {
		const user = await prisma.user.findUnique({
			where: {
				email,
			},
			omit: {
				password: true,
				email: true,
			},
			include: {
				roles: {
					include: {
						permissions: true,
					},
				},
			},
		});

		if (!user) return null;

		return {
			...user,
			roles: user.roles.map(role => role.name),
			permissions: [...new Set(user.roles.flatMap(role => role.permissions.map(permission => permission.name)))] as Permission[]
		}
	} catch (error) {

	}
}