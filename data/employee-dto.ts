import "server-only";
import prisma from "@/config/prisma";
import { getCurrentSession } from "./session";
import { can } from "@/lib/utils";
import { logAuditEvent } from "./audit-log-dto";
import { getIP } from "@/lib/ip";

export type UpdateEmployeeDtoInput = {
  employeeId: string;
  name: string;
  title: string | null;
  email: string | null;
  emailAlt: string | null;
  phone: string | null;
  phoneAlt: string | null;
  managerId: string | null;
  chiefManagerId: string | null;
};

export type CreateEmployeeDtoInput = {
  name: string;
  employedAt: Date;
  memberSince: Date | null;
  birthdate: Date | null;
  title: string | null;
  email: string | null;
  emailAlt: string | null;
  phone: string | null;
  phoneAlt: string | null;
  managerId: string | null;
  chiefManagerId: string | null;
};

export type EmployeeMutationResult = {
  ok: boolean;
  reason?: string;
  employeeId?: string;
};

export async function createEmployee(input: CreateEmployeeDtoInput): Promise<EmployeeMutationResult> {
  const currentSession = await getCurrentSession();
  if (!currentSession) return { ok: false, reason: "Ingen aktiv session" };

  const { sessionId, user } = currentSession;
  if (!can(user, "employee:create")) {
    return { ok: false, reason: "Mangler rettighed: employee:create" };
  }

  const managerIds = [input.managerId, input.chiefManagerId].filter(
    (value): value is string => Boolean(value)
  );
  const uniqueManagerIds = [...new Set(managerIds)];

  try {
    const employee = await prisma.employee.create({
      data: {
        name: input.name,
        employedAt: input.employedAt,
        memberSince: input.memberSince,
        birthdate: input.birthdate,
        title: input.title,
        email: input.email,
        emailAlt: input.emailAlt,
        phone: input.phone,
        phoneAlt: input.phoneAlt,
        managers: {
          connect: uniqueManagerIds.map((id) => ({ id })),
        },
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
        managers: true,
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
        : {
          managers: {
            some: {
              OR: [
                {
                  userManagerAccesses: {
                    some: {
                      userId: user.id,
                    },
                  },
                },
                {
                  subordinates: {
                    some: {
                      userManagerAccesses: {
                        some: {
                          userId: user.id,
                        },
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      include: {
        departments: true,
        managers: true,
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
        : {
          managers: {
            some: {
              OR: [
                {
                  userManagerAccesses: {
                    some: {
                      userId: user.id,
                    },
                  },
                },
                {
                  subordinates: {
                    some: {
                      userManagerAccesses: {
                        some: {
                          userId: user.id,
                        },
                      },
                    },
                  },
                },
              ],
            },
          },
        }),
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

  const managerIds = [input.managerId, input.chiefManagerId].filter(
    (value): value is string => Boolean(value)
  );
  const uniqueManagerIds = [...new Set(managerIds)];

  try {
    await prisma.employee.update({
      where: { id: input.employeeId },
      data: {
        name: input.name,
        title: input.title,
        email: input.email,
        emailAlt: input.emailAlt,
        phone: input.phone,
        phoneAlt: input.phoneAlt,
        managers: {
          set: uniqueManagerIds.map((id) => ({ id })),
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

  const access = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      managerAccess: {
        select: {
          manager: {
            select: {
              departments: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const departmentIds = [...new Set(
    (access?.managerAccess ?? [])
      .flatMap((entry) => entry.manager.departments)
      .map((department) => department.id),
  )];

  if (departmentIds.length === 0) {
    return { id: { in: [] as string[] } };
  }

  return {
    departments: {
      some: {
        id: {
          in: departmentIds,
        },
      },
    },
  };
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

      let birthMonth = birthdate.getUTCMonth();
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