const FALLBACK_ORIGIN = "https://booking.salonify.co";

function firstHeader(value: string | null | undefined): string | undefined {
  const first = value?.split(",")[0]?.trim();
  return first || undefined;
}

/**
 * Coerce a public site origin to http(s). Production has shipped
 * `NEXT_PUBLIC_APP_URL=ttps://booking.salonify.co` (leading `h` dropped);
 * `new URL("ttps://…")` is valid in Node, so metadata and deposit return
 * URLs rendered as `ttps://…`. The widget then drops them (`readHttpUrl`
 * requires http/https) and appointment-create toasts DEPOSIT_URLS_REQUIRED.
 */
export function normalizePublicOrigin(value: string | undefined | null): string {
  let raw = (value ?? "").trim().replace(/\/+$/, "");
  if (!raw) return FALLBACK_ORIGIN;

  // Common env typo: https:// → ttps:// (or http:// → ttp://)
  if (/^ttps:\/\//i.test(raw)) {
    raw = `h${raw}`;
  } else if (/^ttp:\/\//i.test(raw)) {
    raw = `h${raw}`;
  }

  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(raw)) {
    raw = `https://${raw.replace(/^\/+/, "")}`;
  }

  try {
    const url = new URL(raw);
    if (!url.host) return FALLBACK_ORIGIN;
    const local =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "[::1]";
    const protocol =
      url.protocol === "http:" || url.protocol === "https:"
        ? url.protocol
        : "https:";
    const safeProtocol = local ? protocol : "https:";
    return `${safeProtocol}//${url.host}`;
  } catch {
    return FALLBACK_ORIGIN;
  }
}

/** Request Host wins so preview/prod return URLs match the page the customer is on. */
export function originFromRequestHeaders(headerList: {
  get(name: string): string | null;
}): string | null {
  const host = firstHeader(
    headerList.get("x-forwarded-host") || headerList.get("host"),
  );
  if (!host) return null;
  const proto = firstHeader(headerList.get("x-forwarded-proto"));
  return normalizePublicOrigin(`${proto || "https"}://${host}`);
}
