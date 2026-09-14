function nonemptyLocationId(value?: string | null): string | undefined {
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function pickLocationId(data: {
  location_id?: string | null;
  locationId?: string | null;
}): string | undefined {
  return nonemptyLocationId(data.location_id) ?? nonemptyLocationId(data.locationId);
}
