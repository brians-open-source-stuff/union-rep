import "server-only";
import prisma from "@/config/prisma";

/**
 * Check if there are any new device keys that don't have key envelopes yet
 */
export async function detectNewDeviceKeys(): Promise<boolean> {
  const activeKeys = await prisma.userDeviceKey.findMany({
    where: { status: "active" },
    select: { keyId: true, userId: true },
  });

  if (activeKeys.length === 0) return false;

  const keyIds = activeKeys.map((k) => k.keyId);

  // Check if all active keys have envelopes for at least one case
  const keysWithEnvelopes = await prisma.caseKeyEnvelope.findMany({
    where: { recipientKeyId: { in: keyIds } },
    select: { recipientKeyId: true },
    distinct: ["recipientKeyId"],
  });

  const keysWithEnvelopeIds = new Set(keysWithEnvelopes.map((e) => e.recipientKeyId));

  // If any active key doesn't have an envelope, there are new keys
  return keyIds.some((keyId) => !keysWithEnvelopeIds.has(keyId));
}

/**
 * Get count of cases and salaries that need rewrapping
 * (records where not all active device keys have key envelopes)
 */
export async function getRecordsNeedingRewrap(): Promise<{ cases: number; salaries: number }> {
  const activeKeys = await prisma.userDeviceKey.findMany({
    where: { status: "active" },
    select: { keyId: true },
  });

  if (activeKeys.length === 0) {
    return { cases: 0, salaries: 0 };
  }

  const keyIds = activeKeys.map((k) => k.keyId);

  // Get cases that don't have envelopes for all active keys
  const cases = await prisma.case.findMany({
    select: { id: true },
  });

  const casesNeedingRewrap = cases.filter(async (c) => {
    const existingEnvelopes = await prisma.caseKeyEnvelope.findMany({
      where: { caseId: c.id, recipientKeyId: { in: keyIds } },
      select: { recipientKeyId: true },
      distinct: ["recipientKeyId"],
    });

    const envelopeKeyIds = new Set(existingEnvelopes.map((e) => e.recipientKeyId));
    return keyIds.some((keyId) => !envelopeKeyIds.has(keyId));
  });

  // Count salaries (simplified - assuming all salaries need rewrap if new keys exist)
  const salaries = await prisma.salary.count();

  return {
    cases: (await Promise.all(casesNeedingRewrap)).length,
    salaries,
  };
}

/**
 * Create a new rewrap job
 */
export async function createRewrapJob(userId: string): Promise<string> {
  const job = await prisma.rewrapJob.create({
    data: {
      status: "pending",
      initiatedBy: userId,
    },
    select: { id: true },
  });
  return job.id;
}

/**
 * Get rewrap job status
 */
export async function getRewrapJobStatus(jobId: string) {
  const job = await prisma.rewrapJob.findUnique({
    where: { id: jobId },
  });
  return job;
}

/**
 * Update rewrap job progress
 */
export async function updateRewrapJobProgress(
  jobId: string,
  updates: {
    status?: string;
    processedRecords?: number;
    failedRecords?: number;
    totalRecords?: number;
    error?: string;
    startedAt?: Date;
    completedAt?: Date;
  }
) {
  return prisma.rewrapJob.update({
    where: { id: jobId },
    data: {
      ...updates,
      updatedAt: new Date(),
    },
  });
}

/**
 * Get a case with all its key envelopes
 */
export async function getCaseForRewrap(caseId: string) {
  const caseRecord = await prisma.case.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      employeeId: true,
      payload: true,
      keyVersion: true,
      keyEnvelopes: {
        select: {
          recipientKeyId: true,
          edk: true,
          wrapAlg: true,
          recipientUserId: true,
        },
      },
    },
  });
  return caseRecord;
}

/**
 * Get all cases that need rewrapping
 */
export async function getAllCasesNeedingRewrap() {
  const activeKeys = await prisma.userDeviceKey.findMany({
    where: { status: "active" },
    select: { keyId: true },
  });

  if (activeKeys.length === 0) return [];

  const keyIds = activeKeys.map((k) => k.keyId);

  const cases = await prisma.case.findMany({
    select: {
      id: true,
      payload: true,
      keyVersion: true,
      keyEnvelopes: {
        select: {
          recipientKeyId: true,
          recipientUserId: true,
          edk: true,
          wrapAlg: true,
        },
      },
    },
  });

  // Filter cases that don't have envelopes for all active keys
  return cases.filter((c) => {
    const envelopeKeyIds = new Set(c.keyEnvelopes.map((e) => e.recipientKeyId));
    return keyIds.some((keyId) => !envelopeKeyIds.has(keyId));
  });
}

/**
 * Get all salaries that need rewrapping
 */
export async function getAllSalariesNeedingRewrap() {
  return prisma.salary.findMany({
    select: {
      id: true,
      payload: true,
      keyVersion: true,
      employeeId: true,
    },
  });
}

/**
 * Get all active users' device keys
 */
export async function getAllActiveDeviceKeys() {
  return prisma.userDeviceKey.findMany({
    where: { status: "active" },
    select: {
      keyId: true,
      userId: true,
      publicKey: true,
      algorithm: true,
    },
  });
}

/**
 * Update case key envelopes after rewrap
 */
export async function updateCaseKeyEnvelopes(
  caseId: string,
  wrappedKeys: Array<{
    userId: string;
    keyId: string;
    edk: string;
    wrapAlg: string;
  }>
) {
  await prisma.$transaction([
    prisma.caseKeyEnvelope.deleteMany({
      where: { caseId },
    }),
    prisma.caseKeyEnvelope.createMany({
      data: wrappedKeys.map((wk) => ({
        caseId,
        recipientUserId: wk.userId,
        recipientKeyId: wk.keyId,
        edk: wk.edk,
        wrapAlg: wk.wrapAlg,
      })),
      skipDuplicates: true,
    }),
  ]);
}
