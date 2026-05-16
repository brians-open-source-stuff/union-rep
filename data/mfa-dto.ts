import "server-only";
import prisma from "@/config/prisma";
import redis from "@/config/redis";
import { createSession } from "@/data/session";
import { PERMISSIONS, PermissionSchema } from "@/types";
import { generateURI, verify } from "otplib";
import QRCode from "qrcode";
import crypto from "crypto";
import { getCurrentSession } from "./session";

const MFA_PENDING_PREFIX = "mfa_pending:";
const MFA_PENDING_TTL = 60 * 5; // 5 minutes

export type MFASetupData = {
	otpsecret: string;
	uri: string;
	qrCode: string;
	mfaSetupComplete: boolean;
};

export async function getMFASetupData(): Promise<MFASetupData | null> {
	const currentSession = await getCurrentSession();
	if (!currentSession) return null;

	const user = await prisma.user.findUnique({
		where: { id: currentSession.user.id },
		select: {
			otpsecret: true,
			mfaSetupComplete: true,
			email: true,
			name: true,
		},
	});

	if (!user) return null;

	const uri = generateURI({ issuer: "Union Rep", label: user.email, secret: user.otpsecret });
	const qrCode = await QRCode.toDataURL(uri);

	return {
		otpsecret: user.otpsecret,
		uri,
		qrCode,
		mfaSetupComplete: user.mfaSetupComplete,
	};
}

export type CompleteMFASetupResult = {
	ok: boolean;
	reason?: string;
};

export async function completeMFASetup(token: string): Promise<CompleteMFASetupResult> {
	const currentSession = await getCurrentSession();
	if (!currentSession) return { ok: false, reason: "Ingen aktiv session" };

	const user = await prisma.user.findUnique({
		where: { id: currentSession.user.id },
		select: { id: true, otpsecret: true },
	});

	if (!user) return { ok: false, reason: "Bruger ikke fundet" };

	const isValid = verify({ token, secret: user.otpsecret });
	if (!isValid) return { ok: false, reason: "Forkert kode. Prøv igen." };

	await prisma.user.update({
		where: { id: user.id },
		data: { mfaSetupComplete: true },
	});

	await redis.set(
		currentSession.sessionId,
		JSON.stringify({ ...currentSession.user, mfaSetupComplete: true }),
		{ EX: 60 * 60 * 24 },
	);

	return { ok: true };
}

export type CreatePendingMFAResult = {
	pendingToken: string;
};

export async function createPendingMFASession(userId: string): Promise<CreatePendingMFAResult> {
	const pendingToken = crypto.randomBytes(32).toString("base64url");
	await redis.set(`${MFA_PENDING_PREFIX}${pendingToken}`, userId, { EX: MFA_PENDING_TTL });
	return { pendingToken };
}

export type VerifyPendingMFAResult = {
	ok: boolean;
	sessionId?: string;
	userId?: string;
	reason?: string;
};

export async function verifyPendingMFALogin(
	pendingToken: string,
	otpToken: string,
	ipAddress: string,
): Promise<VerifyPendingMFAResult> {
	const userId = await redis.get(`${MFA_PENDING_PREFIX}${pendingToken}`);
	if (!userId) return { ok: false, reason: "Sessionen er udløbet. Log ind igen." };

	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			otpsecret: true,
			mfaSetupComplete: true,
			name: true,
			needsPasswordChange: true,
			roles: {
				include: { permissions: true },
			},
		},
	});

	if (!user) return { ok: false, reason: "Bruger ikke fundet" };

	const isValid = verify({ token: otpToken, secret: user.otpsecret });
	if (!isValid) return { ok: false, reason: "Forkert kode. Prøv igen." };

	await redis.del(`${MFA_PENDING_PREFIX}${pendingToken}`);

	const sessionUser = {
		id: user.id,
		name: user.name,
		needsPasswordChange: user.needsPasswordChange,
		mfaSetupComplete: user.mfaSetupComplete,
		roles: user.roles.map((r) => r.name),
		permissions: [
			...new Set(user.roles.flatMap((r) => r.permissions.map((p) => p.name))),
		].filter((p): p is typeof PERMISSIONS[number] => PermissionSchema.safeParse(p).success),
	};

	const sessionId = await createSession(sessionUser, ipAddress);

	return { ok: true, sessionId, userId: user.id };
}
