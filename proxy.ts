import { hasSession } from "@/data/session";
import { NextRequest, NextResponse } from "next/server";

const publicRoutes = new Set(["/login", "/otp"]);
const passwordChangeExemptRoutes = new Set(["/profile", "/logout", "/login", "/api", "/otp"]);

export async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;

	const sessionId = request.cookies.get("ur_session")?.value;
	let isAuthenticated = false;
	let userNeedsPasswordChange = false;

	if (sessionId) {
		try {
			const sessionData = await hasSession(sessionId);
			if (sessionData) {
				isAuthenticated = true;
				// Check if session data includes needsPasswordChange
				const sessionUser = await getSessionUser(sessionId);
				if (sessionUser && sessionUser.needsPasswordChange) {
					userNeedsPasswordChange = true;
				}
			}
		} catch {
			isAuthenticated = false;
		}
	}

	const isPublicRoute = publicRoutes.has(pathname);
	const isPasswordChangeExempt = passwordChangeExemptRoutes.has(pathname) || pathname.startsWith("/api");

	if (!isAuthenticated && !isPublicRoute) {
		const url = request.nextUrl.clone();
		url.pathname = "/login";
		const response = NextResponse.redirect(url);
		if (sessionId) response.cookies.delete("ur_session");
		return response;
	}

	if (isAuthenticated && isPublicRoute) {
		const url = request.nextUrl.clone();
		url.pathname = "/";
		return NextResponse.redirect(url);
	}

	if (isAuthenticated && userNeedsPasswordChange && !isPasswordChangeExempt) {
		const url = request.nextUrl.clone();
		url.pathname = "/profile";
		return NextResponse.redirect(url);
	}

	if (!isAuthenticated && sessionId) {
		const response = NextResponse.next();
		response.cookies.delete("ur_session");
		return response;
	}

	return NextResponse.next();
}

async function getSessionUser(sessionId: string) {
	try {
		const redis = (await import("@/config/redis")).default;
		const session = await redis.get(sessionId);
		if (!session) return null;
		return JSON.parse(session);
	} catch {
		return null;
	}
}

export const config = {
	matcher: [
		"/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
	],
};