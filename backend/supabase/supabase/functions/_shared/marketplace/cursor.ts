const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface SearchCursor {
  score: number;
  locationId: string;
}

function toBase64Url(value: string): string {
  const base64 = btoa(value);
  return base64.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fromBase64Url(value: string): string {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return atob(padded);
}

/** Opaque cursor. Clients must not parse it. */
export function encodeSearchCursor(score: number, locationId: string): string {
  return toBase64Url(JSON.stringify({ s: score, id: locationId }));
}

export function decodeSearchCursor(cursor: string): SearchCursor | null {
  if (!cursor || cursor.length > 200) return null;

  try {
    const parsed = JSON.parse(fromBase64Url(cursor)) as { s?: unknown; id?: unknown };
    if (typeof parsed.s !== "number" || !Number.isFinite(parsed.s)) return null;
    if (typeof parsed.id !== "string" || !UUID.test(parsed.id)) return null;
    return { score: parsed.s, locationId: parsed.id.toLowerCase() };
  } catch {
    return null;
  }
}
