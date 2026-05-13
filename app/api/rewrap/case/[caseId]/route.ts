import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/data/session";
import { can } from "@/lib/utils";
import { getCaseForRewrap } from "@/lib/rewrap-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await params;

  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check both permissions
  if (!can(session.user, "key:read") || !can(session.user, "key:update")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const caseData = await getCaseForRewrap(caseId);
  if (!caseData) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  return NextResponse.json(caseData);
}
