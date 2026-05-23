import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/data/session";
import { can } from "@/lib/utils";
import { ensureSalaryAccessForUser, getSalaryForRewrap } from "@/lib/rewrap-utils";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ salaryId: string }> }
) {
	const { salaryId } = await params;

	const session = await getCurrentSession();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	if (!can(session.user, "employee:read")) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	// Attempt server-side recovery when only a master-key envelope exists.
	await ensureSalaryAccessForUser(salaryId, session.user.id);

	const salary = await getSalaryForRewrap(salaryId);
	if (!salary) {
		return NextResponse.json({ error: "Salary not found" }, { status: 404 });
	}

	return NextResponse.json(salary);
}
