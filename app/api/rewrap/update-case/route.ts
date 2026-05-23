import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/data/session";
import { can } from "@/lib/utils";
import { updateCaseKeyEnvelopes } from "@/lib/rewrap-utils";

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!can(session.user, "employee:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { caseId, wrappedKeys } = body;

  if (!caseId || !wrappedKeys) {
    return NextResponse.json(
      { error: "Missing required fields: caseId, wrappedKeys" },
      { status: 400 }
    );
  }

  try {
    await updateCaseKeyEnvelopes(caseId, wrappedKeys);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to update case key envelopes:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
