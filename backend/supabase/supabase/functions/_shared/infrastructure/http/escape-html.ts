/**
 * Escape a string for safe interpolation into HTML text/attribute context.
 * Use for any user- or company-provided value embedded in email HTML.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Sanitize a value for use in an email header display name (e.g. Resend `from`).
 * Strips CR/LF and quotes so it cannot inject or break the header.
 */
export function sanitizeDisplayName(value: unknown): string {
  return String(value ?? "")
    .replace(/[\r\n"]+/g, " ")
    .trim();
}
