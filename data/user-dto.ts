import "server-only";
import prisma from "@/config/prisma";
import { PERMISSIONS, PermissionSchema } from "@/types";
import { getCurrentSession } from "./session";
import { can } from "@/lib/utils";

export type UserListItem = {
	id: string;
	name: string;
	roles: string[];
	departments: string[];
	departmentIds: string[];
};

export type UserDepartmentOption = {
	id: string;
	name: string;
};

export async function getUsers(): Promise<UserListItem[]> {
	const session = await getCurrentSession();
	if (!session) return [];

	if (!can(session.user, "user:read")) return [];

	const users = await prisma.user.findMany({
		select: {
			id: true,
			name: true,
			roles: {
				select: {
					name: true,
				},
			},
			managerAccess: {
				select: {
					manager: {
						select: {
							departments: {
								select: {
									id: true,
									name: true,
								},
							},
						},
					},
				},
			},
		},
		orderBy: {
			name: "asc",
		},
	});

	return users.map((user) => ({
		id: user.id,
		name: user.name,
		roles: user.roles.map((role) => role.name).sort((a, b) => a.localeCompare(b, "da")),
		departments: [
			...new Set(
				user.managerAccess
					.flatMap((access) => access.manager.departments)
					.map((department) => department.name),
			),
		].sort((a, b) => a.localeCompare(b, "da")),
		departmentIds: [...new Set(
			user.managerAccess
				.flatMap((access) => access.manager.departments)
				.map((department) => department.id),
		)].sort((a, b) => a.localeCompare(b, "da")),
	}));
}

export async function getUserDepartmentOptions(): Promise<UserDepartmentOption[]> {
	const session = await getCurrentSession();
	if (!session) return [];

	if (!can(session.user, "user:update")) return [];

	const departments = await prisma.department.findMany({
		select: {
			id: true,
			name: true,
		},
		orderBy: {
			name: "asc",
		},
	});

	return departments;
}

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
			permissions: [...new Set(user.roles.flatMap(role => role.permissions.map(p => p.name)))]
				.filter((p): p is typeof PERMISSIONS[number] => PermissionSchema.safeParse(p).success),
		}
	} catch {

	}
}

export async function getCurrentUser() {
	try {
		const currentSession = await getCurrentSession();
		if (!currentSession) return null;

		const { user: sessionUser } = currentSession;

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
			permissions: [...new Set(user.roles.flatMap(role => role.permissions.map(p => p.name)))]
				.filter((p): p is typeof PERMISSIONS[number] => PermissionSchema.safeParse(p).success),
		}
	} catch (error) {
		console.error(error);
		return null;
	}
}