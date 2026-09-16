/** Reserved first-segment paths that are not company booking slugs. */
export const RESERVED_PUBLIC_SLUGS = ["privacy", "terms"] as const;

export function isReservedPublicSlug(value: string): boolean {
  return (RESERVED_PUBLIC_SLUGS as readonly string[]).includes(value);
}
