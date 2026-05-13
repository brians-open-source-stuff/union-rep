import { NextResponse } from "next/server";
import { getCurrentSession } from "@/data/session";
import { can } from "@/lib/utils";
import { createRewrapJob, getAllCasesNeedingRewrap, getAllSalariesNeedingRewrap } from "@/lib/rewrap-utils";

export async function POST() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check both permissions
  if (!can(session.user, "key:read") || !can(session.user, "key:update")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const jobId = await createRewrapJob(session.user.id);

  // Get counts of records that need rewrapping
  const [casesNeedingRewrap, salariesNeedingRewrap] = await Promise.all([
    getAllCasesNeedingRewrap(),
    getAllSalariesNeedingRewrap(),
  ]);

  const totalRecords = casesNeedingRewrap.length + salariesNeedingRewrap.length;

  return NextResponse.json({
    jobId,
    totalRecords,
    casesCount: casesNeedingRewrap.length,
    salariesCount: salariesNeedingRewrap.length,
  });
}
