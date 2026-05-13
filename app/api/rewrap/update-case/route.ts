import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/data/session";
import { can } from "@/lib/utils";
import { updateCaseKeyEnvelopes, updateRewrapJobProgress } from "@/lib/rewrap-utils";

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check both permissions
  if (!can(session.user, "key:read") || !can(session.user, "key:update")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { caseId, wrappedKeys, jobId } = body;

  if (!caseId || !wrappedKeys || !jobId) {
    return NextResponse.json(
      { error: "Missing required fields: caseId, wrappedKeys, jobId" },
      { status: 400 }
    );
  }

  try {
    await updateCaseKeyEnvelopes(caseId, wrappedKeys);

    // Update job progress
    await updateRewrapJobProgress(jobId, {
      status: "in_progress",
      processedRecords: undefined, // Will be incremented on client
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to update case key envelopes:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
