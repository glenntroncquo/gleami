import { UnauthenticatedError } from "../infrastructure/errors.ts";
import { webhookSecretMatches } from "./secret.ts";

export function assertWebhookSecret(req: Request): void {
  const ok = webhookSecretMatches(
    req.headers.get("Authorization"),
    Deno.env.get("MARKETPLACE_WEBHOOK_SECRET"),
  );
  if (!ok) {
    throw new UnauthenticatedError("Unauthorized");
  }
}
