import z from "zod";

type Entity = "employee" | "manager" | "user" | "department" | "role" | "permission" | "session" | "key";
type Action = "create" | "read" | "update" | "delete";

export const PERMISSIONS = [
	"employee:create",
	"employee:read",
	"employee:update",
	"employee:delete",
	"department:create",
	"department:read",
	"department:update",
	"department:delete",
	"manager:create",
	"manager:read",
	"manager:update",
	"manager:delete",
	"user:create",
	"user:read",
	"user:update",
	"role:create",
	"role:read",
	"role:update",
	"role:delete",
	"permission:read",
	"session:read",
	"session:delete",
	"key:read",
	"key:update"
] as const;

export const PermissionSchema = z.enum(PERMISSIONS);
export type Permission = `${Entity}:${Action}`;

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
	userId?: string;
	fields: {
		email: string;
	};
	errors: {
		email?: { errors?: string[] };
		password?: { errors?: string[] };
		form?: { errors?: string[] };
	};
};

export type Note = {
	createdAt: Date;
	createdBy: string;
	content: string;
}

export type EmployeeCase = {
	createdAt: Date;
	createdBy: string;
	name: string;
	description: string;
	notes: Note[] | null;
}

export type CasePayloadV1 = {
	name: string;
	description: string;
	notes: Array<{
		createdAt: string; // ISO string in ciphertext payload
		createdBy: string;
		content: string;
	}>;
};

export type EncryptedCaseEnvelopeV1 = {
	v: 1;
	alg: "A256GCM";
	keyVersion: number;
	kid: string; // key identifier
	iv: string; // base64url
	ct: string; // base64url ciphertext + tag
	aad: string; // base64url of canonical AAD JSON
};

export type CreateEncryptedCaseInput = {
	employeeId: string;
	envelope: EncryptedCaseEnvelopeV1;
};

export type StoredEncryptedCase = {
	id: string;
	employeeId: string;
	keyVersion: number;
	envelope: EncryptedCaseEnvelopeV1;
	createdAt: string;
	updatedAt: string;
};

export type CaseAadV1 = {
	kind: "employee-case";
	employeeId: string;
	keyVersion: number;
	kid: string;
};
