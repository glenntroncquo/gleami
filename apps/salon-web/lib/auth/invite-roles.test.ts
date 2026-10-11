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
  "calendar:manage",
  "clients:manage",
  "dashboard:read",
  "marketing:manage",
  "orders:manage",
  "pos:manage",
  "products:manage",
  "settings:manage",
  "staff:manage",
  "treatments:manage",
]);

const managerPerms = new Set([
  "dashboard:read",
  "calendar:manage",
  "staff:manage",
  "clients:manage",
  "treatments:manage",
  "pos:manage",
  "orders:manage",
  "products:manage",
  "marketing:manage",
]);

const stylistPerms = [
  "calendar:manage",
  "staff:manage",
  "clients:manage",
  "treatments:manage",
  "pos:manage",
  "products:manage",
  "marketing:manage",
];

const freelancerPerms = [
  "calendar:manage",
  "staff:manage",
  "pos:manage",
  "products:manage",
];

const roles: InviteRoleOption[] = [
  { id: "owner", name: "owner", scope: "company", permissions: [...ownerPerms] },
  {
    id: "admin",
    name: "admin",
    scope: "company",
    permissions: [...ownerPerms].filter((key) => key !== "billing:manage"),
  },
  { id: "manager", name: "manager", scope: "location", permissions: [...managerPerms] },
  { id: "stylist", name: "stylist", scope: "location", permissions: stylistPerms },
  { id: "freelancer", name: "freelancer", scope: "location", permissions: freelancerPerms },
];

const ownerCompany = inviteRolesForScope(roles, "company", ownerPerms).map((role) => role.name);
assertEqual(ownerCompany, ["admin", "owner"], "owner can grant admin before owner");

const ownerLocation = inviteRolesForScope(roles, "location", ownerPerms).map((role) => role.name);
assertEqual(ownerLocation, ["manager", "stylist", "freelancer"], "owner can grant location roles");

const managerCompany = inviteRolesForScope(roles, "company", managerPerms);
assertEqual(managerCompany, [], "location manager cannot grant company roles");

const managerLocation = inviteRolesForScope(roles, "location", managerPerms).map((role) => role.name);
assertEqual(managerLocation, ["manager", "stylist", "freelancer"], "manager can grant location roles they hold");

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
