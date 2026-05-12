"use server";

import { logAuditEvent } from "@/data/audit-log-dto";
import { deleteSession, getCurrentSession } from "@/data/session";
import { getIP } from "@/lib/ip";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function logoutAction(): Promise<void> {
  const session = await getCurrentSession();

  if (session) {
    await logAuditEvent({
      userId: session.user.id,
      action: "logout",
      targetResourceId: session.user.id,
      sessionId: session.sessionId,
      ipAddress: await getIP(),
      success: true,
    });

    await deleteSession(session.sessionId);
  }

  const cookieStore = await cookies();
  cookieStore.delete("ur_session");

  redirect("/login");
}
