/**
 * Public marketplace path segment. Listed slugs are globally unique,
 * case-insensitive (location_listed_slug_key).
 */
export function normalizeSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/æ/g, "ae")
    .replace(/œ/g, "oe")
    .replace(/ø/g, "o")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/** Kebab-case, lowercase, ascii slug prefilled from a location name. */
export function slugFromName(name: string): string {
  return normalizeSlug(name);
}

/**
 * Next candidate after a 23505 on location_listed_slug_key (or the
 * per-company slug unique index). "studio" -> "studio-2", "studio-2" -> "studio-3".
 */
export function suggestAlternativeSlug(slug: string): string {
  const normalized = normalizeSlug(slug);
  const base = normalized.replace(/-\d+$/, "") || "locatie";
  const match = normalized.match(/-(\d+)$/);
  const next = match ? Number(match[1]) + 1 : 2;
  return `${base}-${next}`;
}

export function isUniqueViolation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "23505") return true;
  return (error.message ?? "").toLowerCase().includes("duplicate key");
}
