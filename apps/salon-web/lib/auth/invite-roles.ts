import { roleIsGrantable } from "./invitation-grant";

export type InviteScope = "company" | "location";

export type InviteRoleOption = {
  id: string;
  name: string;
  scope: InviteScope;
  permissions: string[];
};

const ROLE_ORDER: Record<InviteScope, readonly string[]> = {
  company: ["admin", "owner"],
  location: ["manager", "stylist", "staff", "freelancer"],
};

function roleRank(scope: InviteScope, name: string): number {
  const index = ROLE_ORDER[scope].indexOf(name);
  return index === -1 ? ROLE_ORDER[scope].length : index;
}

export function defaultInviteRoleId(roles: readonly InviteRoleOption[]): string | null {
  const preferred = roles[0]?.scope === "company" ? "admin" : "stylist";
  return roles.find((role) => role.name === preferred)?.id ?? roles[0]?.id ?? null;
}

export function inviteRolesForScope(
  roles: readonly InviteRoleOption[],
  scope: InviteScope,
  callerPermissions: ReadonlySet<string>,
): InviteRoleOption[] {
  return roles
    .filter(
      (role) =>
        role.scope === scope && roleIsGrantable(callerPermissions, role.permissions),
    )
    .sort(
      (left, right) =>
        roleRank(scope, left.name) - roleRank(scope, right.name) ||
        left.name.localeCompare(right.name),
    );
}

