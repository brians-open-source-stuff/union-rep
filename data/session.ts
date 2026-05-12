import "server-only";
import prisma from "@/config/prisma";
import redis from "@/config/redis";
import { Permission, SessionUser, SessionUserSchema } from "@/types";
import crypto from "crypto";
import { ZodError } from "zod";
import { cookies } from "next/headers";
import { can } from "@/lib/utils";

export async function createSession(user: SessionUser, ip_address: string) {
	try {
		const sessionId = crypto.randomBytes(32).toString("base64url");
		const TTL = 60 * 60 * 24;
		await redis.set(sessionId, JSON.stringify(user), { EX: TTL });

		try {
			await prisma.session.create({
				data: {
					sessionId,
					userId: user.id,
					ip_address,
					expiresAt: new Date(Date.now() + TTL * 1000),
				},
			});
		} catch (dbError) {
			await redis.del(sessionId);
			throw dbError;
		}

		return sessionId;
	} catch (error) {
		console.error(error);
		throw new Error("Redis server encountered an issue");
	}
}

export async function getSession(sessionId: string): Promise<SessionUser | null> {
	try {
		const session = await redis.get(sessionId);
		if (!session) return null;

		const parsed = SessionUserSchema.parse(JSON.parse(session));

		const dbSession = await prisma.session.findUnique({
			where: { sessionId },
			select: { userId: true },
		});

		if (!dbSession || dbSession.userId !== parsed.id) {
			await redis.del(sessionId);
			return null;
		}

		// Slide the TTL on every validated request
		await redis.expire(sessionId, 60 * 60 * 24);
		return parsed;
	} catch (error) {
		console.error(error);
		if (error instanceof ZodError) {
			await redis.del(sessionId);
			return null;
		}
		throw new Error("Session lookup failed");
	}
}

export async function getCurrentSession(): Promise<{ sessionId: string; user: SessionUser } | null> {
	const cookieStore = await cookies();
	const sessionCookie = cookieStore.get("ur_session");
	const sessionId = sessionCookie?.value;

	if (!sessionId) return null;

	const user = await getSession(sessionId);
	if (!user) return null;

	return { sessionId, user };
}

export async function hasSession(sessionId: string): Promise<boolean> {
	try {
		const exists = await redis.exists(sessionId);
		return exists === 1;
	} catch {
		return false;
	}
}

export async function deleteSession(sessionId: string): Promise<void> {
	await Promise.all([
		redis.del(sessionId),
		prisma.$transaction([
			prisma.auditLog.updateMany({
				where: { sessionId },
				data: { sessionId: null },
			}),
			prisma.session.deleteMany({ where: { sessionId } }),
		]),
	]);
}

export type ActiveSessionListItem = {
	id: string;
	sessionId: string;
	createdAt: Date;
	userName: string;
	permissions: Permission[];
};

export async function getActiveSessions(): Promise<ActiveSessionListItem[]> {
	const currentSession = await getCurrentSession();
	if (!currentSession) return [];

	if (!can(currentSession.user, "user:read")) return [];

	const sessions = await prisma.session.findMany({
		select: {
			id: true,
			sessionId: true,
			createdAt: true,
			user: {
				select: {
					name: true,
				},
			},
		},
		orderBy: {
			createdAt: "desc",
		},
	});

	const sessionIds = sessions.map((s) => s.sessionId);
	const redisValues = await redis.mGet(sessionIds);

	const results: ActiveSessionListItem[] = [];
	for (let i = 0; i < sessions.length; i++) {
		const raw = redisValues[i];
		if (!raw) continue;
		try {
			const payload = SessionUserSchema.parse(JSON.parse(raw));
			results.push({
				id: sessions[i].id,
				sessionId: sessions[i].sessionId,
				createdAt: sessions[i].createdAt,
				userName: sessions[i].user.name,
				permissions: [...payload.permissions].sort((a, b) => a.localeCompare(b, "da")),
			});
		} catch {
			// Stale / corrupt Redis entry — skip
		}
	}
	return results;
}
