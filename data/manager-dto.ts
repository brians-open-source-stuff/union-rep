import prisma from "@/config/prisma";
import { getCurrentSession } from "./session";
import { can } from "@/lib/utils";
import { logAuditEvent } from "./audit-log-dto";
import { getIP } from "@/lib/ip";
import "server-only";

export type ManagerSummary = {
  id: string;
  name: string;
  title: string;
  chiefId: string | null;
  departments: {
    id: string;
    name: string;
  }[];
};

export type ManagerListItem = {
  id: string;
  name: string;
  title: string;
  chiefId: string | null;
  chiefName: string | null;
  departments: { id: string; name: string }[];
};

export type ManagerMutationResult = {
  ok: boolean;
  reason?: string;
  managerId?: string;
};

export type CreateManagerInput = {
  name: string;
  title: string;
  chiefId?: string;
  departmentIds: string[];
};

export type UpdateManagerInput = {
  managerId: string;
  name: string;
  title: string;
  chiefId?: string;
  departmentIds: string[];
};

export async function getManagers(): Promise<ManagerSummary[]> {
  return prisma.manager.findMany({
    select: {
      id: true,
      name: true,
      title: true,
      chiefId: true,
      departments: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export async function getManagersWithAuth(): Promise<ManagerListItem[]> {
  const currentSession = await getCurrentSession();
  if (!currentSession) return [];

  const { sessionId, user } = currentSession;
  if (!can(user, "manager:read")) return [];

  try {
    const managers = await prisma.manager.findMany({
      select: {
        id: true,
        name: true,
        title: true,
        chiefId: true,
        chief: {
          select: { name: true },
        },
        departments: {
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    await logAuditEvent({
      userId: user.id,
      sessionId,
      ipAddress: await getIP(),
      action: "read",
      targetResourceId: "manager:list",
      success: true,
    });

    return managers.map((m) => ({
      id: m.id,
      name: m.name,
      title: m.title,
      chiefId: m.chiefId,
      chiefName: m.chief?.name ?? null,
      departments: m.departments,
    }));
  } catch {
    await logAuditEvent({
      userId: user.id,
      sessionId,
      ipAddress: await getIP(),
      action: "read",
      targetResourceId: "manager:list",
      success: false,
    });

    return [];
  }
}

export async function createManager(input: CreateManagerInput): Promise<ManagerMutationResult> {
  const currentSession = await getCurrentSession();
  if (!currentSession) return { ok: false, reason: "Ingen aktiv session" };

  const { sessionId, user } = currentSession;
  if (!can(user, "manager:create")) {
    return { ok: false, reason: "Mangler rettighed: manager:create" };
  }

  try {
    const manager = await prisma.manager.create({
      data: {
        name: input.name,
        title: input.title,
        chiefId: input.chiefId ?? null,
        departments: {
          connect: input.departmentIds.map((id) => ({ id })),
        },
      },
      select: { id: true },
    });

    await logAuditEvent({
      userId: user.id,
      sessionId,
      ipAddress: await getIP(),
      action: "create",
      targetResourceId: manager.id,
      success: true,
    });

    return { ok: true, managerId: manager.id };
  } catch {
    await logAuditEvent({
      userId: user.id,
      sessionId,
      ipAddress: await getIP(),
      action: "create",
      targetResourceId: "manager:create",
      success: false,
    });

    return { ok: false, reason: "Kunne ikke oprette lederen" };
  }
}

export async function updateManager(input: UpdateManagerInput): Promise<ManagerMutationResult> {
  const currentSession = await getCurrentSession();
  if (!currentSession) return { ok: false, reason: "Ingen aktiv session" };

  const { sessionId, user } = currentSession;
  if (!can(user, "manager:update")) {
    return { ok: false, reason: "Mangler rettighed: manager:update" };
  }

  try {
    const existing = await prisma.manager.findUnique({
      where: { id: input.managerId },
      select: { id: true },
    });

    if (!existing) {
      return { ok: false, reason: "Lederen findes ikke" };
    }

    if (input.chiefId === input.managerId) {
      return { ok: false, reason: "En leder kan ikke være sin egen chefsleder" };
    }

    await prisma.manager.update({
      where: { id: input.managerId },
      data: {
        name: input.name,
        title: input.title,
        chiefId: input.chiefId ?? null,
        departments: {
          set: input.departmentIds.map((id) => ({ id })),
        },
      },
    });

    await logAuditEvent({
      userId: user.id,
      sessionId,
      ipAddress: await getIP(),
      action: "update",
      targetResourceId: input.managerId,
      success: true,
    });

    return { ok: true, managerId: input.managerId };
  } catch {
    await logAuditEvent({
      userId: user.id,
      sessionId,
      ipAddress: await getIP(),
      action: "update",
      targetResourceId: input.managerId,
      success: false,
    });

    return { ok: false, reason: "Kunne ikke opdatere lederen" };
  }
}

export async function deleteManager(managerId: string): Promise<ManagerMutationResult> {
  const currentSession = await getCurrentSession();
  if (!currentSession) return { ok: false, reason: "Ingen aktiv session" };

  const { sessionId, user } = currentSession;
  if (!can(user, "manager:delete")) {
    return { ok: false, reason: "Mangler rettighed: manager:delete" };
  }

  try {
    const existing = await prisma.manager.findUnique({
      where: { id: managerId },
      select: { id: true },
    });

    if (!existing) {
      return { ok: false, reason: "Lederen findes ikke" };
    }

    await prisma.manager.delete({
      where: { id: managerId },
    });

    await logAuditEvent({
      userId: user.id,
      sessionId,
      ipAddress: await getIP(),
      action: "delete",
      targetResourceId: managerId,
      success: true,
    });

    return { ok: true, managerId };
  } catch {
    await logAuditEvent({
      userId: user.id,
      sessionId,
      ipAddress: await getIP(),
      action: "delete",
      targetResourceId: managerId,
      success: false,
    });

    return { ok: false, reason: "Kunne ikke slette lederen" };
  }
}