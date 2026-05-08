import { Permission, SessionUser } from "@/types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function can(user: SessionUser, permission: Permission): boolean {
  return user.permissions.includes(permission);
}
