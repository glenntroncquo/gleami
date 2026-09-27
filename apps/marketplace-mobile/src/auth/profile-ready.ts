import type { AuthUser } from '@/src/auth/auth-context';

/** UI readiness only; the server still authenticates each booking request. */
export function isProfileReady(user: AuthUser | null): user is AuthUser & { profileComplete: true } {
  return Boolean(
    user?.profileComplete &&
    user.firstName.trim() &&
    user.lastName.trim() &&
    user.phone.trim() &&
    user.email.trim(),
  );
}
