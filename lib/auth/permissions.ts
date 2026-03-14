import { ProblemDetail } from "@/lib/utils/errors";

export const PERMISSIONS = [
  { resource: "demand", action: "read" },
  { resource: "demand", action: "write" },
  { resource: "supply", action: "read" },
  { resource: "supply", action: "write" },
  { resource: "inventory", action: "read" },
  { resource: "inventory", action: "write" },
  { resource: "scenarios", action: "write" },
  { resource: "sop", action: "write" },
  { resource: "suppliers", action: "write" },
  { resource: "analytics", action: "read" },
  { resource: "integrations", action: "write" },
  { resource: "master_data", action: "write" },
  { resource: "portal", action: "write" },
  { resource: "users", action: "read" },
  { resource: "users", action: "write" },
  { resource: "api_keys", action: "read" },
  { resource: "api_keys", action: "write" }
] as const;

export type Permission = (typeof PERMISSIONS)[number];
export type Role =
  | "super_admin"
  | "sop_manager"
  | "planner"
  | "procurement"
  | "viewer"
  | "integration_admin"
  | "supplier";

const allPermissions: Permission[] = [...PERMISSIONS];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: allPermissions,
  sop_manager: [
    { resource: "demand", action: "write" },
    { resource: "supply", action: "read" },
    { resource: "inventory", action: "read" },
    { resource: "scenarios", action: "write" },
    { resource: "sop", action: "write" },
    { resource: "users", action: "read" },
    { resource: "api_keys", action: "read" }
  ],
  planner: [
    { resource: "demand", action: "write" },
    { resource: "supply", action: "write" },
    { resource: "inventory", action: "write" },
    { resource: "scenarios", action: "write" },
    { resource: "users", action: "read" },
    { resource: "api_keys", action: "read" }
  ],
  procurement: [
    { resource: "supply", action: "write" },
    { resource: "suppliers", action: "write" },
    { resource: "inventory", action: "read" },
    { resource: "users", action: "read" }
  ],
  viewer: [
    { resource: "demand", action: "read" },
    { resource: "supply", action: "read" },
    { resource: "inventory", action: "read" },
    { resource: "analytics", action: "read" }
  ],
  integration_admin: [
    { resource: "integrations", action: "write" },
    { resource: "master_data", action: "write" },
    { resource: "users", action: "read" }
  ],
  supplier: [{ resource: "portal", action: "write" }]
};

export function hasPermission(userRole: Role, resource: string, action: string): boolean {
  if (userRole === "super_admin") {
    return true;
  }

  return ROLE_PERMISSIONS[userRole].some(
    (permission) => permission.resource === resource && permission.action === action
  );
}

export function requirePermission(userRole: Role, resource: string, action: string): void {
  if (!hasPermission(userRole, resource, action)) {
    throw new ProblemDetail(403, "Forbidden", `Missing permission: ${resource}:${action}`);
  }
}