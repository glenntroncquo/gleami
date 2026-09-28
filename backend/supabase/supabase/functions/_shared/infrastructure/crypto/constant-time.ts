/**
 * Compares two strings without short-circuiting on the first differing byte,
 * so an attacker cannot recover a secret one character at a time by timing
 * repeated requests.
 */
export function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
