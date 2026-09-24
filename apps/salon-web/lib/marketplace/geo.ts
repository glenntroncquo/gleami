export type LatLng = {
  lat: number;
  lng: number;
};

const LAT_LNG =
  /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?$/;

export function isValidLatLng(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function formatEwktNumber(value: number): string {
  const rounded = Math.round(value * 1e7) / 1e7;
  return rounded.toFixed(7).replace(/\.?0+$/, "");
}

/** PostGIS EWKT. Longitude first, then latitude. */
export function toEwkt(lat: number, lng: number): string {
  if (!isValidLatLng(lat, lng)) {
    throw new Error("invalid coordinates");
  }
  return `SRID=4326;POINT(${formatEwktNumber(lng)} ${formatEwktNumber(lat)})`;
}

export function parseLatLngInput(latRaw: string, lngRaw: string): LatLng | null {
  const lat = Number(latRaw.trim().replace(",", "."));
  const lng = Number(lngRaw.trim().replace(",", "."));
  if (!LAT_LNG.test(latRaw.trim().replace(",", "."))) return null;
  if (!LAT_LNG.test(lngRaw.trim().replace(",", "."))) return null;
  if (!isValidLatLng(lat, lng)) return null;
  return { lat, lng };
}

export function formatCoord(value: number): string {
  const rounded = Math.round(value * 1e6) / 1e6;
  return String(rounded);
}

const WKT_POINT =
  /POINT\s*\(\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?)\s+([+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?)\s*\)/i;

function fromLngLat(lng: number, lat: number): LatLng | null {
  if (!isValidLatLng(lat, lng)) return null;
  return { lat, lng };
}

function parseEwkbPoint(hex: string): LatLng | null {
  const clean = hex.trim();
  if (!/^[0-9a-fA-F]+$/.test(clean) || clean.length < 42 || clean.length % 2 !== 0) {
    return null;
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  const view = new DataView(bytes.buffer);
  const littleEndian = bytes[0] === 1;
  if (bytes[0] !== 0 && bytes[0] !== 1) return null;
  const type = view.getUint32(1, littleEndian);
  const geometryType = type & 0xff;
  if (geometryType !== 1) return null;
  const hasSrid = (type & 0x20000000) !== 0;
  let offset = 5;
  if (hasSrid) offset += 4;
  if (bytes.length < offset + 16) return null;
  const lng = view.getFloat64(offset, littleEndian);
  const lat = view.getFloat64(offset + 8, littleEndian);
  return fromLngLat(lng, lat);
}

function parseGeoJson(value: unknown): LatLng | null {
  if (!value || typeof value !== "object") return null;
  const record = value as { type?: unknown; coordinates?: unknown };
  if (record.type !== "Point" || !Array.isArray(record.coordinates)) return null;
  const [lng, lat] = record.coordinates;
  if (typeof lng !== "number" || typeof lat !== "number") return null;
  return fromLngLat(lng, lat);
}

/** Read whatever PostgREST returns for a geography point. Null means "no point". */
export function parseGeoPoint(value: unknown): LatLng | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return null;
    const wkt = text.match(WKT_POINT);
    if (wkt) return fromLngLat(Number(wkt[1]), Number(wkt[2]));
    if (text.startsWith("{")) {
      try {
        return parseGeoJson(JSON.parse(text));
      } catch {
        return null;
      }
    }
    return parseEwkbPoint(text);
  }
  return parseGeoJson(value);
}
