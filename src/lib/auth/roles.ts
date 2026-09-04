import { USER_ROLES } from "@/lib/domain/status";
import type { UserRole } from "@/types/user";

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && (USER_ROLES as readonly string[]).includes(value);
}

export function canAccessCreatorArea(role: unknown): boolean {
  return isUserRole(role) && (role === "creator" || role === "admin");
}

export function canAccessAdminArea(role: unknown): boolean {
  return role === "admin";
}
