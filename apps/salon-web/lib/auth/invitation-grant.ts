/**
 * Same ceiling the invitation-create edge function enforces:
 * the caller must hold invites:manage at that scope, and every permission
 * on the target role.
 */
export function roleIsGrantable(
  callerPermissions: ReadonlySet<string>,
  rolePermissions: readonly string[],
): boolean {
  if (!callerPermissions.has("invites:manage")) return false;
  return rolePermissions.every((permission) => callerPermissions.has(permission));
}
