import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { PERMISSIONS, DEFAULT_ROLE_DEFINITIONS } from "../types";

import bcrypt from "bcrypt";
import { generateSecret } from "otplib";

const adapter = new PrismaPg({
	connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
	for (const name of PERMISSIONS) {
		await prisma.permission.upsert({
			where: { name },
			update: {},
			create: { name },
		});
	}

	// Create roles
	for (const [roleName, permissionNames] of Object.entries(DEFAULT_ROLE_DEFINITIONS)) {
		await prisma.role.upsert({
			where: { name: roleName },
			update: {
				permissions: {
					set: permissionNames.map((name) => ({ name })),
				},
			},
			create: {
				name: roleName,
				permissions: {
					connect: permissionNames.map((name) => ({ name })),
				},
			},
		});
	}

	// Create union_rep role (read-only access for union representatives)
	await prisma.role.upsert({
		where: { name: "union_rep" },
		update: {
			permissions: {
				set: ["employee:create", "employee:read", "employee:update", "employee:delete", "department:read"].map((name) => ({ name })),
			},
		},
		create: {
			name: "union_rep",
			permissions: {
				connect: ["employee:create", "employee:read", "employee:update", "employee:delete", "department:read"].map((name) => ({ name })),
			},
		},
	});

	// Bootstrap admin user
	const adminUser = await prisma.user.upsert({
		where: { email: "admin@unionrep.local" },
		update: {
			roles: { set: [{ name: "admin" }] },
		},
		create: {
			email: "admin@unionrep.local",
			name: "System Admin",
			password: await bcrypt.hash(process.env.DEFAULT_PASSWORD || "1234", 11),
			otpsecret: generateSecret(),
			roles: { connect: [{ name: "admin" }] },
		},
	});

	function randomDate(start: Date, end: Date) {
		const startTime = start.getTime();
		const endTime = end.getTime();
		return new Date(startTime + Math.random() * (endTime - startTime));
	}

	function randomBirthdate(employedAt: Date) {
		const latestBirth = new Date(employedAt);
		latestBirth.setFullYear(latestBirth.getFullYear() - 20);

		const earliestBirth = new Date(employedAt);
		earliestBirth.setFullYear(earliestBirth.getFullYear() - 67);

		return randomDate(earliestBirth, latestBirth);
	}

	function randomTitle() {
		const roll = Math.random();
		if (roll < 0.85) return "Underviser";
		if (roll < 0.90) return "Vejleder";
		if (roll < 0.95) return "Konsulent";
		return "Mentor";
	}

	function randomLastContact(employedAt: Date, currentDate: Date): Date | null {
		const roll = Math.random();

		// Weighted distribution for realistic follow-up patterns:
		// 60% recent (0-30 days), 25% mild stale (31-75 days),
		// 10% stale (76-180 days), 3% very stale (181-365 days), 2% no contact.
		if (roll < 0.02) return null;

		const daysAgo = (() => {
			if (roll < 0.62) return Math.floor(Math.random() * 31);
			if (roll < 0.87) return 31 + Math.floor(Math.random() * 45);
			if (roll < 0.97) return 76 + Math.floor(Math.random() * 105);
			return 181 + Math.floor(Math.random() * 185);
		})();

		const candidate = new Date(currentDate);
		candidate.setDate(candidate.getDate() - daysAgo);

		if (candidate < employedAt) {
			return randomDate(employedAt, currentDate);
		}

		return candidate;
	}

	const firstNames = [
		"Liam", "Noah", "Oliver", "Elijah", "James", "William", "Benjamin", "Lucas", "Henry", "Alexander",
		"Emma", "Olivia", "Ava", "Sophia", "Isabella", "Mia", "Charlotte", "Amelia", "Harper", "Evelyn"
	];

	const lastNames = [
		"Jensen", "Nielsen", "Hansen", "Pedersen", "Andersen", "Christensen", "Larsen", "Sørensen", "Rasmussen", "Jørgensen",
		"Madsen", "Kristensen", "Olsen", "Thomsen", "Poulsen", "Johansen", "Møller", "Mortensen", "Knudsen", "Jakobsen"
	];

	const now = new Date();
	const employedStart = new Date(now.getFullYear() - 45, now.getMonth(), 1);
	const TOTAL_EMPLOYEES = 1000;
	const MIN_ACTIVE_EMPLOYEES = 180;
	const MAX_ACTIVE_EMPLOYEES = 210;

	const departmentsData = [
		{
			name: "Håndværk og Teknik",
			streetaddress1: "Pulsen 2",
			streetaddress2: null,
			zipcode: 4000,
			city: "Roskilde",
		},
		{
			name: "Byg/CMK",
			streetaddress1: "Pulsen 8",
			streetaddress2: null,
			zipcode: 4000,
			city: "Roskilde",
		},
		{
			name: "Akademiet for grønne uddannelser",
			streetaddress1: "Køgevej 131",
			streetaddress2: null,
			zipcode: 4000,
			city: "Roskilde",
		},
	];

	const managerNamesByDepartment = [
		["Carsten Erik Engsbye Heigren", "Jonas Valentin-Hvidberg", "Henrik Kastrup Lund", "Torben Matthiesen"],
		["Søren Bartholdy", "Mads Christian Brøkner Bendix", "Astrid Holmgaard Jensen"],
		["Dorthe Kold Navntoft", "Susanne Ogstrup", "Claus Egede Cornelius"],
	];

	const chiefNamesByDepartment = [
		"Kirsten Bach",
		"Anders Kold",
		"Niels-Ole Vibo Jensen",
	];

	function monthIndex(date: Date) {
		return date.getFullYear() * 12 + date.getMonth();
	}

	function firstDayOfMonth(year: number, month: number) {
		return new Date(year, month, 1);
	}

	function lastDayOfMonth(year: number, month: number) {
		return new Date(year, month + 1, 0);
	}

	function randomMonthStart(start: Date, end: Date) {
		const startIndex = monthIndex(start);
		const endIndex = monthIndex(end);
		const pickedIndex = startIndex + Math.floor(Math.random() * (endIndex - startIndex + 1));
		const year = Math.floor(pickedIndex / 12);
		const month = pickedIndex % 12;

		return firstDayOfMonth(year, month);
	}

	function randomTenureMonths() {
		const minMonths = 12;
		const maxMonths = 45 * 12;
		// Skew towards shorter tenures while allowing full 1-45 year spread.
		const weighted = Math.pow(Math.random(), 4.5);
		return minMonths + Math.round((maxMonths - minMonths) * weighted);
	}

	type SeedEmployee = {
		name: string;
		employedAt: Date;
		employmentEndedAt: Date | null;
		anonymizedAt: Date | null;
		lastContact: Date | null;
		memberSince: Date | null;
		birthdate: Date | null;
		title: string | null;
		email: string | null;
		emailAlt: string | null;
		phone: string | null;
		phoneAlt: string | null;
		gdprConsent: Date | null;
		isActive: boolean;
	};

	function buildEmployees(): SeedEmployee[] {
		return Array.from({ length: TOTAL_EMPLOYEES }, (_, index) => {
			const employedAt = randomMonthStart(employedStart, now);
			const tenureMonths = randomTenureMonths();
			const retirementMonth = new Date(employedAt.getFullYear(), employedAt.getMonth() + tenureMonths, 1);
			const retirementAt = lastDayOfMonth(retirementMonth.getFullYear(), retirementMonth.getMonth());
			const isActive = retirementAt > now;

			if (isActive) {
				const name = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
				const hasMembership = Math.random() < 0.75;
				const memberSince = hasMembership ? randomDate(employedAt, now) : null;

				return {
					name,
					employedAt,
					employmentEndedAt: null,
					anonymizedAt: null,
					lastContact: randomLastContact(employedAt, now),
					memberSince,
					birthdate: randomBirthdate(employedAt),
					title: randomTitle(),
					email: null,
					emailAlt: null,
					phone: null,
					phoneAlt: null,
					gdprConsent: null,
					isActive: true,
				};
			}

			const hasMembership = Math.random() < 0.65;
			const memberSince = hasMembership ? randomDate(employedAt, retirementAt) : null;

			return {
				name: `Anonymiseret medarbejder (${String(index + 1).padStart(4, "0")})`,
				employedAt,
				employmentEndedAt: retirementAt,
				anonymizedAt: retirementAt,
				lastContact: null,
				memberSince,
				birthdate: null,
				title: null,
				email: null,
				emailAlt: null,
				phone: null,
				phoneAlt: null,
				gdprConsent: null,
				isActive: false,
			};
		});
	}

	let employees = buildEmployees();
	let activeNow = employees.filter((employee) => employee.isActive).length;
	let bestEmployees = employees;
	let bestDistance = Math.min(
		Math.abs(activeNow - MIN_ACTIVE_EMPLOYEES),
		Math.abs(activeNow - MAX_ACTIVE_EMPLOYEES),
	);

	for (let attempt = 0; attempt < 80; attempt += 1) {
		if (activeNow >= MIN_ACTIVE_EMPLOYEES && activeNow <= MAX_ACTIVE_EMPLOYEES) {
			bestEmployees = employees;
			break;
		}

		const candidate = buildEmployees();
		const candidateActiveNow = candidate.filter((employee) => employee.isActive).length;
		const candidateDistance = Math.min(
			Math.abs(candidateActiveNow - MIN_ACTIVE_EMPLOYEES),
			Math.abs(candidateActiveNow - MAX_ACTIVE_EMPLOYEES),
		);

		if (candidateDistance < bestDistance) {
			bestEmployees = candidate;
			bestDistance = candidateDistance;
		}

		employees = candidate;
		activeNow = candidateActiveNow;
	}

	employees = bestEmployees;

	// Reset fictional data
	await prisma.userAssignment.deleteMany({});
	await prisma.employee.deleteMany({});
	await prisma.manager.deleteMany({});
	await prisma.department.deleteMany({});

	const departments = await Promise.all(
		departmentsData.map((department) => prisma.department.create({ data: department })),
	);

	// Create chiefs for each department
	const chiefsByDepartment = await Promise.all(
		chiefNamesByDepartment.map((chiefName, departmentIndex) =>
			prisma.manager.create({
				data: {
					name: chiefName,
					title: "Uddannelseschef",
					departments: {
						connect: [{ id: departments[departmentIndex].id }],
					},
				},
			}),
		),
	);

	// Create regular managers and assign them to chiefs
	const managersByDepartment = await Promise.all(
		managerNamesByDepartment.map(async (managerNames, departmentIndex) => {
			const department = departments[departmentIndex];
			const chief = chiefsByDepartment[departmentIndex];

			return Promise.all(
				managerNames.map((name) =>
					prisma.manager.create({
						data: {
							name,
							title: "Uddannelsesleder",
							chiefId: chief.id,
							departments: {
								connect: [{ id: department.id }],
							},
						},
					}),
				),
			);
		}),
	);

	// Create union_rep users used for assignment-based access
	const unionRepUsers = [
		{ email: "hbp@unionrep.local", name: "Henrik Bjørn Pedersen" },
		{ email: "be@unionrep.local", name: "Brian Emilius" },
		{ email: "sap@unionrep.local", name: "Steen Aagaard" },
	];

	const createdUnionReps = await Promise.all(
		unionRepUsers.map(async (userInfo) =>
			prisma.user.upsert({
				where: { email: userInfo.email },
				update: {
					roles: { set: [{ name: "union_rep" }] },
				},
				create: {
					email: userInfo.email,
					name: userInfo.name,
					password: await bcrypt.hash(process.env.DEFAULT_PASSWORD || "1234", 11),
					otpsecret: generateSecret(),
					roles: { connect: [{ name: "union_rep" }] },
				},
			}),
		),
	);

	// Create employees
	const employeeCountPerDepartment = Array.from({ length: departments.length }, () => 0);
	const createdEmployees: Array<{ id: string; isActive: boolean }> = [];

	for (let index = 0; index < employees.length; index += 1) {
		const employee = employees[index];
		const departmentIndex = index % departments.length;
		const department = departments[departmentIndex];
		const managerGroup = managersByDepartment[departmentIndex];
		const managerIndex = employeeCountPerDepartment[departmentIndex] % managerGroup.length;
		const manager = managerGroup[managerIndex];

		employeeCountPerDepartment[departmentIndex] += 1;

		const createdEmployee = await prisma.employee.create({
			data: {
				name: employee.name,
				employedAt: employee.employedAt,
				employmentEndedAt: employee.employmentEndedAt,
				anonymizedAt: employee.anonymizedAt,
				lastContact: employee.lastContact,
				memberSince: employee.memberSince,
				birthdate: employee.birthdate,
				title: employee.title,
				email: employee.email,
				emailAlt: employee.emailAlt,
				phone: employee.phone,
				phoneAlt: employee.phoneAlt,
				gdprConsent: employee.gdprConsent,
				departments: {
					connect: [{ id: department.id }],
				},
				managers: {
					connect: [{ id: manager.id }],
				},
			},
		});

		createdEmployees.push({ id: createdEmployee.id, isActive: employee.isActive });
	}

	// Grant union rep access with assignment-based department scopes
	for (let i = 0; i < createdUnionReps.length; i++) {
		const user = createdUnionReps[i];
		const department = departments[i];

		const existing = await prisma.userAssignment.findFirst({
			where: {
				userId: user.id,
				departmentId: department.id,
				relationshipType: "department_scope",
			},
		});

		if (!existing) {
			await prisma.userAssignment.create({
				data: {
					userId: user.id,
					departmentId: department.id,
					relationshipType: "department_scope",
					isPrimary: true,
				},
			});
		}
	}

	// Seed employee-level contact ownership for active employees only.
	const activeEmployees = createdEmployees.filter((employee) => employee.isActive);

	for (let i = 0; i < activeEmployees.length; i++) {
		const employee = activeEmployees[i];
		const primaryRep = createdUnionReps[i % createdUnionReps.length];

		await prisma.userAssignment.create({
			data: {
				userId: primaryRep.id,
				employeeId: employee.id,
				relationshipType: "primary_contact",
				isPrimary: true,
			},
		});

		await prisma.userAssignment.create({
			data: {
				userId: adminUser.id,
				employeeId: employee.id,
				relationshipType: "secondary_contact",
				isPrimary: false,
			},
		});
	}

	console.log("Seed complete");
	console.log("Admin: admin@unionrep.local / changeme");
	console.log("Union Reps:");
	console.log("  - hbp@unionrep.local (H&T)");
	console.log("  - be@unionrep.local (Byg/CMK)");
	console.log("  - sap@unionrep.local (Vilvorde)");
	console.log(`Employees seeded: ${TOTAL_EMPLOYEES}`);
	console.log(`Active employees now: ${activeEmployees.length}`);
	console.log(`Inactive employees: ${TOTAL_EMPLOYEES - activeEmployees.length}`);
	console.log(`Active employees per union rep: ${activeEmployees.length / createdUnionReps.length}`);
}

main()
	.catch((e) => {
		console.error("Seed failed:", e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});