import { isMissingSchemaError } from "./errors";
import { DEFAULT_LOCATION_TIMEZONE, type LocationRecord, type LocationWrite } from "./types";
import type { LocationQueryError } from "./client";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function trimmed(value: string | null | undefined): string | null {
  const next = value?.trim();
  return next ? next : null;
}

export function locationWriteFields(input: LocationWrite): Record<string, unknown> {
  return {
    name: input.name.trim(),
    slug: trimmed(input.slug),
    country: trimmed(input.country),
    state: trimmed(input.state),
    city: trimmed(input.city),
    postal_code: trimmed(input.postal_code),
    street: trimmed(input.street),
    email: trimmed(input.email),
    timezone: trimmed(input.timezone) || DEFAULT_LOCATION_TIMEZONE,
    is_active: input.is_active ?? true,
  };
}

/**
 * Arg shapes for public.create_location (backend Phase 4 / #13).
 * Try p_-prefixed first (matches has_permission / has_company_permission).
 */
export function buildCreateLocationArgSets(
  companyId: string,
  input: LocationWrite,
): Record<string, unknown>[] {
  const fields = locationWriteFields(input);
  return [
    { p_company_id: companyId, ...prefixKeys(fields) },
    { company_id: companyId, ...fields },
    { p_company_id: companyId, p_location: fields },
  ];
}

export function buildUpdateLocationArgSets(
  locationId: string,
  input: LocationWrite,
): Record<string, unknown>[] {
  const fields = locationWriteFields(input);
  return [
    { p_location_id: locationId, ...prefixKeys(fields) },
    { location_id: locationId, ...fields },
    { p_location_id: locationId, p_location: fields },
  ];
}

function prefixKeys(fields: Record<string, unknown>): Record<string, unknown> {
  const prefixed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    prefixed[`p_${key}`] = value;
  }
  return prefixed;
}

export function isWrongArgsError(error: LocationQueryError): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();
  return (
    code === "PGRST202" ||
    message.includes("could not find the function") ||
    message.includes("without parameters") ||
    message.includes("with the specified")
  );
}

export function isMissingRpc(error: LocationQueryError): boolean {
  return isMissingSchemaError(error) || isWrongArgsError(error);
}

export function normalizeLocationRecord(
  data: unknown,
  fallback: Partial<LocationRecord> = {},
): LocationRecord | null {
  const row = unwrapRow(data);
  if (!row) return null;

  const id = pickUuid(row);
  if (!id) return null;

  const fields: Record<string, unknown> = typeof row === "string" ? {} : row;

  return {
    id,
    company_id: stringOrNull(fields.company_id) ?? fallback.company_id ?? "",
    name: stringOrNull(fields.name) ?? fallback.name ?? "",
    slug: stringOrNull(fields.slug) ?? fallback.slug ?? null,
    country: stringOrNull(fields.country) ?? fallback.country ?? null,
    state: stringOrNull(fields.state) ?? fallback.state ?? null,
    city: stringOrNull(fields.city) ?? fallback.city ?? null,
    postal_code: stringOrNull(fields.postal_code) ?? fallback.postal_code ?? null,
    street: stringOrNull(fields.street) ?? fallback.street ?? null,
    email: stringOrNull(fields.email) ?? fallback.email ?? null,
    image_url: stringOrNull(fields.image_url) ?? fallback.image_url ?? null,
    timezone:
      stringOrNull(fields.timezone) ?? fallback.timezone ?? DEFAULT_LOCATION_TIMEZONE,
    is_primary: booleanOr(fields.is_primary, fallback.is_primary ?? false),
    is_listed: booleanOr(fields.is_listed, fallback.is_listed ?? false),
    is_active: booleanOr(fields.is_active, fallback.is_active ?? true),
  };
}

export function normalizeLocationList(data: unknown): LocationRecord[] {
  if (data == null) return [];
  const rows = Array.isArray(data) ? data : [data];
  return rows
    .map((row) => normalizeLocationRecord(row))
    .filter((row): row is LocationRecord => row !== null);
}

export function normalizeLocationIds(data: unknown): string[] {
  if (data == null) return [];
  const rows = Array.isArray(data) ? data : [data];
  const ids: string[] = [];
  for (const row of rows) {
    if (typeof row === "string" && UUID_RE.test(row)) {
      ids.push(row);
      continue;
    }
    if (row && typeof row === "object") {
      const id = pickUuid(row as Record<string, unknown>);
      if (id) ids.push(id);
    }
  }
  return [...new Set(ids)];
}

function unwrapRow(data: unknown): Record<string, unknown> | string | null {
  if (data == null) return null;
  if (typeof data === "string") return data;
  if (Array.isArray(data)) {
    return data[0] != null ? unwrapRow(data[0]) : null;
  }
  if (typeof data === "object") return data as Record<string, unknown>;
  return null;
}

function pickUuid(row: Record<string, unknown> | string): string | null {
  if (typeof row === "string") return UUID_RE.test(row) ? row : null;
  for (const key of ["id", "location_id", "create_location", "update_location"]) {
    const value = row[key];
    if (typeof value === "string" && UUID_RE.test(value)) return value;
  }
  for (const value of Object.values(row)) {
    if (typeof value === "string" && UUID_RE.test(value)) return value;
  }
  return null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function booleanOr(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}
