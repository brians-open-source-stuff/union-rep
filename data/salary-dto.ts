import "server-only";
import prisma from "@/config/prisma";
import { getCurrentSession } from "./session";
import { can } from "@/lib/utils";
import { EncryptedSalaryEnvelopeV1, EncryptedSalaryForClient } from "@/types";
import { getIP } from "@/lib/ip";
import { logAuditEvent } from "./audit-log-dto";

export type CreateEncryptedSalaryDtoInput = {
  employeeId: string;
  year: number;
  envelope: EncryptedSalaryEnvelopeV1;
  wrappedKeys: Array<{
    userId: string;
    edk: string;
    keyId: string;
    wrapAlg: string;
  }>;
};

export type CreateEncryptedSalaryDtoResult = {
  ok: boolean;
  reason?: string;
};

export async function getSalariesForEmployee(employeeId: string): Promise<EncryptedSalaryForClient[]> {
  const session = await getCurrentSession();
  if (!session) return [];
  if (!can(session.user, "employee:read")) return [];

  try {
    const deviceKeys = await prisma.userDeviceKey.findMany({
      where: { userId: session.user.id, status: "active" },
      select: { keyId: true },
    });
    const deviceKeyIds = deviceKeys.map((k) => k.keyId);

    const salaries = await prisma.salary.findMany({
      where: { employeeId },
      select: {
        id: true,
        employeeId: true,
        year: true,
        createdAt: true,
        payload: true,
        keyEnvelopes: {
          where: { recipientKeyId: { in: deviceKeyIds } },
          select: { edk: true, wrapAlg: true, recipientKeyId: true },
          take: 1,
        },
      },
      orderBy: { year: "desc" },
    });

    await logAuditEvent({
      userId: session.user.id,
      sessionId: session.sessionId,
      ipAddress: await getIP(),
      action: "read",
      targetResourceId: employeeId,
      success: true,
    });

    return salaries.map((s) => ({
      id: s.id,
      employeeId: s.employeeId,
      year: s.year,
      createdAt: s.createdAt,
      envelope: s.payload as unknown as EncryptedSalaryEnvelopeV1,
      wrappedKey: s.keyEnvelopes[0]
        ? {
          edk: s.keyEnvelopes[0].edk,
          wrapAlg: s.keyEnvelopes[0].wrapAlg,
          keyId: s.keyEnvelopes[0].recipientKeyId,
        }
        : null,
    }));
  } catch (error) {
    await logAuditEvent({
      userId: session.user.id,
      sessionId: session.sessionId,
      ipAddress: await getIP(),
      action: "read",
      targetResourceId: employeeId,
      success: false,
    });

    console.error("getSalariesForEmployee failed", error);
    return [];
  }
}

export async function createEncryptedSalary(input: CreateEncryptedSalaryDtoInput): Promise<CreateEncryptedSalaryDtoResult> {
  const session = await getCurrentSession();
  if (!session) return { ok: false, reason: "Ingen aktiv session" };
  if (!can(session.user, "employee:create") && !can(session.user, "employee:update")) {
    return { ok: false, reason: "Mangler rettighed: employee:create eller employee:update" };
  }

  if (input.wrappedKeys.length === 0) {
    return { ok: false, reason: "Ingen modtagernøgler modtaget" };
  }

  try {
    const created = await prisma.salary.create({
      data: {
        employeeId: input.employeeId,
        year: input.year,
        keyVersion: input.envelope.keyVersion,
        payload: input.envelope,
        keyEnvelopes: {
          createMany: {
            data: input.wrappedKeys.map((wrappedKey) => ({
              recipientUserId: wrappedKey.userId,
              recipientKeyId: wrappedKey.keyId,
              wrapAlg: wrappedKey.wrapAlg,
              edk: wrappedKey.edk,
            })),
            skipDuplicates: true,
          },
        },
      },
      select: { id: true },
    });

    await logAuditEvent({
      userId: session.user.id,
      sessionId: session.sessionId,
      ipAddress: await getIP(),
      action: "create",
      targetResourceId: created.id,
      success: true,
    });

    return { ok: true };
  } catch (error) {
    await logAuditEvent({
      userId: session.user.id,
      sessionId: session.sessionId,
      ipAddress: await getIP(),
      action: "create",
      targetResourceId: input.employeeId,
      success: false,
    });

    console.error("createEncryptedSalary failed", error);
    return { ok: false, reason: "Databasefejl ved oprettelse" };
  }
}

export type UpdateEncryptedSalaryDtoInput = {
  salaryId: string;
  envelope: EncryptedSalaryEnvelopeV1;
  wrappedKeys: Array<{
    userId: string;
    edk: string;
    keyId: string;
    wrapAlg: string;
  }>;
};

export async function updateEncryptedSalary(input: UpdateEncryptedSalaryDtoInput): Promise<CreateEncryptedSalaryDtoResult> {
  const session = await getCurrentSession();
  if (!session) return { ok: false, reason: "Ingen aktiv session" };
  if (!can(session.user, "employee:update")) {
    return { ok: false, reason: "Mangler rettighed: employee:update" };
  }

  if (input.wrappedKeys.length === 0) {
    return { ok: false, reason: "Ingen modtagernøgler modtaget" };
  }

  try {
    await prisma.salary.update({
      where: { id: input.salaryId },
      data: {
        payload: input.envelope,
        keyEnvelopes: {
          deleteMany: {},
          createMany: {
            data: input.wrappedKeys.map((wrappedKey) => ({
              recipientUserId: wrappedKey.userId,
              recipientKeyId: wrappedKey.keyId,
              wrapAlg: wrappedKey.wrapAlg,
              edk: wrappedKey.edk,
            })),
            skipDuplicates: true,
          },
        },
      },
      select: { id: true },
    });

    await logAuditEvent({
      userId: session.user.id,
      sessionId: session.sessionId,
      ipAddress: await getIP(),
      action: "update",
      targetResourceId: input.salaryId,
      success: true,
    });

    return { ok: true };
  } catch (error) {
    await logAuditEvent({
      userId: session.user.id,
      sessionId: session.sessionId,
      ipAddress: await getIP(),
      action: "update",
      targetResourceId: input.salaryId,
      success: false,
    });

    console.error("updateEncryptedSalary failed", error);
    return { ok: false, reason: "Databasefejl ved opdatering" };
  }
}
