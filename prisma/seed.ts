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

	const firstNames = [
		"Liam", "Noah", "Oliver", "Elijah", "James", "William", "Benjamin", "Lucas", "Henry", "Alexander",
		"Emma", "Olivia", "Ava", "Sophia", "Isabella", "Mia", "Charlotte", "Amelia", "Harper", "Evelyn"
	];

	const lastNames = [
		"Jensen", "Nielsen", "Hansen", "Pedersen", "Andersen", "Christensen", "Larsen", "Sørensen", "Rasmussen", "Jørgensen",
		"Madsen", "Kristensen", "Olsen", "Thomsen", "Poulsen", "Johansen", "Møller", "Mortensen", "Knudsen", "Jakobsen"
	];

	const now = new Date();
	const employedStart = new Date("2010-01-01");

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

	const employees = Array.from({ length: 250 }, () => {
		const name = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
		const employedAt = randomDate(employedStart, now);

		const hasMembership = Math.random() < 0.75;
		const memberSince = hasMembership ? randomDate(employedAt, now) : null;

		const birthdate = randomBirthdate(employedAt);
		const title = randomTitle();

		return {
			name,
			employedAt,
			memberSince,
			birthdate,
			title,
		};
	});

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
	const createdEmployeesByDepartment: Array<Array<{ id: string }>> = Array.from(
		{ length: departments.length },
		() => [],
	);

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
				...employee,
				departments: {
					connect: [{ id: department.id }],
				},
				managers: {
					connect: [{ id: manager.id }],
				},
			},
		});

		createdEmployeesByDepartment[departmentIndex].push({ id: createdEmployee.id });
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

	// Seed employee-level contact ownership using the new assignment model.
	for (let i = 0; i < createdEmployeesByDepartment.length; i++) {
		const departmentEmployees = createdEmployeesByDepartment[i];
		const primaryRep = createdUnionReps[i];

		for (const employee of departmentEmployees) {
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
	}

	console.log("Seed complete");
	console.log("Admin: admin@unionrep.local / changeme");
	console.log("Union Reps:");
	console.log("  - hbp@unionrep.local (H&T)");
	console.log("  - be@unionrep.local (Byg/CMK)");
	console.log("  - sap@unionrep.local (Vilvorde)");
}

main()
	.catch((e) => {
		console.error("Seed failed:", e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});