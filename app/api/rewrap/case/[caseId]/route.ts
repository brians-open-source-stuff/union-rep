import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/data/session";
import { can } from "@/lib/utils";
import { ensureCaseAccessForUser, getCaseForRewrap } from "@/lib/rewrap-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await params;

  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!can(session.user, "employee:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Attempt server-side recovery when only a master-key envelope exists.
  await ensureCaseAccessForUser(caseId, session.user.id);

  const caseData = await getCaseForRewrap(caseId);
  if (!caseData) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  return NextResponse.json(caseData);
}
