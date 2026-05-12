import { SessionUser } from "@/types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function can(user: SessionUser, permission: SessionUser["permissions"][number]): boolean {
  return user.permissions.includes(permission);
}
