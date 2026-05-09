import "server-only";
import prisma from "@/config/prisma";
import { Permission } from "@/types";
import { getCurrentSession } from "./session";

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
				sessions: true,
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

export async function getCurrentUser() {
	try {
		const { sessionId, user: sessionUser } = await getCurrentSession();
		if (!sessionId) return null;

		const user = await prisma.user.findUnique({
			where: {
				id: sessionUser.id,
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
				sessions: true,
			},
		});

		if (!user) return null;

		return {
			...user,
			roles: user.roles.map(role => role.name),
			permissions: [...new Set(user.roles.flatMap(role => role.permissions.map(permission => permission.name)))] as Permission[]
		}
	} catch (error) {
		console.error(error);
		return null;
	}
}