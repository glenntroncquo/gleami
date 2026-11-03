-- ---------------------------------------------------------------------------
-- AI runtime foundation: durable agent runs, their steps, and approvals.
--
-- Every AI surface (dashboard assistant, inbox, voice, scheduled agents, MCP)
-- records its work here. Edge functions own all writes through the service
-- role; the model never touches these tables or any salon table directly.
--
-- Tenant scope is explicit on every row: company_id is the tenant boundary,
-- location_id narrows a run to one shop (null = company-wide, which the
-- runtime only allows for company-level roles).
--
-- Additive only. No cron job is created here: the worker is invoked by
-- ai-command right after a run is enqueued. See docs/ai-runtime.md for the
-- optional sweep job that needs the internal secret substituted by hand.
-- ---------------------------------------------------------------------------

create table if not exists public.ai_agent_run (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.company(id) on delete cascade,
  location_id uuid references public.location(id) on delete cascade,
  agent_key text not null,
  actor_type text not null check (actor_type in ('user', 'system')),
  actor_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'awaiting_approval', 'succeeded', 'failed', 'cancelled')),
  input jsonb not null,
  output jsonb,
  error text,
  idempotency_key text,
  -- Counts attempts that ended in a crash or retryable error, not clean yields.
  attempt_count integer not null default 0,
  max_attempts integer not null default 3,
  -- Compare-and-set token: every claim bumps it, so two workers can never both
  -- win the same run.
  lease_version integer not null default 0,
  lease_owner uuid,
  lease_expires_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create unique index if not exists ai_agent_run_idempotency_key
  on public.ai_agent_run (company_id, actor_user_id, idempotency_key)
  where idempotency_key is not null;
create index if not exists ai_agent_run_due
  on public.ai_agent_run (next_attempt_at)
  where status in ('queued', 'running');
create index if not exists ai_agent_run_company_id on public.ai_agent_run (company_id);
create index if not exists ai_agent_run_location_id on public.ai_agent_run (location_id);
create index if not exists ai_agent_run_actor_created
  on public.ai_agent_run (actor_user_id, created_at desc);

create table if not exists public.ai_approval (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.ai_agent_run(id) on delete cascade,
  company_id uuid not null references public.company(id) on delete cascade,
  location_id uuid references public.location(id) on delete cascade,
  tool_call_id text not null,
  tool_name text not null,
  -- The exact validated input that will run if approved. Approving a plan
  -- never approves a later, different action.
  tool_input jsonb not null,
  risk text not null check (risk in ('low', 'medium', 'high')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  unique (run_id, tool_call_id)
);

create index if not exists ai_approval_company_id on public.ai_approval (company_id);
create index if not exists ai_approval_location_id on public.ai_approval (location_id);
create index if not exists ai_approval_decided_by on public.ai_approval (decided_by);

create table if not exists public.ai_agent_step (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.ai_agent_run(id) on delete cascade,
  company_id uuid not null references public.company(id) on delete cascade,
  sequence integer not null,
  kind text not null check (kind in ('model', 'tool')),
  status text not null
    check (status in ('running', 'succeeded', 'failed', 'awaiting_approval', 'rejected')),
  tool_call_id text,
  tool_name text,
  input jsonb,
  output jsonb,
  error text,
  approval_id uuid references public.ai_approval(id) on delete set null,
  model text,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (run_id, sequence),
  -- A retried worker finds the existing row instead of executing the tool twice.
  unique (run_id, tool_call_id),
  check (kind <> 'tool' or (tool_call_id is not null and tool_name is not null))
);

create index if not exists ai_agent_step_company_id on public.ai_agent_step (company_id);
create index if not exists ai_agent_step_approval_id on public.ai_agent_step (approval_id);

-- ---------------------------------------------------------------------------
-- Access: service role writes; a signed-in user can read the runs they
-- started (and their steps/approvals) while they still belong to the company.
-- ---------------------------------------------------------------------------
alter table public.ai_agent_run enable row level security;
alter table public.ai_agent_step enable row level security;
alter table public.ai_approval enable row level security;

revoke all on public.ai_agent_run from anon, authenticated;
revoke all on public.ai_agent_step from anon, authenticated;
revoke all on public.ai_approval from anon, authenticated;
grant select on public.ai_agent_run to authenticated;
grant select on public.ai_agent_step to authenticated;
grant select on public.ai_approval to authenticated;

drop policy if exists "ai_agent_run select (own runs)" on public.ai_agent_run;
create policy "ai_agent_run select (own runs)"
  on public.ai_agent_run for select
  to authenticated
  using (
    actor_user_id = (select auth.uid())
    and company_id in (select private.company_ids_for_user())
  );

drop policy if exists "ai_agent_step select (own runs)" on public.ai_agent_step;
create policy "ai_agent_step select (own runs)"
  on public.ai_agent_step for select
  to authenticated
  using (run_id in (select id from public.ai_agent_run));

drop policy if exists "ai_approval select (own runs)" on public.ai_approval;
create policy "ai_approval select (own runs)"
  on public.ai_approval for select
  to authenticated
  using (run_id in (select id from public.ai_agent_run));

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regprocedure('private.company_ids_for_user()') is null then
    raise exception 'private.company_ids_for_user() is required by the ai_* policies';
  end if;

  if has_table_privilege('authenticated', 'public.ai_agent_run', 'INSERT')
     or has_table_privilege('authenticated', 'public.ai_agent_step', 'UPDATE')
     or has_table_privilege('authenticated', 'public.ai_approval', 'UPDATE')
     or has_table_privilege('anon', 'public.ai_agent_run', 'SELECT') then
    raise exception 'ai_* tables must only be writable by the service role';
  end if;
end
$$;
