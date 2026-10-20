export const CLIENT_SORT_COLUMNS = ["first_name", "last_name", "email", "phone"] as const;

export type ClientSortColumn = (typeof CLIENT_SORT_COLUMNS)[number];

const SEARCH_COLUMNS = ["first_name", "last_name", "email"] as const;

/** Inclusive PostgREST range for a zero-based page. */
export function clientListRange(pageIndex: number, pageSize: number): { from: number; to: number } {
  const size = Math.max(1, Math.floor(pageSize));
  const page = Math.max(0, Math.floor(pageIndex));
  const from = page * size;
  return { from, to: from + size - 1 };
}

export function clientPageCount(total: number, pageSize: number): number {
  if (total <= 0) return 0;
  return Math.ceil(total / Math.max(1, Math.floor(pageSize)));
}

export function isClientSortColumn(value: string): value is ClientSortColumn {
  return (CLIENT_SORT_COLUMNS as readonly string[]).includes(value);
}

/**
 * One PostgREST `or` filter per word. Callers AND the filters so
 * "Ann Marie" matches a first name and a last name, not one column
 * that contains the whole phrase.
 */
export function clientSearchFilters(
  term: string,
  columns: readonly string[] = SEARCH_COLUMNS,
): string[] {
  const tokens = term
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(/[%_,().*\\":]/g, ""))
    .filter((token) => token.length > 0)
    .slice(0, 5);

  return tokens.map((token) => {
    const pattern = `"%${token}%"`;
    return columns.map((column) => `${column}.ilike.${pattern}`).join(",");
  });
}
