import "server-only";
import prisma from "@/config/prisma";
import redis from "@/config/redis";
import { logAuditEvent } from "@/data/audit-log-dto";
import { getIP } from "@/lib/ip";
import { PERMISSIONS, PermissionSchema } from "@/types";
import { getCurrentSession } from "./session";
import { can } from "@/lib/utils";

export type UserListItem = {
	id: string;
	name: string;
	roles: string[];
	roleIds: string[];
	departments: string[];
	departmentIds: string[];
};

export type UserDepartmentOption = {
	id: string;
	name: string;
};

export type UserRoleOption = {
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
					id: true,
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
		roleIds: user.roles.map((role) => role.id).sort((a, b) => a.localeCompare(b, "da")),
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

export async function getUserRoleOptions(): Promise<UserRoleOption[]> {
	const session = await getCurrentSession();
	if (!session) return [];

	if (!can(session.user, "user:update")) return [];

	const roles = await prisma.role.findMany({
		select: {
			id: true,
			name: true,
		},
		orderBy: {
			name: "asc",
		},
	});

	return roles;
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

export type UpdateCurrentUserInput = {
	name: string;
	currentPassword?: string;
	newPassword?: string;
	confirmPassword?: string;
};

export type UpdateCurrentUserResult = {
	ok: boolean;
	reason?: string;
};

export async function updateCurrentUserProfile(input: UpdateCurrentUserInput): Promise<UpdateCurrentUserResult> {
	const currentSession = await getCurrentSession();
	if (!currentSession) return { ok: false, reason: "Ingen aktiv session" };

	const user = await prisma.user.findUnique({
		where: { id: currentSession.user.id },
	});

	if (!user) return { ok: false, reason: "Bruger ikke fundet" };

	const name = input.name.trim();
	if (!name) return { ok: false, reason: "Navn må ikke være tomt" };

	const currentPassword = input.currentPassword?.trim() ?? "";
	const newPassword = input.newPassword?.trim() ?? "";
	const confirmPassword = input.confirmPassword?.trim() ?? "";
	const wantsPasswordChange = Boolean(currentPassword || newPassword || confirmPassword);

	if (wantsPasswordChange) {
		if (!currentPassword || !newPassword || !confirmPassword) {
			return { ok: false, reason: "Udfyld nuværende adgangskode, nyt password og bekræftelse" };
		}

		if (newPassword.length < 8) {
			return { ok: false, reason: "Nyt password skal være mindst 8 tegn" };
		}

		if (newPassword !== confirmPassword) {
			return { ok: false, reason: "Passwords matcher ikke" };
		}

		const isValidPassword = await user.validate(currentPassword);
		if (!isValidPassword) {
			return { ok: false, reason: "Nuværende adgangskode er forkert" };
		}
	}

	try {
		await prisma.user.update({
			where: { id: user.id },
			data: {
				name,
				...(wantsPasswordChange ? { password: newPassword, needsPasswordChange: false } : {}),
			},
		});

		await redis.set(
			currentSession.sessionId,
			JSON.stringify({
				...currentSession.user,
				name,
				...(wantsPasswordChange ? { needsPasswordChange: false } : {}),
			}),
			{ EX: 60 * 60 * 24 },
		);

		await logAuditEvent({
			userId: user.id,
			sessionId: currentSession.sessionId,
			ipAddress: await getIP(),
			action: "update",
			targetResourceId: user.id,
			success: true,
		});

		return { ok: true };
	} catch (error) {
		await logAuditEvent({
			userId: user.id,
			sessionId: currentSession.sessionId,
			ipAddress: await getIP(),
			action: "update",
			targetResourceId: user.id,
			success: false,
		});
		console.error(error);
		return { ok: false, reason: "Kunne ikke opdatere profilen" };
	}
}