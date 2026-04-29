import { getSession } from "@/data/session";
import { NextRequest, NextResponse } from "next/server";

const locales = ["en", "da"] as const;
const publicRoutes = new Set(["/login"]);

function getLocale(request: NextRequest) {
	const header = request.headers.get("accept-language")?.slice(0, 2);
	return locales.includes(header as (typeof locales)[number]) ? header : locales[0];
}

function stripLocale(pathname: string) {
	const parts = pathname.split("/").filter(Boolean);
	const first = parts[0];
	const hasLocale = locales.includes(first as (typeof locales)[number]);

	if (!hasLocale) {
		return { hasLocale: false, locale: null, route: pathname || "/" };
	}

	const routeParts = parts.slice(1);
	const route = routeParts.length ? `/${routeParts.join("/")}` : "/";
	return { hasLocale: true, locale: first, route };
}

export async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;
	const parsed = stripLocale(pathname);

	if (!parsed.hasLocale) {
		const locale = getLocale(request);
		request.nextUrl.pathname = "/" + locale + pathname;
		return NextResponse.redirect(request.nextUrl);
	}

	const sessionId = request.cookies.get("ur_session")?.value;
	let hasValidSession = false;

	if (sessionId) {
		try {
			hasValidSession = !!(await getSession(sessionId));
		} catch {
			hasValidSession = false;
		}
	}

	const isPublicRoute = publicRoutes.has(parsed.route);

	if (!hasValidSession && !isPublicRoute) {
		const url = request.nextUrl.clone();
		url.pathname = `/${parsed.locale}/login`;
		const response = NextResponse.redirect(url);
		if (sessionId) response.cookies.delete("ur_session");
		return response;
	}

	if (hasValidSession && isPublicRoute) {
		const url = request.nextUrl.clone();
		url.pathname = "/" + parsed.locale;
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