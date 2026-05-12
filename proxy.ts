import { hasSession } from "@/data/session";
import { NextRequest, NextResponse } from "next/server";

const publicRoutes = new Set(["/login"]);

export async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;

	const sessionId = request.cookies.get("ur_session")?.value;
	let isAuthenticated = false;

	if (sessionId) {
		try {
			isAuthenticated = await hasSession(sessionId);
		} catch {
			isAuthenticated = false;
		}
	}

	const isPublicRoute = publicRoutes.has(pathname);

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

	if (!isAuthenticated && sessionId) {
		const response = NextResponse.next();
		response.cookies.delete("ur_session");
		return response;
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		"/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
	],
};