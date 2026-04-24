import { SessionUser } from "@/types";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function can(user: SessionUser, permission: string): boolean {
  return user.permissions.includes(permission);
}