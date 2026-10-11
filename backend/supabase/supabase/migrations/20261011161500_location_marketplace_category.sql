-- Marketplace categories belong to the salon location, not each service.
-- FILE ONLY — do not apply from CI or an agent. Glenn applies after review.
-- Targets SalonFlow production directly. There is no staging.
--
-- Backfill copies the distinct categories already offered at each location,
-- then drops service_marketplace_category. Create the sync trigger after the
-- backfill so those inserts do not rebuild the search projection once per row.
-- After apply, call marketplace-reindex once so category_ids come from the
-- location junction.
--
-- The webhook placeholder matches 20260924190000_marketplace_sync_schedule.sql.
-- Substitute __MARKETPLACE_WEBHOOK_SECRET__ before apply. The throwaway RLS
-- database has no supabase_functions.http_request, so the trigger is skipped
-- there.

-- ---------------------------------------------------------------------------
-- 1) location_marketplace_category
-- ---------------------------------------------------------------------------
create table public.location_marketplace_category (
  location_id uuid not null references public.location (id) on delete cascade,
  marketplace_category_id uuid not null references public.marketplace_category (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (location_id, marketplace_category_id)
);

comment on table public.location_marketplace_category is
  'Which marketplace categories a salon location presents itself as. '
  'Home-screen filters read these. A specific treatment is found by search '
  'on service names, not by tagging each service.';

create index location_marketplace_category_category_id_idx
  on public.location_marketplace_category (marketplace_category_id);

alter table public.location_marketplace_category enable row level security;

-- Members can load categories while the location is still unlisted.
-- Anon does not read this table; the public profile comes from the edge function.
create policy "location_marketplace_category select (membership)"
  on public.location_marketplace_category
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.location l
      where l.id = location_marketplace_category.location_id
        and l.company_id in (select private.company_ids_for_user())
    )
  );

create policy "location_marketplace_category insert (listing)"
  on public.location_marketplace_category
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.location l
      where l.id = location_id
        and (
          private.has_permission_for_company('locations:manage', l.company_id)
          or private.has_permission_for_company('settings:manage', l.company_id)
        )
    )
  );

create policy "location_marketplace_category delete (listing)"
  on public.location_marketplace_category
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.location l
      where l.id = location_id
        and (
          private.has_permission_for_company('locations:manage', l.company_id)
          or private.has_permission_for_company('settings:manage', l.company_id)
        )
    )
  );

grant all on table public.location_marketplace_category to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) Backfill from the service tags, then drop that junction
-- ---------------------------------------------------------------------------
insert into public.location_marketplace_category (location_id, marketplace_category_id)
select distinct ls.location_id, smc.marketplace_category_id
from public.location_service ls
join public.service_marketplace_category smc on smc.service_id = ls.service_id;

drop trigger if exists marketplace_sync_service_category on public.service_marketplace_category;

drop table public.service_marketplace_category;

-- ---------------------------------------------------------------------------
-- 3) Sync trigger. Same marketplace-sync call as the other marketplace triggers.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regprocedure('supabase_functions.http_request()') is null then
    raise notice 'marketplace_sync_location_category skipped: supabase_functions.http_request() is missing';
    return;
  end if;

  execute $trig$
    drop trigger if exists marketplace_sync_location_category on public.location_marketplace_category;
    create trigger marketplace_sync_location_category
      after insert or delete on public.location_marketplace_category
      for each row
      execute function supabase_functions.http_request(
        'https://kvhinnhnwgvdpzggdnxs.supabase.co/functions/v1/marketplace-sync',
        'POST',
        '{"Content-Type":"application/json","Authorization":"Bearer __MARKETPLACE_WEBHOOK_SECRET__"}',
        '{}',
        '15000'
      );
  $trig$;
end
$$;

-- ---------------------------------------------------------------------------
-- 4) Apply-time verify
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.location_marketplace_category') is null then
    raise exception 'location_marketplace_category missing';
  end if;

  if to_regclass('public.service_marketplace_category') is not null then
    raise exception 'service_marketplace_category still exists';
  end if;

  if not exists (
    select 1
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'location_marketplace_category'
      and p.polname = 'location_marketplace_category select (membership)'
  ) then
    raise exception 'member select policy missing on location_marketplace_category';
  end if;

  if to_regprocedure('supabase_functions.http_request()') is not null
     and not exists (
       select 1
       from pg_trigger
       where tgname = 'marketplace_sync_location_category'
         and not tgisinternal
     )
  then
    raise exception 'marketplace_sync_location_category trigger missing';
  end if;
end
$$;
