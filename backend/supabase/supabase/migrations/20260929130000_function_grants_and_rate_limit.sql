-- Audit M8 / M9 / M6:
--
-- M8 (pg_sleep / pg_net EXECUTE grants): REVIEWED, no action possible.
-- The grants are re-asserted by Supabase's own ddl_command_end event
-- triggers (extensions.grant_pg_net_access et al.): a REVOKE is undone
-- within the same transaction, verified live 2026-09-29. The exposure is
-- also not reachable through the API surface: the net/pg_catalog schemas
-- are not PostgREST-exposed and anon/authenticated cannot run arbitrary
-- SQL. Documented as platform-managed.
--
-- M9: drop public.truncate_table — a SECURITY DEFINER truncate-anything
--     helper nothing calls is pure attack surface.
--
-- M6: DB-backed rate-limit primitive (public.check_rate_limit, service
--     role only) plus its counter table. First consumer:
--     marketplace-auth-lookup, to blunt account enumeration.

-- ---------------------------------------------------------------------------
-- M9: drop the generic truncate helper
-- ---------------------------------------------------------------------------
drop function if exists public.truncate_table(text);

-- ---------------------------------------------------------------------------
-- M6: rate-limit primitive
-- ---------------------------------------------------------------------------
create table if not exists public.rate_limit_counter (
  key text primary key,
  window_start timestamptz not null default now(),
  count integer not null default 0
);

alter table public.rate_limit_counter enable row level security;
-- No policies: backend-only table, accessed through the service role.
revoke all on public.rate_limit_counter from anon, authenticated;

create or replace function public.check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  insert into public.rate_limit_counter as r (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update set
    count = case
      when r.window_start < now() - make_interval(secs => p_window_seconds) then 1
      else r.count + 1
    end,
    window_start = case
      when r.window_start < now() - make_interval(secs => p_window_seconds) then now()
      else r.window_start
    end
  returning r.count into v_count;

  return v_count <= p_limit;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'truncate_table') then
    raise exception 'truncate_table should be dropped';
  end if;

  -- check_rate_limit must exist and must NOT be callable by anon
  -- (a callable limiter would let an attacker burn a victim's counter key).
  if not has_function_privilege(
    'service_role', 'public.check_rate_limit(text,integer,integer)', 'execute'
  ) then
    raise exception 'service_role cannot execute check_rate_limit';
  end if;
  if has_function_privilege(
    'anon', 'public.check_rate_limit(text,integer,integer)', 'execute'
  ) then
    raise exception 'anon can execute check_rate_limit';
  end if;
end $$;
