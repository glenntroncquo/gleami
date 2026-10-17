export type VisibleLocation = {
  id: string;
  company_id: string;
  name: string;
  is_active: boolean;
  is_primary: boolean;
};

/**
 * Same rule as salon-web `locationPickerRows`:
 * a company owner/admin sees every active location of each company they lead,
 * and a location member sees only the shops they belong to.
 */
export function locationsVisibleToUser<T extends VisibleLocation>(input: {
  locations: readonly T[];
  leaderCompanyIds: readonly string[];
  memberLocationIds: readonly string[];
}): T[] {
  const leaders = new Set(input.leaderCompanyIds);
  const members = new Set(input.memberLocationIds);
  const seen = new Set<string>();
  const rows: T[] = [];

  for (const row of input.locations) {
    if (!row.is_active) continue;
    if (!leaders.has(row.company_id) && !members.has(row.id)) continue;
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    rows.push(row);
  }

  return rows.sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.name.localeCompare(b.name)
  );
}
