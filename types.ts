import z from "zod";

export const PERMISSIONS = [
	"employee:read",
	"employee:create",
	"employee:update",
	"employee:delete",
	"department:read",
	"department:create",
	"department:update",
	"department:delete",
	"manager:read",
	"manager:create",
	"manager:update",
	"manager:delete",
	"role:read",
	"role:manage",
	"permission:read",
] as const;

export const PermissionSchema = z.enum(PERMISSIONS);
export type Permission = z.infer<typeof PermissionSchema>;

export const DEFAULT_ROLE_DEFINITIONS = {
	admin: [...PERMISSIONS],
} satisfies Record<string, readonly Permission[]>;

export const SessionUserSchema = z.object({
	id: z.string(),
	name: z.string(),
	roles: z.array(z.string()),
	permissions: z.array(PermissionSchema)
});

export type SessionUser = z.infer<typeof SessionUserSchema>;

export type LoginFormState = {
	success: boolean;
	fields: {
		email: string;
	};
	errors: {
		email?: { errors?: string[] };
		password?: { errors?: string[] };
		form?: { errors?: string[] };
	};
};