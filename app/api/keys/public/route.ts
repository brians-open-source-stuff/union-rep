import { getCurrentSession } from "@/data/session";
import prisma from "@/config/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const UploadKeySchema = z.object({
  keyId: z.string().uuid(),
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
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userIds = req.nextUrl.searchParams.get("users")?.split(",").filter(Boolean) ?? [];
  if (userIds.length === 0) return NextResponse.json({ keys: [] });

  const keys = await prisma.userDeviceKey.findMany({
    where: { userId: { in: userIds }, status: "active" },
    select: { keyId: true, userId: true, publicKey: true, algorithm: true },
  });

  return NextResponse.json({ keys });
}
