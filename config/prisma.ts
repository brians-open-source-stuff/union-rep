import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import "dotenv/config";

const adapter = new PrismaPg({
	connectionString: process.env.DATABASE_URL,
});

const base = new PrismaClient({ adapter });

const prisma = base.$extends({
	query: {
		user: {
			async create({ args, query }) {
				if (args.data.password) {
					args.data.password = await bcrypt.hash(args.data.password, 11);
				}

				return query(args);
			},
			async update({ args, query }) {
				if (args.data.password && typeof args.data.password === 'string') {
					args.data.password = await bcrypt.hash(args.data.password, 11);
				}

				return query(args);
			},
		},
	},
	result: {
		user: {
			validate: {
				needs: { password: true },
				compute(user) {
					return async (plainPassword: string) => {
						return await bcrypt.compare(plainPassword, user.password);
					};
				},
			},
		},
	},
});

export default prisma;