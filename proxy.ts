import { NextRequest, NextResponse } from "next/server";

const locales = ["en", "da"];

function getLocale(request: NextRequest) {
	if (!request.headers.has("accept-language")) return locales[0];

	return request.headers.get("accept-language")?.slice(0, 2);
}

export function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;
	const pathnameHasLocale = locales.some(
		locale => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
	);

	if (pathnameHasLocale) return;

	const locale = getLocale(request);
	request.nextUrl.pathname = `/${locale}${pathname}`;

	return NextResponse.redirect(request.nextUrl);
}

export const config = {
	matcher: [
		"/((?!_next).*)",
		// "/",
	],
};