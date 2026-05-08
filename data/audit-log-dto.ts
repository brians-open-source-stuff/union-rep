import prisma from "@/config/prisma";
import "server-only";

type AuditAction = "create" | "read" | "update" | "delete" | "login" | "logout";

type LogAuditEventInput = {
  userId: string;
  action: AuditAction;
  targetResourceId: string;
  sessionId: string;
  ipAddress: string;
  success?: boolean;
};

export async function logAuditEvent(input: LogAuditEventInput) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        target_resource_id: input.targetResourceId,
        sessionId: input.sessionId,
        ip_address: input.ipAddress,
        success: input.success ?? true,
      },
    });
  } catch (error) {
    // Do not block auth flow if audit write fails
    console.error("Failed to write audit log", error);
  }
}
