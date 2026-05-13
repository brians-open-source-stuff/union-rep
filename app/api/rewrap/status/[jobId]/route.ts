import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/data/session";
import { can } from "@/lib/utils";
import { getRewrapJobStatus } from "@/lib/rewrap-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check both permissions
  if (!can(session.user, "key:read") || !can(session.user, "key:update")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const job = await getRewrapJobStatus(jobId);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json(job);
}
