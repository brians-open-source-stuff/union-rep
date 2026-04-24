import redis from "@/config/redis";
import { SessionUser, SessionUserSchema } from "@/types";
import crypto from "crypto";
import { ZodError } from "zod";

export async function createSession(user: SessionUser) {
	try {
		const sessionId = crypto.randomBytes(32).toString("base64url");
		await redis.set(sessionId, JSON.stringify(user), { EX: 60 * 60 * 24 });

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
		return SessionUserSchema.parse(JSON.parse(session));
	} catch (error) {
		console.error(error);
		if (error instanceof ZodError) {
			throw new Error("Invalid session data");
		}
		throw new Error("Redis server encountered an issue");
	}
}