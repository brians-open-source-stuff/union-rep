import prisma from "@/config/prisma";
import { cookies } from "next/headers";
import "server-only";
import { getSession } from "./session";

export async function getEmployees() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("ur_session");
  const session = await getSession(sessionCookie?.value ?? "");

  if (!session) {
    return [];
  }

  const isAdmin = session.roles.includes("admin");

  const employees = await prisma.employee.findMany({
    where: isAdmin
      ? undefined
      : {
        managers: {
          some: {
            userManagerAccesses: {
              some: {
                userId: session.id,
              },
            },
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