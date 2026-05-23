import "server-only";
import prisma from "@/config/prisma";

function b64urlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function b64urlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = `${base64}${"=".repeat((4 - (base64.length % 4)) % 4)}`;
  return Uint8Array.from(Buffer.from(padded, "base64"));
}

async function getRecipientKeysForEmployee(employeeId: string, userId: string) {
  const usersWithAccess = await prisma.user.findMany({
    where: {
      OR: [
        { id: userId },
        {
          roles: {
            some: {
              name: "admin",
            },
          },
        },
        {
          managerAccess: {
            some: {
              manager: {
                employees: {
                  some: {
                    id: employeeId,
                  },
                },
              },
            },
          },
        },
      ],
    },
    select: { id: true },
  });

  const recipientUserIds = usersWithAccess.map((user) => user.id);

  return prisma.userDeviceKey.findMany({
    where: {
      userId: { in: recipientUserIds },
      kind: { in: ["device", "master"] },
      status: "active",
    },
    select: { keyId: true, userId: true, publicKey: true },
  });
}

async function unwrapCekWithMasterKey(edk: string, privateKeyJwk: JsonWebKey): Promise<CryptoKey> {
  const privateKey = await crypto.subtle.importKey(
    "jwk",
    privateKeyJwk,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["unwrapKey"]
  );

  return crypto.subtle.unwrapKey(
    "raw",
    b64urlDecode(edk),
    privateKey,
    { name: "RSA-OAEP" },
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function wrapCekForRecipients(
  cek: CryptoKey,
  recipients: Array<{ keyId: string; userId: string; publicKey: unknown }>
) {
  const wrapped = await Promise.all(
    recipients.map(async (recipient) => {
      try {
        const publicKey = await crypto.subtle.importKey(
          "jwk",
          recipient.publicKey as JsonWebKey,
          { name: "RSA-OAEP", hash: "SHA-256" },
          true,
          ["wrapKey"]
        );

        const edk = await crypto.subtle.wrapKey("raw", cek, publicKey, {
          name: "RSA-OAEP",
        });

        return {
          userId: recipient.userId,
          keyId: recipient.keyId,
          edk: b64urlEncode(edk),
          wrapAlg: "RSA-OAEP-256",
        };
      } catch {
        return null;
      }
    })
  );

  return wrapped.filter((v): v is { userId: string; keyId: string; edk: string; wrapAlg: string } => v !== null);
}

export async function ensureCaseAccessForUser(caseId: string, userId: string): Promise<boolean> {
  const deviceKeys = await prisma.userDeviceKey.findMany({
    where: { userId, kind: "device", status: "active" },
    select: { keyId: true },
  });

  if (deviceKeys.length === 0) {
    return false;
  }

  const caseRecord = await getCaseForRewrap(caseId);
  if (!caseRecord) {
    return false;
  }

  const deviceKeyIds = new Set(deviceKeys.map((k) => k.keyId));
  const hasDeviceEnvelope = caseRecord.keyEnvelopes.some((e) => deviceKeyIds.has(e.recipientKeyId));
  if (hasDeviceEnvelope) {
    return false;
  }

  const masterKey = await prisma.userDeviceKey.findFirst({
    where: { userId, kind: "master", status: "active", privateKey: { not: null } },
    select: { keyId: true, privateKey: true },
  });

  if (!masterKey || !masterKey.privateKey) {
    return false;
  }

  const masterEnvelope = caseRecord.keyEnvelopes.find(
    (envelope) => envelope.recipientUserId === userId && envelope.recipientKeyId === masterKey.keyId
  );
  if (!masterEnvelope) {
    return false;
  }

  const cek = await unwrapCekWithMasterKey(masterEnvelope.edk, masterKey.privateKey as JsonWebKey);
  const recipients = await getRecipientKeysForEmployee(caseRecord.employeeId, userId);
  const wrappedKeys = await wrapCekForRecipients(cek, recipients);
  if (wrappedKeys.length === 0) {
    return false;
  }

  await updateCaseKeyEnvelopes(caseId, wrappedKeys);
  return true;
}

export async function ensureSalaryAccessForUser(salaryId: string, userId: string): Promise<boolean> {
  const deviceKeys = await prisma.userDeviceKey.findMany({
    where: { userId, kind: "device", status: "active" },
    select: { keyId: true },
  });

  if (deviceKeys.length === 0) {
    return false;
  }

  const salary = await getSalaryForRewrap(salaryId);
  if (!salary) {
    return false;
  }

  const deviceKeyIds = new Set(deviceKeys.map((k) => k.keyId));
  const hasDeviceEnvelope = salary.keyEnvelopes.some((e) => deviceKeyIds.has(e.recipientKeyId));
  if (hasDeviceEnvelope) {
    return false;
  }

  const masterKey = await prisma.userDeviceKey.findFirst({
    where: { userId, kind: "master", status: "active", privateKey: { not: null } },
    select: { keyId: true, privateKey: true },
  });

  if (!masterKey || !masterKey.privateKey) {
    return false;
  }

  const masterEnvelope = salary.keyEnvelopes.find(
    (envelope) => envelope.recipientUserId === userId && envelope.recipientKeyId === masterKey.keyId
  );
  if (!masterEnvelope) {
    return false;
  }

  const cek = await unwrapCekWithMasterKey(masterEnvelope.edk, masterKey.privateKey as JsonWebKey);
  const recipients = await getRecipientKeysForEmployee(salary.employeeId, userId);
  const wrappedKeys = await wrapCekForRecipients(cek, recipients);
  if (wrappedKeys.length === 0) {
    return false;
  }

  await updateSalaryKeyEnvelopes(salaryId, wrappedKeys);
  return true;
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
 * Get a salary with all its key envelopes
 */
export async function getSalaryForRewrap(salaryId: string) {
  return prisma.salary.findUnique({
    where: { id: salaryId },
    select: {
      id: true,
      employeeId: true,
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

/**
 * Update salary key envelopes after rewrap
 */
export async function updateSalaryKeyEnvelopes(
  salaryId: string,
  wrappedKeys: Array<{
    userId: string;
    keyId: string;
    edk: string;
    wrapAlg: string;
  }>
) {
  await prisma.$transaction([
    prisma.salaryKeyEnvelope.deleteMany({
      where: { salaryId },
    }),
    prisma.salaryKeyEnvelope.createMany({
      data: wrappedKeys.map((wk) => ({
        salaryId,
        recipientUserId: wk.userId,
        recipientKeyId: wk.keyId,
        edk: wk.edk,
        wrapAlg: wk.wrapAlg,
      })),
      skipDuplicates: true,
    }),
  ]);
}
