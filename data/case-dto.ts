import "server-only";
import prisma from "@/config/prisma";
import { getCurrentSession } from "./session";
import { can } from "@/lib/utils";
import { EncryptedCaseEnvelopeV1 } from "@/types";
import { getIP } from "@/lib/ip";
import { logAuditEvent } from "./audit-log-dto";

export type EncryptedCaseForClient = {
  id: string;
  employeeId: string;
  createdAt: Date;
  envelope: EncryptedCaseEnvelopeV1;
  wrappedKey: { edk: string; wrapAlg: string; keyId: string } | null;
};

export type CreateEncryptedCaseDtoInput = {
  employeeId: string;
  envelope: EncryptedCaseEnvelopeV1;
  wrappedKey: {
    edk: string;
    keyId: string;
    wrapAlg: string;
  };
};

export type CreateEncryptedCaseDtoResult = {
  ok: boolean;
  reason?: string;
};

export async function getCasesForEmployee(employeeId: string): Promise<EncryptedCaseForClient[]> {
  const session = await getCurrentSession();
  if (!session) return [];
  if (!can(session.user, "employee:read")) return [];

  const deviceKeys = await prisma.userDeviceKey.findMany({
    where: { userId: session.user.id, status: "active" },
    select: { keyId: true },
  });
  const deviceKeyIds = deviceKeys.map((k) => k.keyId);

  const cases = await prisma.case.findMany({
    where: { employeeId },
    select: {
      id: true,
      employeeId: true,
      createdAt: true,
      payload: true,
      keyEnvelopes: {
        where: { recipientKeyId: { in: deviceKeyIds } },
        select: { edk: true, wrapAlg: true, recipientKeyId: true },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return cases.map((c) => ({
    id: c.id,
    employeeId: c.employeeId,
    createdAt: c.createdAt,
    envelope: c.payload as unknown as EncryptedCaseEnvelopeV1,
    wrappedKey: c.keyEnvelopes[0]
      ? {
        edk: c.keyEnvelopes[0].edk,
        wrapAlg: c.keyEnvelopes[0].wrapAlg,
        keyId: c.keyEnvelopes[0].recipientKeyId,
      }
      : null,
  }));
}

export async function createEncryptedCase(input: CreateEncryptedCaseDtoInput): Promise<CreateEncryptedCaseDtoResult> {
  const session = await getCurrentSession();
  if (!session) return { ok: false, reason: "Ingen aktiv session" };
  if (!can(session.user, "employee:create") && !can(session.user, "employee:update")) {
    return { ok: false, reason: "Mangler rettighed: employee:create" };
  }

  try {
    const created = await prisma.case.create({
      data: {
        employeeId: input.employeeId,
        keyVersion: input.envelope.keyVersion,
        payload: input.envelope,
        keyEnvelopes: {
          create: {
            recipientUserId: session.user.id,
            recipientKeyId: input.wrappedKey.keyId,
            wrapAlg: input.wrappedKey.wrapAlg,
            edk: input.wrappedKey.edk,
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

    console.error("createEncryptedCase failed", error);
    return { ok: false, reason: "Databasefejl ved oprettelse" };
  }
}

export type UpdateEncryptedCaseDtoInput = {
  caseId: string;
  envelope: EncryptedCaseEnvelopeV1;
  wrappedKey: {
    edk: string;
    keyId: string;
    wrapAlg: string;
  };
};

export async function updateEncryptedCase(input: UpdateEncryptedCaseDtoInput): Promise<CreateEncryptedCaseDtoResult> {
  const session = await getCurrentSession();
  if (!session) return { ok: false, reason: "Ingen aktiv session" };
  if (!can(session.user, "employee:update")) {
    return { ok: false, reason: "Mangler rettighed: employee:update" };
  }

  try {
    await prisma.$transaction([
      prisma.case.update({
        where: { id: input.caseId },
        data: {
          payload: input.envelope,
          keyVersion: input.envelope.keyVersion,
        },
      }),
      prisma.caseKeyEnvelope.upsert({
        where: {
          caseId_recipientKeyId: {
            caseId: input.caseId,
            recipientKeyId: input.wrappedKey.keyId,
          },
        },
        create: {
          caseId: input.caseId,
          recipientUserId: session.user.id,
          recipientKeyId: input.wrappedKey.keyId,
          wrapAlg: input.wrappedKey.wrapAlg,
          edk: input.wrappedKey.edk,
        },
        update: {
          edk: input.wrappedKey.edk,
          wrapAlg: input.wrappedKey.wrapAlg,
        },
      }),
    ]);

    await logAuditEvent({
      userId: session.user.id,
      sessionId: session.sessionId,
      ipAddress: await getIP(),
      action: "update",
      targetResourceId: input.caseId,
      success: true,
    });

    return { ok: true };
  } catch (error) {
    await logAuditEvent({
      userId: session.user.id,
      sessionId: session.sessionId,
      ipAddress: await getIP(),
      action: "update",
      targetResourceId: input.caseId,
      success: false,
    });

    console.error("updateEncryptedCase failed", error);
    return { ok: false, reason: "Databasefejl ved opdatering" };
  }
}
