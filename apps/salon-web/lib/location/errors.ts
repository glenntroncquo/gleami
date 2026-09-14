type RpcLikeError = {
  code?: string;
  message?: string;
} | null;

/**
 * PostgREST / Postgres signals used when a Phase 4 column or table
 * is not on this backend yet. Treat as single-location mode.
 */
export function isMissingSchemaError(error: RpcLikeError): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();
  return (
    code === "PGRST204" ||
    code === "PGRST202" ||
    code === "PGRST205" ||
    code === "42703" ||
    code === "42P01" ||
    message.includes("could not find the") ||
    message.includes("does not exist") ||
    message.includes("schema cache")
  );
}
