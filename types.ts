import z from "zod";

export const SessionUserSchema = z.object({
	id: z.string(),
	name: z.string(),
	role: z.string(),
	permissions: z.array(z.string())
});

export type SessionUser = z.infer<typeof SessionUserSchema>;