export const ROLES = ["owner", "admin", "manager", "member", "client"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "org:manage", "billing:manage", "team:manage", "roles:manage",
  "crm:read", "crm:write", "projects:read", "projects:write",
  "proposals:read", "proposals:write", "invoices:read", "invoices:write",
  "payments:read", "payments:write", "automations:manage", "reports:read",
  "portal:access",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const staffRead: Permission[] = ["crm:read", "projects:read", "proposals:read", "invoices:read", "payments:read"];
const manager: Permission[] = [
  ...staffRead, "crm:write", "projects:write", "proposals:write", "invoices:write", "payments:write", "reports:read",
];

export const DEFAULT_ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  owner: new Set(PERMISSIONS.filter((p) => p !== "portal:access")),
  admin: new Set<Permission>([...manager, "team:manage", "automations:manage", "org:manage"]),
  manager: new Set<Permission>(manager),
  member: new Set<Permission>([...staffRead, "projects:write", "crm:write"]),
  client: new Set<Permission>(["portal:access"]),
};

export function can(role: Role, perm: Permission, overrides?: { grant?: Permission[]; revoke?: Permission[] }): boolean {
  if (overrides?.revoke?.includes(perm)) return false;
  return DEFAULT_ROLE_PERMISSIONS[role].has(perm) || Boolean(overrides?.grant?.includes(perm));
}

export class ForbiddenError extends Error {
  constructor(perm: Permission) { super(`Missing permission: ${perm}`); this.name = "ForbiddenError"; }
}
export function assertCan(role: Role, perm: Permission, o?: Parameters<typeof can>[2]): void {
  if (!can(role, perm, o)) throw new ForbiddenError(perm);
}
