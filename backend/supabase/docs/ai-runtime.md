# AI runtime

One runtime that every AI feature in Gleami uses: dashboard assistant now; inbox auto-replies, voice agents, scheduled agents and an MCP server later. Agents are configuration. Capabilities are shared tools that wrap the existing domain handlers. Every run is a durable row that survives crashes, retries and approval waits.

```
ai-command ──► ai_agent_run (queued) ──► ai-worker ──► model ──► tool registry ──► domain handlers ──► Postgres
                      ▲                      │
ai-approval-decide ───┘   ai_agent_step / ai_approval (persisted after every step)
```

## Rules the code enforces

- **Tenant comes from the run, never from the model.** Tools read `company_id` from `AuthorizedExecutionContext`. A model-supplied `location_id` is accepted only if it is inside the run's scope (`resolveToolLocation`).
- **Memberships are re-resolved on every attempt.** A staff member removed while a run waits for approval cannot keep acting.
- **Permissions are the existing role permissions.** A tool declares a key such as `pos:read`. A run pinned to a location needs that key at the location. A company-wide run needs it on a company-level role, so a stylist at one shop cannot read every shop by leaving `location_id` out.
- **Risk decides approval.** Each agent has `autoApproveUpTo`. Calls above that level pause the run and create an `ai_approval` row holding the exact validated input. Approving runs that input and nothing else. The approver needs the same permission as the action.
- **Exactly-once where it matters.** Workers claim runs with a compare-and-set on `lease_version`. Tool steps are unique per `(run_id, tool_call_id)`. If a worker dies while a tool is running, the tool is re-run only if it is marked `idempotent`. Otherwise the step fails visibly and is not retried.
- **Failures are classified.** Provider 429/5xx and database errors retry with exponential backoff, up to `max_attempts`. Unknown tools, invalid arguments, scope and permission errors become failed tool steps that the model sees and can explain. Exceeding `maxModelCalls` fails the run.

## Code map

| Path | What |
| --- | --- |
| `functions/ai-command` | Authenticated entry point. Validates scope, rate-limits (20/min per user), creates the run, wakes the worker, returns `202 { run_id }`. |
| `functions/ai-worker` | Internal (`x-internal-secret`). With `run_id`, works that run. Without it, sweeps due runs. Replies `202` and works in the background. |
| `functions/ai-approval-decide` | Approve or reject one pending action. |
| `_shared/ai/agents.ts` | Agent definitions: instructions, tool names, `autoApproveUpTo`, `maxModelCalls`. |
| `_shared/ai/tools/` | The tool registry plus one file per tool. |
| `_shared/ai/runtime/execute-run.ts` | One attempt of a run: replay steps → next action → persist. |
| `_shared/ai/scope.ts`, `policy.ts`, `transcript.ts` | Pure rules (unit-tested in `tests/cases/ai-runtime.spec.ts`). |
| `_shared/ai/model/` | Provider interface plus an OpenAI-compatible adapter. |

Domain modules (`_shared/order`, `_shared/service`, …) do not import anything from `_shared/ai`. Keep that dependency direction.

## Adding a tool

1. Put the business query or command in its domain module (for example `order/repository.ts`), not in the tool.
2. Add `_shared/ai/tools/<name>.ts` with a strict zod `inputSchema`, matching JSON `parameters`, `risk`, `permission`, and `idempotent`. Never accept `company_id` as input.
3. Register it in `tools/registry.ts` and add its name to the agents that may use it.
4. Anything that writes or sends gets `risk: "medium"` or higher. It also needs `idempotent: false` unless a retry is provably harmless.

## Frontend contract

- `POST ai-command` `{ company_id, location_id?, agent?: "assistant", message, idempotency_key? }` → `202 { run_id, status }`.
- Read progress with `supabase.from("ai_agent_run" | "ai_agent_step" | "ai_approval")`. RLS shows a user only their own runs, and only while they are still a member of the company.
- `POST ai-approval-decide` `{ approval_id, decision: "approve" | "reject" }`.

## Deploy

1. The migration `20261029160000_ai_runtime_foundation.sql` is additive and applies through the normal migration workflow.
2. Set these edge secrets: `OPENAI_API_KEY` (required), `AI_MODEL` (optional, default `gpt-4.1-mini`), and `AI_BASE_URL` (optional, for any OpenAI-compatible endpoint). `INTERNAL_WEBHOOK_SECRET` already exists and is reused to wake the worker.
3. Optional sweep. A run whose wake-up call was lost, or whose retry backoff elapsed, is picked up by the next `ai-worker` call without a `run_id`. To make that periodic, run the SQL below by hand once. Replace `__INTERNAL_WEBHOOK_SECRET__` first, the same way as `20260928120000_internal_webhook_secret_cutover.sql`. It is not a migration, because CI would apply the placeholder literally.

```sql
select cron.schedule(
  'ai-worker-sweep',
  '* * * * *',
  $cron$
  select net.http_post(
    url := 'https://kvhinnhnwgvdpzggdnxs.supabase.co/functions/v1/ai-worker',
    headers := '{"Content-Type":"application/json","x-internal-secret":"__INTERNAL_WEBHOOK_SECRET__"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
  $cron$
);
```

## Where the next pieces plug in

- **RAG / salon knowledge:** a `knowledge` domain (pgvector chunks with `company_id` and `location_id`) exposed as a `knowledge_search` tool. Retrieval must filter by the context's company in the query itself.
- **Unified inbox and voice:** channel adapters normalise inbound messages and create runs with `actor_type = 'system'` for a dedicated agent. Replies go through a `message_send` tool with `risk: "medium"`, so each salon controls whether replies send automatically.
- **Write tools** (book, reschedule, payment reminder) reuse the existing command handlers and the approval flow above.
- **MCP:** an adapter that lists a read-only subset of the registry. It is not the internal backbone.
