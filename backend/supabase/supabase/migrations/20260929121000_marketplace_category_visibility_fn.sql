-- Follow-up to 20260929120000_rls_hardening.sql.
-- The new service_marketplace_category SELECT policy subqueries public.service,
-- which has no anon SELECT policy — so RLS on service silently filtered the
-- EXISTS to nothing for anonymous callers. Evaluate the visibility check as
-- the table owner (security definer) instead.

create or replace function private.service_is_marketplace_visible(p_service_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.service s
    where s.id = p_service_id
      and s.is_marketplace_visible = true
  );
$$;

revoke all on function private.service_is_marketplace_visible(uuid) from public;
grant execute on function private.service_is_marketplace_visible(uuid) to anon, authenticated;

drop policy if exists "service_marketplace_category select (marketplace visible)" on public.service_marketplace_category;

create policy "service_marketplace_category select (marketplace visible)"
  on public.service_marketplace_category for select
  to anon, authenticated
  using (private.service_is_marketplace_visible(service_id));

do $$
begin
  if not exists (
    select 1 from pg_policy p join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'service_marketplace_category'
      and p.polcmd = 'r'
      and coalesce(pg_get_expr(p.polqual, p.polrelid), '') like '%service_is_marketplace_visible%'
  ) then
    raise exception 'marketplace category visibility policy missing';
  end if;
end $$;
