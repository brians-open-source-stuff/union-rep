import prisma from "@/config/prisma";
import { getCurrentSession } from "./session";
import { can } from "@/lib/utils";
import { logAuditEvent } from "./audit-log-dto";
import { getIP } from "@/lib/ip";
import "server-only";

export type RoleListItem = {
	id: string;
	name: string;
	permissions: { id: string; name: string }[];
};

export type RolePermissionOption = {
	id: string;
	name: string;
};

export type RoleMutationResult = {
	ok: boolean;
	reason?: string;
	roleId?: string;
};

export async function getRoles() {
	const currentSession = await getCurrentSession();
	if (!currentSession) return [];

	const { sessionId, user } = currentSession;
	if (!can(user, "role:read")) return [];

	try {
		const roles = await prisma.role.findMany({
			select: {
				id: true,
				name: true,
				permissions: {
					select: {
						id: true,
						name: true,
					},
					orderBy: {
						name: "asc",
					},
				},
			},
			orderBy: {
				name: "asc",
			},
		});

		await logAuditEvent({
			userId: user.id,
			sessionId,
			ipAddress: await getIP(),
			action: "read",
			targetResourceId: "role:list",
			success: true,
		});

		return roles;
	} catch {
		await logAuditEvent({
			userId: user.id,
			sessionId,
			ipAddress: await getIP(),
			action: "read",
			targetResourceId: "role:list",
			success: false,
		});

		return [];
	}
}

export async function getRolePermissionOptions(): Promise<RolePermissionOption[]> {
	const currentSession = await getCurrentSession();
	if (!currentSession) return [];

	const { user } = currentSession;
	if (!can(user, "permission:read")) return [];

	return prisma.permission.findMany({
		select: {
			id: true,
			name: true,
		},
		orderBy: {
			name: "asc",
		},
	});
}

export async function createRole(input: { name: string; permissionIds: string[] }): Promise<RoleMutationResult> {
	const currentSession = await getCurrentSession();
	if (!currentSession) return { ok: false, reason: "Ingen aktiv session" };

	const { sessionId, user } = currentSession;
	if (!can(user, "role:create")) {
		return { ok: false, reason: "Mangler rettighed: role:create" };
	}

	const uniquePermissionIds = [...new Set(input.permissionIds)];

	try {
		const role = await prisma.role.create({
			data: {
				name: input.name,
				permissions: {
					connect: uniquePermissionIds.map((id) => ({ id })),
				},
			},
			select: {
				id: true,
			},
		});

		await logAuditEvent({
			userId: user.id,
			sessionId,
			ipAddress: await getIP(),
			action: "create",
			targetResourceId: role.id,
			success: true,
		});

		return { ok: true, roleId: role.id };
	} catch {
		await logAuditEvent({
			userId: user.id,
			sessionId,
			ipAddress: await getIP(),
			action: "create",
			targetResourceId: "role:create",
			success: false,
		});

		return { ok: false, reason: "Kunne ikke oprette rollen" };
	}
}

export async function updateRole(input: { roleId: string; name: string; permissionIds: string[] }): Promise<RoleMutationResult> {
	const currentSession = await getCurrentSession();
	if (!currentSession) return { ok: false, reason: "Ingen aktiv session" };

	const { sessionId, user } = currentSession;
	if (!can(user, "role:update")) {
		return { ok: false, reason: "Mangler rettighed: role:update" };
	}

	const uniquePermissionIds = [...new Set(input.permissionIds)];

	try {
		const existingRole = await prisma.role.findUnique({
			where: {
				id: input.roleId,
			},
			select: {
				name: true,
			},
		});

		if (!existingRole) {
			return { ok: false, reason: "Rollen findes ikke" };
		}

		if (existingRole.name === "admin") {
			return { ok: false, reason: "Admin-rollen kan ikke redigeres" };
		}

		await prisma.role.update({
			where: {
				id: input.roleId,
			},
			data: {
				name: input.name,
				permissions: {
					set: uniquePermissionIds.map((id) => ({ id })),
				},
			},
			select: {
				id: true,
			},
		});

		await logAuditEvent({
			userId: user.id,
			sessionId,
			ipAddress: await getIP(),
			action: "update",
			targetResourceId: input.roleId,
			success: true,
		});

		return { ok: true, roleId: input.roleId };
	} catch {
		await logAuditEvent({
			userId: user.id,
			sessionId,
			ipAddress: await getIP(),
			action: "update",
			targetResourceId: input.roleId,
			success: false,
		});

		return { ok: false, reason: "Kunne ikke opdatere rollen" };
	}
}

export async function deleteRole(roleId: string): Promise<RoleMutationResult> {
	const currentSession = await getCurrentSession();
	if (!currentSession) return { ok: false, reason: "Ingen aktiv session" };

	const { sessionId, user } = currentSession;
	if (!can(user, "role:delete")) {
		return { ok: false, reason: "Mangler rettighed: role:delete" };
	}

	try {
		const existingRole = await prisma.role.findUnique({
			where: {
				id: roleId,
			},
			select: {
				name: true,
			},
		});

		if (!existingRole) {
			return { ok: false, reason: "Rollen findes ikke" };
		}

		if (existingRole.name === "admin") {
			return { ok: false, reason: "Admin-rollen kan ikke slettes" };
		}

		await prisma.role.delete({
			where: {
				id: roleId,
			},
			select: {
				id: true,
			},
		});

		await logAuditEvent({
			userId: user.id,
			sessionId,
			ipAddress: await getIP(),
			action: "delete",
			targetResourceId: roleId,
			success: true,
		});

		return { ok: true, roleId };
	} catch {
		await logAuditEvent({
			userId: user.id,
			sessionId,
			ipAddress: await getIP(),
			action: "delete",
			targetResourceId: roleId,
			success: false,
		});

		return { ok: false, reason: "Kunne ikke slette rollen" };
	}
}