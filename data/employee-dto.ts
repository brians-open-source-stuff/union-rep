import "server-only";
import prisma from "@/config/prisma";
import { getCurrentSession } from "./session";
import { can } from "@/lib/utils";
import { logAuditEvent } from "./audit-log-dto";
import { getIP } from "@/lib/ip";

export type UpdateEmployeeDtoInput = {
  employeeId: string;
  name: string;
  lastContact: Date | null;
  title: string | null;
  email: string | null;
  emailAlt: string | null;
  phone: string | null;
  phoneAlt: string | null;
  primaryUserId: string | null;
  secondaryUserId: string | null;
};

export type CreateEmployeeDtoInput = {
  name: string;
  employedAt: Date;
  lastContact: Date | null;
  memberSince: Date | null;
  birthdate: Date | null;
  title: string | null;
  email: string | null;
  emailAlt: string | null;
  phone: string | null;
  phoneAlt: string | null;
  managerId: string | null;
  departmentIds: string[];
  primaryUserId: string | null;
  secondaryUserId: string | null;
};

export type EmployeeMutationResult = {
  ok: boolean;
  reason?: string;
  employeeId?: string;
};

function activeAssignmentWhere(userId: string) {
  const now = new Date();

  return {
    userId,
    OR: [
      {
        validFrom: null,
        validTo: null,
      },
      {
        validFrom: { lte: now },
        validTo: null,
      },
      {
        validFrom: null,
        validTo: { gte: now },
      },
      {
        validFrom: { lte: now },
        validTo: { gte: now },
      },
    ],
  };
}

function employeeAccessWhere(userId: string) {
  return {
    OR: [
      {
        assignments: {
          some: {
            ...activeAssignmentWhere(userId),
          },
        },
      },
      {
        departments: {
          some: {
            assignments: {
              some: {
                ...activeAssignmentWhere(userId),
              },
            },
          },
        },
      },
    ],
  };
}

export async function createEmployee(input: CreateEmployeeDtoInput): Promise<EmployeeMutationResult> {
  const currentSession = await getCurrentSession();
  if (!currentSession) return { ok: false, reason: "Ingen aktiv session" };

  const { sessionId, user } = currentSession;
  if (!can(user, "employee:create")) {
    return { ok: false, reason: "Mangler rettighed: employee:create" };
  }

  const assignedUserIds = [input.primaryUserId, input.secondaryUserId].filter(
    (value): value is string => Boolean(value)
  );
  const uniqueAssignedUserIds = [...new Set(assignedUserIds)];
  const uniqueDepartmentIds = [...new Set(input.departmentIds)];

  try {
    const employee = await prisma.employee.create({
      data: {
        name: input.name,
        employedAt: input.employedAt,
        lastContact: input.lastContact,
        memberSince: input.memberSince,
        birthdate: input.birthdate,
        title: input.title,
        email: input.email,
        emailAlt: input.emailAlt,
        phone: input.phone,
        phoneAlt: input.phoneAlt,
        ...(input.managerId
          ? {
            managers: {
              connect: [{ id: input.managerId }],
            },
          }
          : {}),
        ...(uniqueDepartmentIds.length > 0
          ? {
            departments: {
              connect: uniqueDepartmentIds.map((id) => ({ id })),
            },
          }
          : {}),
        assignments: {
          create: uniqueAssignedUserIds.map((userId, index) => ({
            userId,
            relationshipType: index === 0 ? "primary_contact" : "secondary_contact",
            isPrimary: index === 0,
            grantedByUserId: user.id,
          })),
        }
      },
      select: { id: true },
    });

    await logAuditEvent({
      userId: user.id,
      sessionId,
      ipAddress: await getIP(),
      action: "create",
      targetResourceId: employee.id,
      success: true,
    });

    return { ok: true, employeeId: employee.id };
  } catch {
    await logAuditEvent({
      userId: user.id,
      sessionId,
      ipAddress: await getIP(),
      action: "create",
      targetResourceId: "employee:create",
      success: false,
    });

    return { ok: false, reason: "Kunne ikke oprette medarbejderen" };
  }
}

export async function getSingleEmployee(id: string) {
  const currentSession = await getCurrentSession();
  if (!currentSession) return null;

  const { sessionId, user } = currentSession;

  if (!can(user, "employee:read")) return null;

  try {
    const employee = await prisma.employee.findUnique({
      where: {
        id
      },
      include: {
        assignments: {
          orderBy: [
            { isPrimary: "desc" },
            { createdAt: "asc" },
          ],
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        departments: true,
      }
    });

    await logAuditEvent({
      userId: user.id,
      sessionId: sessionId,
      ipAddress: await getIP(),
      action: "read",
      targetResourceId: id,
      success: true,
    });
    return employee;
  } catch {
    await logAuditEvent({
      userId: user.id,
      sessionId: sessionId,
      ipAddress: await getIP(),
      action: "read",
      targetResourceId: id,
      success: false,
    });
    throw new Error("Error getting employee")
  }
}

export async function getEmployees() {
  const currentSession = await getCurrentSession();
  if (!currentSession) return [];

  const { sessionId, user } = currentSession;

  if (!can(user, "employee:read")) return null;

  const isAdmin = user.roles.includes("admin");

  try {
    const employees = await prisma.employee.findMany({
      where: isAdmin
        ? undefined
        : employeeAccessWhere(user.id),
      include: {
        departments: true,
        managers: {
          select: {
            id: true,
            name: true,
            chiefId: true,
          },
        },
        assignments: {
          orderBy: [
            { isPrimary: "desc" },
            { createdAt: "asc" },
          ],
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    await logAuditEvent({
      userId: user.id,
      sessionId,
      ipAddress: await getIP(),
      action: "read",
      targetResourceId: "employee:list",
      success: true,
    });

    return employees;
  } catch {
    await logAuditEvent({
      userId: user.id,
      sessionId,
      ipAddress: await getIP(),
      action: "read",
      targetResourceId: "employee:list",
      success: false,
    });

    throw new Error("Error getting employees");
  }
}

export type EmployeeSearchItem = {
  id: string;
  name: string;
};

export async function searchEmployeesByName(query: string): Promise<EmployeeSearchItem[]> {
  const currentSession = await getCurrentSession();
  if (!currentSession) return [];

  const { user } = currentSession;
  if (!can(user, "employee:read")) return [];

  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 2) return [];

  const isAdmin = user.roles.includes("admin");

  const employees = await prisma.employee.findMany({
    where: {
      name: {
        contains: normalizedQuery,
        mode: "insensitive",
      },
      ...(isAdmin
        ? {}
        : employeeAccessWhere(user.id)),
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
    take: 12,
  });

  return employees;
}

export async function updateEmployee(input: UpdateEmployeeDtoInput): Promise<{ ok: boolean; reason?: string }> {
  const currentSession = await getCurrentSession();
  if (!currentSession) return { ok: false, reason: "Ingen aktiv session" };

  const { sessionId, user } = currentSession;
  if (!can(user, "employee:update")) {
    return { ok: false, reason: "Mangler rettighed: employee:update" };
  }

  const assignedUserIds = [input.primaryUserId, input.secondaryUserId].filter(
    (value): value is string => Boolean(value)
  );
  const uniqueAssignedUserIds = [...new Set(assignedUserIds)];

  try {
    await prisma.employee.update({
      where: { id: input.employeeId },
      data: {
        name: input.name,
        lastContact: input.lastContact,
        title: input.title,
        email: input.email,
        emailAlt: input.emailAlt,
        phone: input.phone,
        phoneAlt: input.phoneAlt,
        assignments: {
          deleteMany: {},
          create: uniqueAssignedUserIds.map((userId, index) => ({
            userId,
            relationshipType: index === 0 ? "primary_contact" : "secondary_contact",
            isPrimary: index === 0,
            grantedByUserId: user.id,
          })),
        },
      },
    });

    await logAuditEvent({
      userId: user.id,
      sessionId,
      ipAddress: await getIP(),
      action: "update",
      targetResourceId: input.employeeId,
      success: true,
    });

    return { ok: true };
  } catch {
    await logAuditEvent({
      userId: user.id,
      sessionId,
      ipAddress: await getIP(),
      action: "update",
      targetResourceId: input.employeeId,
      success: false,
    });

    return { ok: false, reason: "Kunne ikke opdatere medarbejderen" };
  }
}

export async function registerEmployeeContactNow(employeeId: string): Promise<{ ok: boolean; reason?: string }> {
  const currentSession = await getCurrentSession();
  if (!currentSession) return { ok: false, reason: "Ingen aktiv session" };

  const { sessionId, user } = currentSession;
  if (!can(user, "employee:update")) {
    return { ok: false, reason: "Mangler rettighed: employee:update" };
  }

  const isAdmin = user.roles.includes("admin");

  try {
    const employee = await prisma.employee.findFirst({
      where: isAdmin
        ? { id: employeeId }
        : {
          id: employeeId,
          ...employeeAccessWhere(user.id),
        },
      select: { id: true },
    });

    if (!employee) {
      return { ok: false, reason: "Medarbejderen findes ikke eller er ikke tilgaengelig" };
    }

    await prisma.employee.update({
      where: { id: employeeId },
      data: { lastContact: new Date() },
      select: { id: true },
    });

    await logAuditEvent({
      userId: user.id,
      sessionId,
      ipAddress: await getIP(),
      action: "update",
      targetResourceId: employeeId,
      success: true,
    });

    return { ok: true };
  } catch {
    await logAuditEvent({
      userId: user.id,
      sessionId,
      ipAddress: await getIP(),
      action: "update",
      targetResourceId: employeeId,
      success: false,
    });

    return { ok: false, reason: "Kunne ikke registrere kontakt" };
  }
}

export async function deleteEmployee(employeeId: string): Promise<EmployeeMutationResult> {
  const currentSession = await getCurrentSession();
  if (!currentSession) return { ok: false, reason: "Ingen aktiv session" };

  const { sessionId, user } = currentSession;
  if (!can(user, "employee:delete")) {
    return { ok: false, reason: "Mangler rettighed: employee:delete" };
  }

  try {
    await prisma.employee.delete({
      where: { id: employeeId },
      select: { id: true },
    });

    await logAuditEvent({
      userId: user.id,
      sessionId,
      ipAddress: await getIP(),
      action: "delete",
      targetResourceId: employeeId,
      success: true,
    });

    return { ok: true, employeeId };
  } catch {
    await logAuditEvent({
      userId: user.id,
      sessionId,
      ipAddress: await getIP(),
      action: "delete",
      targetResourceId: employeeId,
      success: false,
    });

    return { ok: false, reason: "Kunne ikke slette medarbejderen" };
  }
}

async function getDashboardEmployeeWhere() {
  const currentSession = await getCurrentSession();
  if (!currentSession) return null;

  const { user } = currentSession;
  if (!can(user, "employee:read")) return null;

  if (user.roles.includes("admin")) {
    return {};
  }

  return employeeAccessWhere(user.id);
}

export async function getEmployeeCounts() {
  const where = await getDashboardEmployeeWhere();
  if (!where) {
    return {
      totalEmployees: 0,
      members: 0,
    };
  }

  const [totalEmployees, members] = await Promise.all([
    prisma.employee.count({ where }),
    prisma.employee.count({
      where: {
        ...where,
        memberSince: {
          not: null,
        },
      },
    }),
  ]);

  return {
    totalEmployees,
    members,
  };
}

export async function getEmployeeMembershipTimeline() {
  const where = await getDashboardEmployeeWhere();
  if (!where) return [];

  const employees = await prisma.employee.findMany({
    where,
    select: {
      employedAt: true,
      memberSince: true,
    },
  });

  const now = new Date();
  const startMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 23, 1));

  const timeline = Array.from({ length: 24 }, (_, index) => {
    const monthStart = new Date(Date.UTC(startMonth.getUTCFullYear(), startMonth.getUTCMonth() + index, 1));
    const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1));

    const employeeCount = employees.filter((employee) => employee.employedAt < monthEnd).length;
    const memberCount = employees.filter((employee) => employee.memberSince !== null && employee.memberSince < monthEnd).length;

    return {
      month: monthStart.toISOString().slice(0, 7),
      employees: employeeCount,
      members: memberCount,
      membershipRate: employeeCount === 0 ? 0 : memberCount / employeeCount,
    };
  });

  return timeline;
}

export type BirthdayThisWeek = {
  name: string;
  birthdate: Date;
  age: number;
};

export async function getMemberBirthdaysNext7Days() {
  const where = await getDashboardEmployeeWhere();
  if (!where) return [];

  const candidates = await prisma.employee.findMany({
    where: {
      ...where,
      memberSince: { not: null },
      birthdate: { not: null },
    },
    select: {
      name: true,
      birthdate: true,
    },
  });

  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const windowEnd = new Date(todayUtc);
  windowEnd.setUTCDate(todayUtc.getUTCDate() + 6);

  const isLeapYear = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

  return candidates
    .map((employee) => {
      const birthdate = employee.birthdate;
      if (!birthdate) return null;

      const birthMonth = birthdate.getUTCMonth();
      let birthDay = birthdate.getUTCDate();

      // Handle leap year birthdays
      if (birthMonth === 1 && birthDay === 29 && !isLeapYear(todayUtc.getUTCFullYear())) {
        birthDay = 28;
      }

      // Birthday this year
      let birthdayThisYear = new Date(Date.UTC(todayUtc.getUTCFullYear(), birthMonth, birthDay));

      // If birthday already passed in this window, check next year
      if (birthdayThisYear < todayUtc) {
        birthdayThisYear = new Date(Date.UTC(todayUtc.getUTCFullYear() + 1, birthMonth, birthDay));
      }

      // Check if birthday is within the next 7 days
      if (birthdayThisYear >= todayUtc && birthdayThisYear <= windowEnd) {
        return {
          name: employee.name,
          birthdate,
          age: birthdayThisYear.getUTCFullYear() - birthdate.getUTCFullYear(),
          sortDate: birthdayThisYear,
        };
      }
      return null;
    })
    .filter((row): row is { name: string; birthdate: Date; age: number; sortDate: Date } => row !== null)
    .sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime())
    .map((row) => ({
      name: row.name,
      birthdate: row.birthdate,
      age: row.age,
    }));
}

export type UpcomingAnniversary = {
  name: string;
  employedAt: Date;
  years: number;
};

export type ContactRiskEmployee = {
  id: string;
  name: string;
  primaryContactName: string | null;
  lastContact: Date | null;
  daysWithoutContact: number | null;
  riskScore: number;
  riskLevel: "low" | "medium" | "high";
  reason: string;
};

export async function getMemberEmploymentAnniversaries() {
  const where = await getDashboardEmployeeWhere();
  if (!where) return [];

  const candidates = await prisma.employee.findMany({
    where: {
      ...where,
      memberSince: { not: null },
    },
    select: {
      name: true,
      employedAt: true,
    },
  });

  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const windowEnd = new Date(todayUtc);
  windowEnd.setUTCDate(todayUtc.getUTCDate() + 30);

  const isLeapYear = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

  return candidates
    .map((employee) => {
      const employedAt = employee.employedAt;
      if (!employedAt) return null;

      const years = todayUtc.getUTCFullYear() - employedAt.getUTCFullYear();
      if (years !== 25 && years !== 40) return null;

      const month = employedAt.getUTCMonth();
      const day = employedAt.getUTCDate();
      const anniversaryDay = month === 1 && day === 29 && !isLeapYear(todayUtc.getUTCFullYear()) ? 28 : day;
      const anniversaryThisYear = new Date(Date.UTC(todayUtc.getUTCFullYear(), month, anniversaryDay));

      if (anniversaryThisYear < todayUtc || anniversaryThisYear > windowEnd) return null;

      return {
        name: employee.name,
        employedAt,
        years,
        sortDate: anniversaryThisYear,
      };
    })
    .filter((row): row is { name: string; employedAt: Date; years: number; sortDate: Date } => row !== null)
    .sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime())
    .map((row) => ({
      name: row.name,
      employedAt: row.employedAt,
      years: row.years,
    }));
}

export async function getEmployeesAtContactRisk(limit = 8): Promise<ContactRiskEmployee[]> {
  const currentSession = await getCurrentSession();
  if (!currentSession) return [];

  const { user } = currentSession;
  if (!can(user, "employee:read")) return [];

  const dashboardWhere = user.roles.includes("admin") ? {} : employeeAccessWhere(user.id);

  const staleThresholdDays = 45;
  const staleThreshold = new Date();
  staleThreshold.setUTCDate(staleThreshold.getUTCDate() - staleThresholdDays);

  const employees = await prisma.employee.findMany({
    where: {
      ...dashboardWhere,
      memberSince: { not: null },
      assignments: {
        some: {
          ...activeAssignmentWhere(user.id),
          relationshipType: {
            in: ["primary_contact", "secondary_contact"],
          },
        },
      },
      OR: [
        { lastContact: null },
        { lastContact: { lt: staleThreshold } },
      ],
    },
    select: {
      id: true,
      name: true,
      lastContact: true,
      assignments: {
        orderBy: [
          { isPrimary: "desc" },
          { createdAt: "asc" },
        ],
        select: {
          isPrimary: true,
          user: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: [
      { lastContact: "asc" },
      { name: "asc" },
    ],
    take: Math.max(limit * 3, 20),
  });

  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const assessed = employees.map((employee) => {
    const primaryAssignment = employee.assignments.find((assignment) => assignment.isPrimary);
    const fallbackAssignment = employee.assignments[0];
    const primaryContactName = primaryAssignment?.user.name ?? fallbackAssignment?.user.name ?? null;

    const daysWithoutContact = employee.lastContact
      ? Math.floor((todayUtc.getTime() - new Date(Date.UTC(
        employee.lastContact.getUTCFullYear(),
        employee.lastContact.getUTCMonth(),
        employee.lastContact.getUTCDate(),
      )).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    let riskScore = 0;
    let reason = "";

    if (daysWithoutContact === null) {
      riskScore += 90;
      reason = "Ingen kontakt er registreret";
    } else if (daysWithoutContact >= 120) {
      riskScore += 95;
      reason = `${daysWithoutContact} dage siden sidste kontakt`;
    } else if (daysWithoutContact >= 90) {
      riskScore += 80;
      reason = `${daysWithoutContact} dage siden sidste kontakt`;
    } else if (daysWithoutContact >= 60) {
      riskScore += 65;
      reason = `${daysWithoutContact} dage siden sidste kontakt`;
    } else {
      riskScore += 45;
      reason = `${daysWithoutContact} dage siden sidste kontakt`;
    }

    if (!primaryContactName) {
      riskScore += 20;
      reason = `${reason}. Ingen kontaktperson er tildelt`;
    }

    if (riskScore > 100) {
      riskScore = 100;
    }

    const riskLevel = riskScore >= 85 ? "high" : riskScore >= 60 ? "medium" : "low";

    return {
      id: employee.id,
      name: employee.name,
      primaryContactName,
      lastContact: employee.lastContact,
      daysWithoutContact,
      riskScore,
      riskLevel,
      reason,
    };
  });

  return assessed
    .sort((a, b) => b.riskScore - a.riskScore || a.name.localeCompare(b.name, "da"))
    .slice(0, Math.max(1, limit));
}
