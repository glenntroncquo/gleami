const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type WebhookTarget =
  | { kind: "locations"; locationIds: string[] }
  | { kind: "service"; serviceId: string }
  | { kind: "ignore" };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readUuid(source: Record<string, unknown> | null, key: string): string | null {
  const value = source?.[key];
  if (typeof value !== "string" || !UUID.test(value)) return null;
  return value.toLowerCase();
}

/**
 * Pulls only the ids the sync needs. Name, flags, and coordinates on the
 * payload are ignored; rebuildMarketplaceSearchLocation reads the database.
 */
export function targetsFromWebhook(body: unknown): WebhookTarget {
  const payload = asRecord(body);
  if (!payload) return { kind: "ignore" };

  const table = typeof payload.table === "string" ? payload.table : "";
  const record = asRecord(payload.record);
  const previous = asRecord(payload.old_record);

  if (table === "location") {
    const locationId = readUuid(record, "id") ?? readUuid(previous, "id");
    return locationId ? { kind: "locations", locationIds: [locationId] } : { kind: "ignore" };
  }

  if (table === "location_service") {
    const locationId = readUuid(record, "location_id") ?? readUuid(previous, "location_id");
    return locationId ? { kind: "locations", locationIds: [locationId] } : { kind: "ignore" };
  }

  if (table === "service") {
    const serviceId = readUuid(record, "id") ?? readUuid(previous, "id");
    return serviceId ? { kind: "service", serviceId } : { kind: "ignore" };
  }

  if (table === "service_marketplace_category") {
    const serviceId = readUuid(record, "service_id") ?? readUuid(previous, "service_id");
    return serviceId ? { kind: "service", serviceId } : { kind: "ignore" };
  }

  return { kind: "ignore" };
}
