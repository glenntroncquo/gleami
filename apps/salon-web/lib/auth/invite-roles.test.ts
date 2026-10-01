import { defaultInviteRoleId, inviteRolesForScope, type InviteRoleOption } from "./invite-roles";

function assertEqual(actual: unknown, expected: unknown, message: string) {
  const actualText = JSON.stringify(actual);
  const expectedText = JSON.stringify(expected);
  if (actualText !== expectedText) {
    throw new Error(`${message}\n  expected: ${expectedText}\n  actual:   ${actualText}`);
  }
}

const ownerPerms = new Set([
  "billing:manage",
  "calendar:read",
  "calendar:write",
  "catalog:manage",
  "clients:manage",
  "clients:read",
  "invites:manage",
  "locations:manage",
  "locations:read",
  "pos:manage",
  "pos:read",
  "pos:refund",
  "schedule:manage",
  "settings:manage",
  "staff:manage",
]);

const managerPerms = new Set([
  "locations:read",
  "calendar:read",
  "calendar:write",
  "schedule:manage",
  "catalog:manage",
  "staff:manage",
  "clients:read",
  "clients:manage",
  "pos:read",
  "pos:manage",
  "pos:refund",
  "invites:manage",
]);

const roles: InviteRoleOption[] = [
  { id: "owner", name: "owner", scope: "company", permissions: [...ownerPerms] },
  {
    id: "admin",
    name: "admin",
    scope: "company",
    permissions: [...ownerPerms].filter((key) => key !== "billing:manage"),
  },
  { id: "manager", name: "manager", scope: "location", permissions: [...managerPerms] },
  {
    id: "stylist",
    name: "stylist",
    scope: "location",
    permissions: ["locations:read", "calendar:read", "calendar:write", "clients:read", "clients:manage", "pos:read"],
  },
  {
    id: "staff",
    name: "staff",
    scope: "location",
    permissions: ["locations:read", "calendar:read", "clients:read", "pos:read"],
  },
];

const ownerCompany = inviteRolesForScope(roles, "company", ownerPerms).map((role) => role.name);
assertEqual(ownerCompany, ["admin", "owner"], "owner can grant admin before owner");

const ownerLocation = inviteRolesForScope(roles, "location", ownerPerms).map((role) => role.name);
assertEqual(ownerLocation, ["manager", "stylist", "staff"], "owner can grant location roles");

const managerCompany = inviteRolesForScope(roles, "company", managerPerms);
assertEqual(managerCompany, [], "location manager cannot grant company roles");

const managerLocation = inviteRolesForScope(roles, "location", managerPerms).map((role) => role.name);
assertEqual(managerLocation, ["manager", "stylist", "staff"], "manager can grant location roles they hold");

assertEqual(
  defaultInviteRoleId(inviteRolesForScope(roles, "location", ownerPerms)),
  "stylist",
  "location invites default to stylist",
);
assertEqual(
  defaultInviteRoleId(inviteRolesForScope(roles, "company", ownerPerms)),
  "admin",
  "company invites default to admin",
);

console.log("invite-roles.test.ts passed");
