import { INTERNAL_SECRET_HEADER } from "../../infrastructure/auth/internal-secret.ts";
import { runInBackground } from "./background.ts";

const KICK_TIMEOUT_MS = 10_000;

/**
 * Asks ai-worker to pick up a run now. Best effort: the run is already
 * persisted as queued, so a lost kick only delays it until the next sweep.
 * ai-worker answers 202 immediately and continues in the background.
 */
export function kickWorker(runId: string): Promise<void> {
  const baseUrl = Deno.env.get("SUPABASE_URL");
  const secret = Deno.env.get("INTERNAL_WEBHOOK_SECRET");
  if (!baseUrl || !secret) {
    console.warn("ai-worker kick skipped: SUPABASE_URL or INTERNAL_WEBHOOK_SECRET missing");
    return Promise.resolve();
  }

  const request = fetch(`${baseUrl}/functions/v1/ai-worker`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [INTERNAL_SECRET_HEADER]: secret,
    },
    body: JSON.stringify({ run_id: runId }),
    signal: AbortSignal.timeout(KICK_TIMEOUT_MS),
  })
    .then(async (response) => {
      await response.body?.cancel();
      if (!response.ok) {
        console.warn(`ai-worker kick for ${runId} returned ${response.status}`);
      }
    })
    .catch((error) => console.warn(`ai-worker kick for ${runId} failed`, error));

  runInBackground(request);
  return request;
}
