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

  const { user } = currentSession;

  if (!can(user, "employee:read")) return null;

  const isAdmin = user.roles.includes("admin");

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

export async function getEmployeeCounts() {
  const [totalEmployees, members] = await Promise.all([
    prisma.employee.count(),
    prisma.employee.count({
      where: {
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

type EmployeeMembershipPoint = {
  month: Date;
  employees: number;
  members: number;
};

export async function getEmployeeMembershipTimeline() {
  const rows = await prisma.$queryRaw<EmployeeMembershipPoint[]>`
    WITH bounds AS (
  SELECT
    (date_trunc('month', CURRENT_DATE) - interval '23 months')::date AS start_month,
    date_trunc('month', CURRENT_DATE)::date AS end_month
),
    months AS (
      SELECT generate_series(start_month, end_month, interval '1 month')::date AS month
      FROM bounds
      WHERE start_month IS NOT NULL
    )
    SELECT
      m.month,
      (
        SELECT COUNT(*)::int
        FROM "app"."Employee" e
        WHERE e."employedAt" < (m.month + interval '1 month')
      ) AS employees,
      (
        SELECT COUNT(*)::int
        FROM "app"."Employee" e
        WHERE e."memberSince" IS NOT NULL
          AND e."memberSince" < (m.month + interval '1 month')
      ) AS members
    FROM months m
    ORDER BY m.month;
  `;

  return rows.map((r) => ({
    month: r.month.toISOString().slice(0, 7), // YYYY-MM for Recharts X axis
    employees: r.employees,
    members: r.members,
    membershipRate: r.employees === 0 ? 0 : r.members / r.employees,
  }));
}

export type BirthdayThisWeek = {
  name: string;
  birthdate: Date;
  age: number;
};

export async function getMemberBirthdaysThisWeek() {
  const rows = await prisma.$queryRaw<BirthdayThisWeek[]>`
    WITH week_bounds AS (
      SELECT
        date_trunc('week', CURRENT_DATE)::date AS week_start,
        (date_trunc('week', CURRENT_DATE) + interval '6 days')::date AS week_end
    ),
    candidates AS (
      SELECT
        e."name",
        e."birthdate",
        -- Handle Feb 29 birthdays in non-leap years by falling back to Feb 28
        CASE
          WHEN EXTRACT(MONTH FROM e."birthdate") = 2
           AND EXTRACT(DAY FROM e."birthdate") = 29
           AND NOT (
             EXTRACT(YEAR FROM CURRENT_DATE)::int % 4 = 0 AND (
               EXTRACT(YEAR FROM CURRENT_DATE)::int % 100 != 0 OR
               EXTRACT(YEAR FROM CURRENT_DATE)::int % 400 = 0
             )
           )
          THEN make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, 2, 28)
          ELSE make_date(
            EXTRACT(YEAR FROM CURRENT_DATE)::int,
            EXTRACT(MONTH FROM e."birthdate")::int,
            EXTRACT(DAY FROM e."birthdate")::int
          )
        END AS birthday_this_year
      FROM "app"."Employee" e
      WHERE e."memberSince" IS NOT NULL
        AND e."birthdate" IS NOT NULL
    )
    SELECT
      c."name",
      c."birthdate",
      (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM c."birthdate"))::int AS age
    FROM candidates c, week_bounds w
    WHERE c.birthday_this_year BETWEEN w.week_start AND w.week_end
    ORDER BY c.birthday_this_year;
  `;

  return rows;
}

export type UpcomingAnniversary = {
  name: string;
  employedAt: Date;
  years: number;
};

export async function getMemberEmploymentAnniversaries() {
  const rows = await prisma.$queryRaw<UpcomingAnniversary[]>`
    WITH today AS (
      SELECT CURRENT_DATE AS d
    ),
    candidates AS (
      SELECT
        e."name",
        e."employedAt",
        EXTRACT(YEAR FROM CURRENT_DATE)::int - EXTRACT(YEAR FROM e."employedAt")::int AS years_employed,
        CASE
          WHEN EXTRACT(MONTH FROM e."employedAt") = 2
           AND EXTRACT(DAY FROM e."employedAt") = 29
           AND NOT (
             EXTRACT(YEAR FROM CURRENT_DATE)::int % 4 = 0 AND (
               EXTRACT(YEAR FROM CURRENT_DATE)::int % 100 != 0 OR
               EXTRACT(YEAR FROM CURRENT_DATE)::int % 400 = 0
             )
           )
          THEN make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, 2, 28)
          ELSE make_date(
            EXTRACT(YEAR FROM CURRENT_DATE)::int,
            EXTRACT(MONTH FROM e."employedAt")::int,
            EXTRACT(DAY FROM e."employedAt")::int
          )
        END AS anniversary_this_year
      FROM "app"."Employee" e
      WHERE e."memberSince" IS NOT NULL
        AND e."employedAt" IS NOT NULL
    )
    SELECT
      c."name",
      c."employedAt",
      c.years_employed AS years
    FROM candidates c, today t
    WHERE c.years_employed IN (25, 40)
      AND c.anniversary_this_year BETWEEN t.d AND (t.d + interval '30 days')
    ORDER BY c.anniversary_this_year;
  `;

  return rows;
}