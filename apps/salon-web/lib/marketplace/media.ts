export const MARKETPLACE_BUCKET = "marketplace";
export const MARKETPLACE_MAX_BYTES = 10 * 1024 * 1024;
export const DESCRIPTION_LIMIT = 1000;

export const MARKETPLACE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export type MarketplaceMime = (typeof MARKETPLACE_MIME_TYPES)[number];

const MIME_EXTENSION: Record<MarketplaceMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

const EXTENSION_MIME: Record<string, MarketplaceMime> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

export function isMarketplaceMime(value: string): value is MarketplaceMime {
  return (MARKETPLACE_MIME_TYPES as readonly string[]).includes(value);
}

export function marketplaceStoragePath(
  companyId: string,
  locationId: string,
  fileId: string,
  extension: string,
): string {
  return `${companyId.toLowerCase()}/locations/${locationId.toLowerCase()}/${fileId}.${extension}`;
}

export function marketplaceObjectUrl(supabaseUrl: string, storagePath: string): string {
  const base = supabaseUrl.replace(/\/$/, "");
  const path = storagePath.replace(/^\/+/, "");
  return `${base}/storage/v1/object/public/marketplace/${path}`;
}

export const BOOKING_WEB_ORIGIN = "https://booking.salonify.co";

export function marketplacePublicPath(slug: string): string {
  return `/salon/${slug}`;
}

export function bookingLocationUrl(companyId: string, slug: string): string {
  return `${BOOKING_WEB_ORIGIN}/${companyId}/${slug}`;
}

export type ImageValidation =
  | { ok: true; mime: MarketplaceMime; extension: string }
  | { ok: false; reason: "type" | "size" };

export function validateMarketplaceImage(file: {
  name: string;
  type: string;
  size: number;
}): ImageValidation {
  if (file.size > MARKETPLACE_MAX_BYTES) return { ok: false, reason: "size" };

  let mime: MarketplaceMime | null = isMarketplaceMime(file.type) ? file.type : null;
  if (!mime) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    mime = EXTENSION_MIME[ext] ?? null;
  }
  if (!mime) return { ok: false, reason: "type" };
  return { ok: true, mime, extension: MIME_EXTENSION[mime] };
}
