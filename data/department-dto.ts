import prisma from "@/config/prisma";
import { getCurrentSession } from "./session";
import { can } from "@/lib/utils";
import { logAuditEvent } from "./audit-log-dto";
import { getIP } from "@/lib/ip";
import "server-only";

export type DepartmentListItem = {
  id: string;
  name: string;
  streetaddress1: string;
  streetaddress2: string | null;
  zipcode: number;
  city: string;
};

export type DepartmentMutationResult = {
  ok: boolean;
  reason?: string;
  departmentId?: string;
};

export type CreateDepartmentInput = {
  name: string;
  streetaddress1: string;
  streetaddress2?: string;
  zipcode: number;
  city: string;
};

export type UpdateDepartmentInput = {
  departmentId: string;
  name: string;
  streetaddress1: string;
  streetaddress2?: string;
  zipcode: number;
  city: string;
};

export async function getDepartments(): Promise<DepartmentListItem[]> {
  const currentSession = await getCurrentSession();
  if (!currentSession) return [];

  const { sessionId, user } = currentSession;
  if (!can(user, "department:read")) return [];

  try {
    const departments = await prisma.department.findMany({
      select: {
        id: true,
        name: true,
        streetaddress1: true,
        streetaddress2: true,
        zipcode: true,
        city: true,
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
      targetResourceId: "department:list",
      success: true,
    });

    return departments;
  } catch {
    await logAuditEvent({
      userId: user.id,
      sessionId,
      ipAddress: await getIP(),
      action: "read",
      targetResourceId: "department:list",
      success: false,
    });

    return [];
  }
}

export async function getDepartmentOptions(): Promise<{ id: string; name: string }[]> {
  const currentSession = await getCurrentSession();
  if (!currentSession) return [];

  const { user } = currentSession;
  if (!can(user, "department:read")) return [];

  return prisma.department.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function createDepartment(input: CreateDepartmentInput): Promise<DepartmentMutationResult> {
  const currentSession = await getCurrentSession();
  if (!currentSession) return { ok: false, reason: "Ingen aktiv session" };

  const { sessionId, user } = currentSession;
  if (!can(user, "department:create")) {
    return { ok: false, reason: "Mangler rettighed: department:create" };
  }

  try {
    const department = await prisma.department.create({
      data: {
        name: input.name,
        streetaddress1: input.streetaddress1,
        streetaddress2: input.streetaddress2 ?? null,
        zipcode: input.zipcode,
        city: input.city,
      },
      select: { id: true },
    });

    await logAuditEvent({
      userId: user.id,
      sessionId,
      ipAddress: await getIP(),
      action: "create",
      targetResourceId: department.id,
      success: true,
    });

    return { ok: true, departmentId: department.id };
  } catch {
    await logAuditEvent({
      userId: user.id,
      sessionId,
      ipAddress: await getIP(),
      action: "create",
      targetResourceId: "department:create",
      success: false,
    });

    return { ok: false, reason: "Kunne ikke oprette afdelingen" };
  }
}

export async function updateDepartment(input: UpdateDepartmentInput): Promise<DepartmentMutationResult> {
  const currentSession = await getCurrentSession();
  if (!currentSession) return { ok: false, reason: "Ingen aktiv session" };

  const { sessionId, user } = currentSession;
  if (!can(user, "department:update")) {
    return { ok: false, reason: "Mangler rettighed: department:update" };
  }

  try {
    const existing = await prisma.department.findUnique({
      where: { id: input.departmentId },
      select: { id: true },
    });

    if (!existing) {
      return { ok: false, reason: "Afdelingen findes ikke" };
    }

    await prisma.department.update({
      where: { id: input.departmentId },
      data: {
        name: input.name,
        streetaddress1: input.streetaddress1,
        streetaddress2: input.streetaddress2 ?? null,
        zipcode: input.zipcode,
        city: input.city,
      },
    });

    await logAuditEvent({
      userId: user.id,
      sessionId,
      ipAddress: await getIP(),
      action: "update",
      targetResourceId: input.departmentId,
      success: true,
    });

    return { ok: true, departmentId: input.departmentId };
  } catch {
    await logAuditEvent({
      userId: user.id,
      sessionId,
      ipAddress: await getIP(),
      action: "update",
      targetResourceId: input.departmentId,
      success: false,
    });

    return { ok: false, reason: "Kunne ikke opdatere afdelingen" };
  }
}

export async function deleteDepartment(departmentId: string): Promise<DepartmentMutationResult> {
  const currentSession = await getCurrentSession();
  if (!currentSession) return { ok: false, reason: "Ingen aktiv session" };

  const { sessionId, user } = currentSession;
  if (!can(user, "department:delete")) {
    return { ok: false, reason: "Mangler rettighed: department:delete" };
  }

  try {
    const existing = await prisma.department.findUnique({
      where: { id: departmentId },
      select: { id: true },
    });

    if (!existing) {
      return { ok: false, reason: "Afdelingen findes ikke" };
    }

    await prisma.department.delete({
      where: { id: departmentId },
    });

    await logAuditEvent({
      userId: user.id,
      sessionId,
      ipAddress: await getIP(),
      action: "delete",
      targetResourceId: departmentId,
      success: true,
    });

    return { ok: true, departmentId };
  } catch {
    await logAuditEvent({
      userId: user.id,
      sessionId,
      ipAddress: await getIP(),
      action: "delete",
      targetResourceId: departmentId,
      success: false,
    });

    return { ok: false, reason: "Kunne ikke slette afdelingen" };
  }
}
