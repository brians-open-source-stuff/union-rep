import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { PERMISSIONS, DEFAULT_ROLE_DEFINITIONS } from "../types";
import bcrypt from "bcrypt";

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
				set: ["employee:read", "department:read", "manager:read"].map((name) => ({ name })),
			},
		},
		create: {
			name: "union_rep",
			permissions: {
				connect: ["employee:read", "department:read", "manager:read"].map((name) => ({ name })),
			},
		},
	});

	// Bootstrap admin user
	await prisma.user.upsert({
		where: { email: "admin@unionrep.local" },
		update: {
			roles: { set: [{ name: "admin" }] },
		},
		create: {
			email: "admin@unionrep.local",
			name: "System Admin",
			password: await bcrypt.hash(process.env.DEFAULT_PASSWORD || "1234", 11),
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
			name: "Northbridge Training Center",
			streetaddress1: "Industrivej 14",
			streetaddress2: null,
			zipcode: 2100,
			city: "Copenhagen",
		},
		{
			name: "Harborview Skills Institute",
			streetaddress1: "Havneplads 8",
			streetaddress2: "2. sal",
			zipcode: 5000,
			city: "Odense",
		},
		{
			name: "Meadowfield Learning Hub",
			streetaddress1: "Engtoften 27",
			streetaddress2: null,
			zipcode: 8000,
			city: "Aarhus",
		},
	];

	const managerNamesByDepartment = [
		["Sofia Berg", "Nikolaj Vester", "Emil Holm"],
		["Freja Lund", "Jonas Mikkelsen", "Maja Riis"],
		["Victor Kjeldsen", "Clara Dahl", "Oskar Møller"],
	];

	const chiefNamesByDepartment = [
		"Lars Andersen",
		"Kirsten Poulsen",
		"Thomas Møller",
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
	await prisma.employee.deleteMany({});
	await prisma.manager.deleteMany({});
	await prisma.department.deleteMany({});

	const departments = await Promise.all(
		departmentsData.map((department) => prisma.department.create({ data: department })),
	);

	// Create chiefs for each department
	const chiefsByDepartment = await Promise.all(
		chiefNamesByDepartment.map((chiefName) =>
			prisma.manager.create({
				data: { name: chiefName },
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

	// Create employees
	const employeeCountPerDepartment = Array.from({ length: departments.length }, () => 0);

	for (let index = 0; index < employees.length; index += 1) {
		const employee = employees[index];
		const departmentIndex = index % departments.length;
		const department = departments[departmentIndex];
		const managerGroup = managersByDepartment[departmentIndex];
		const managerIndex = employeeCountPerDepartment[departmentIndex] % managerGroup.length;
		const manager = managerGroup[managerIndex];

		employeeCountPerDepartment[departmentIndex] += 1;

		await prisma.employee.create({
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
	}

	// Create union_rep users and grant them manager access
	const unionRepUsers = [
		{ email: "anna.jensen@unionrep.local", name: "Anna Jensen" },
		{ email: "bent.nielsen@unionrep.local", name: "Bent Nielsen" },
		{ email: "charlotte.hansen@unionrep.local", name: "Charlotte Hansen" },
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
					roles: { connect: [{ name: "union_rep" }] },
				},
			}),
		),
	);

	// Grant union rep access to managers
	// Anna gets Copenhagen managers, Bent gets Odense, Charlotte gets Aarhus
	for (let i = 0; i < createdUnionReps.length; i++) {
		const user = createdUnionReps[i];
		const managerGroup = managersByDepartment[i];

		for (const manager of managerGroup) {
			const existing = await prisma.userManagerAccess.findFirst({
				where: {
					userId: user.id,
					managerId: manager.id,
				},
			});

			if (!existing) {
				await prisma.userManagerAccess.create({
					data: {
						userId: user.id,
						managerId: manager.id,
					},
				});
			}
		}
	}

	console.log("Seed complete");
	console.log("Admin: admin@unionrep.local / 1234");
	console.log("Union Reps:");
	console.log("  - anna.jensen@unionrep.local (Copenhagen)");
	console.log("  - bent.nielsen@unionrep.local (Odense)");
	console.log("  - charlotte.hansen@unionrep.local (Aarhus)");
}

main()
	.catch((e) => {
		console.error("Seed failed:", e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});