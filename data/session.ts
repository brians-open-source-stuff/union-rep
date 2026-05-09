import "server-only";
import prisma from "@/config/prisma";
import redis from "@/config/redis";
import { SessionUser, SessionUserSchema } from "@/types";
import crypto from "crypto";
import { ZodError } from "zod";
import { cookies } from "next/headers";

export async function createSession(user: SessionUser, ip_address: string) {
	try {
		const sessionId = crypto.randomBytes(32).toString("base64url");
		await redis.set(sessionId, JSON.stringify(user), { EX: 60 * 60 * 24 });

		await prisma.session.create({
			data: {
				sessionId,
				userId: user.id,
				ip_address
			}
		})

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