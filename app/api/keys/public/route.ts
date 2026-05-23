import { getCurrentSession } from "@/data/session";
import prisma from "@/config/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { can } from "@/lib/utils";

async function ensureUserMasterKey(userId: string) {
  const existingMaster = await prisma.userDeviceKey.findFirst({
    where: { userId, kind: "master", status: "active" },
    select: { id: true },
  });

  if (existingMaster) {
    return;
  }

  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["wrapKey", "unwrapKey"]
  );

  const publicKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

  await prisma.userDeviceKey.create({
    data: {
      keyId: crypto.randomUUID(),
      userId,
      publicKey: publicKeyJwk as object,
      privateKey: privateKeyJwk as object,
      algorithm: "RSA-OAEP-256",
      kind: "master",
      status: "active",
    },
  });
}

const UploadKeySchema = z.object({
  keyId: z.uuid(),
  publicKeyJwk: z.record(z.string(), z.unknown()),
  algorithm: z.literal("RSA-OAEP-256"),
});

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = UploadKeySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const existing = await prisma.userDeviceKey.findUnique({
    where: { keyId: parsed.data.keyId },
  });
  if (existing) return NextResponse.json({ error: "Key already registered" }, { status: 409 });

  await prisma.userDeviceKey.create({
    data: {
      keyId: parsed.data.keyId,
      userId: session.user.id,
      publicKey: parsed.data.publicKeyJwk as object,
      algorithm: parsed.data.algorithm,
      kind: "device",
    },
  });

  await ensureUserMasterKey(session.user.id);

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const employeeId = req.nextUrl.searchParams.get("employeeId");
  if (employeeId) {
    if (!z.uuid().safeParse(employeeId).success) {
      return NextResponse.json({ error: "Invalid employeeId" }, { status: 400 });
    }

    if (!can(session.user, "employee:read")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const usersWithAccess = await prisma.user.findMany({
      where: {
        OR: [
          { id: session.user.id },
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
      select: {
        id: true,
      },
    });

    const recipientUserIds = usersWithAccess.map((user) => user.id);

    const keys = await prisma.userDeviceKey.findMany({
      where: {
        userId: { in: recipientUserIds },
        kind: { in: ["device", "master"] },
        status: "active",
      },
      select: { keyId: true, userId: true, publicKey: true, algorithm: true },
    });

    return NextResponse.json({ keys });
  }

  const userIds = req.nextUrl.searchParams.get("users")?.split(",").filter(Boolean) ?? [];
  if (userIds.length === 0) return NextResponse.json({ keys: [] });

  if (userIds.includes(session.user.id)) {
    await ensureUserMasterKey(session.user.id);
  }

  const keys = await prisma.userDeviceKey.findMany({
    where: { userId: { in: userIds }, kind: "device", status: "active" },
    select: { keyId: true, userId: true, publicKey: true, algorithm: true },
  });

  return NextResponse.json({ keys });
}
