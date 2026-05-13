import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/data/session";
import { can } from "@/lib/utils";
import { updateRewrapJobProgress } from "@/lib/rewrap-utils";

type RewrapJobProgressUpdate = {
  status?: string;
  processedRecords?: number;
  failedRecords?: number;
  totalRecords?: number;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
};

export async function PATCH(
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

  const body = await request.json();
  const {
    status,
    processedRecords,
    failedRecords,
    totalRecords,
    error,
  } = body;

  const updates: RewrapJobProgressUpdate = {};
  if (status !== undefined) updates.status = status;
  if (processedRecords !== undefined) updates.processedRecords = processedRecords;
  if (failedRecords !== undefined) updates.failedRecords = failedRecords;
  if (totalRecords !== undefined) updates.totalRecords = totalRecords;
  if (error !== undefined) updates.error = error;

  if (status === "in_progress" && !updates.startedAt) {
    updates.startedAt = new Date();
  }
  if ((status === "completed" || status === "failed") && !updates.completedAt) {
    updates.completedAt = new Date();
  }

  try {
    const job = await updateRewrapJobProgress(jobId, updates);
    return NextResponse.json(job);
  } catch (error) {
    console.error("Failed to update job progress:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
