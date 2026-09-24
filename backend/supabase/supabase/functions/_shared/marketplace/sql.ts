/**
 * Minimal surface of the postgres.js client. One pool, prepare disabled so
 * a transaction-mode pooler can still run parameterized statements.
 */
export interface MarketplaceSql {
  <T = Record<string, unknown>[]>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T>;
  begin<T>(callback: (tx: MarketplaceSql) => Promise<T>): Promise<T>;
}
