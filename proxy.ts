import { getSession } from "@/data/session";
import { NextRequest, NextResponse } from "next/server";

const publicRoutes = new Set(["/login"]);

export async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;

	const sessionId = request.cookies.get("ur_session")?.value;
	let hasValidSession = false;

	if (sessionId) {
		try {
			hasValidSession = !!(await getSession(sessionId));
		} catch {
			hasValidSession = false;
		}
	}

	const isPublicRoute = publicRoutes.has(pathname);

	if (!hasValidSession && !isPublicRoute) {
		const url = request.nextUrl.clone();
		url.pathname = "/login";
		const response = NextResponse.redirect(url);
		if (sessionId) response.cookies.delete("ur_session");
		return response;
	}

	if (hasValidSession && isPublicRoute) {
		const url = request.nextUrl.clone();
		url.pathname = pathname;
		return NextResponse.redirect(url);
	}

	if (!hasValidSession && sessionId) {
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