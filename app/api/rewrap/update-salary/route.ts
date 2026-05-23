import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/data/session";
import { can } from "@/lib/utils";
import { updateSalaryKeyEnvelopes } from "@/lib/rewrap-utils";

export async function POST(request: NextRequest) {
	const session = await getCurrentSession();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	if (!can(session.user, "employee:read")) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const body = await request.json();
	const { salaryId, wrappedKeys } = body;

	if (!salaryId || !wrappedKeys) {
		return NextResponse.json(
			{ error: "Missing required fields: salaryId, wrappedKeys" },
			{ status: 400 }
		);
	}

	try {
		await updateSalaryKeyEnvelopes(salaryId, wrappedKeys);
		return NextResponse.json({ ok: true });
	} catch (error) {
		console.error("Failed to update salary key envelopes:", error);
		return NextResponse.json({ error: "Failed to update" }, { status: 500 });
	}
}
