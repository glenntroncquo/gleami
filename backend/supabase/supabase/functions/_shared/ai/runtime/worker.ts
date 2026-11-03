import { createOpenAiCompatibleProvider } from "../model/openai.ts";
import { aiRunRepository as repo } from "../repository.ts";
import { executeClaimedRun, type RunAttemptResult } from "./execute-run.ts";
import { kickWorker } from "./kick.ts";

/** Longer than any single step (model timeout is 60s) so a live worker never loses its lease. */
const LEASE_SECONDS = 180;
/** Edge functions stop at 150s wall clock; stop starting steps well before that. */
const START_STEPS_FOR_MS = 60_000;
const SWEEP_BATCH = 10;

export interface WorkerReport {
  processed: Array<{ runId: string; result: RunAttemptResult | "exhausted" }>;
}

export async function processRuns(params: { runId?: string }): Promise<WorkerReport> {
  const leaseOwner = crypto.randomUUID();
  const startStepsBefore = Date.now() + START_STEPS_FOR_MS;
  const model = createOpenAiCompatibleProvider();
  const report: WorkerReport = { processed: [] };

  const candidates = params.runId
    ? [await repo.findRunById(params.runId)].filter((run) => run != null)
    : await repo.findDueRuns(SWEEP_BATCH);

  for (const candidate of candidates) {
    if (Date.now() > startStepsBefore) break;

    const run = await repo.claimRun(candidate, leaseOwner, LEASE_SECONDS);
    if (!run) continue;

    if (run.attemptCount >= run.maxAttempts) {
      await repo.releaseRun(run.id, leaseOwner, {
        status: "failed",
        error: "Stopped after repeated interrupted attempts",
      });
      report.processed.push({ runId: run.id, result: "exhausted" });
      continue;
    }

    const result = await executeClaimedRun(run, {
      leaseOwner,
      leaseSeconds: LEASE_SECONDS,
      startStepsBefore,
      model,
      onRequeued: (runId) => kickWorker(runId),
    });
    report.processed.push({ runId: run.id, result });
  }

  return report;
}
