import { getCurrentSession } from "@/data/session";
import prisma from "@/config/prisma";
import { NextResponse } from "next/server";

async function ensureUserMasterKey(userId: string) {
	const existingMaster = await prisma.userDeviceKey.findFirst({
		where: { userId, kind: "master", status: "active" },
	});

	if (existingMaster) {
		return existingMaster;
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

	return prisma.userDeviceKey.create({
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

export async function GET() {
	const session = await getCurrentSession();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const masterKey = await ensureUserMasterKey(session.user.id);

	return NextResponse.json({
		keyId: masterKey.keyId,
		userId: masterKey.userId,
		publicKeyJwk: masterKey.publicKey,
		privateKeyJwk: masterKey.privateKey,
		algorithm: masterKey.algorithm,
	});
}
