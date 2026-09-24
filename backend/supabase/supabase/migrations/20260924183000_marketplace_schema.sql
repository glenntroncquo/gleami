-- Marketplace schema (consumer discovery).
-- FILE ONLY — do not apply from CI or an agent. Glenn applies after review.
-- Targets SalonFlow production directly. There is no staging.
--
-- No new functions and no new RPCs. Generated columns, indexes, RLS, and
-- one security-barrier view only. Sync, webhooks, like-count refresh, and
-- the public search API are a follow-up.
--
-- Plan names that do not match the live schema (do not reintroduce them):
--   * treatment / location_treatment are service / location_service.
--   * location.is_marketplace_published is the existing location.is_listed.
--   * location.marketplace_slug is the existing location.slug.
--   * location.coordinates is the existing location.geo_location.
--   * company.multi_location_enabled and staff.role stay dropped.
--
-- Projection rule: marketplace_search_location has no is_published column.
-- A row exists only while the sync (follow-up) considers the location
-- published. Anon SELECT is USING (true). This migration does not write
-- projection rows.
--
-- Extensions: postgis (public) and pg_trgm (schema extensions) are already
-- installed. This file does not run CREATE EXTENSION.

-- ---------------------------------------------------------------------------
-- 0) Preconditions
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.location') is null
     or to_regclass('public.service') is null
     or to_regclass('public.company') is null
  then
    raise exception 'location, service, and company must already exist';
  end if;

  if to_regprocedure('private.has_company_permission(text,uuid)') is null
     or to_regprocedure('private.has_permission_for_company(text,uuid)') is null
  then
    raise exception
      'private.has_company_permission / has_permission_for_company missing';
  end if;

  if not exists (select 1 from pg_extension where extname = 'postgis') then
    raise exception 'postgis must already be installed (schema public)';
  end if;

  if not exists (
    select 1
    from pg_opclass oc
    join pg_namespace n on n.oid = oc.opcnamespace
    where oc.opcname = 'gin_trgm_ops'
      and n.nspname = 'extensions'
  ) then
    raise exception
      'extensions.gin_trgm_ops missing — pg_trgm must already be in schema extensions';
  end if;

  if to_regclass('storage.buckets') is null
     or to_regclass('storage.objects') is null
  then
    raise exception 'storage.buckets / storage.objects missing';
  end if;

  if to_regclass('auth.users') is null then
    raise exception 'auth.users missing';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 1) location — description, publish timestamp, listed-slug uniqueness
-- ---------------------------------------------------------------------------
-- is_listed, slug, and geo_location already exist. Do not add parallel columns.
-- Anon column grants from 20260905190000 are intentionally unchanged:
-- marketplace_description is not world-readable via location. The public
-- detail endpoint (follow-up) returns it for listed locations only.
-- Authenticated members keep their existing table grant.

alter table public.location
  add column marketplace_description text,
  add column marketplace_published_at timestamptz;

comment on column public.location.is_listed is
  'Marketplace publish flag. Reuses the existing column; there is no '
  'is_marketplace_published. Default false. The search projection is a '
  'separate table and does not mirror this flag as its own column.';

comment on column public.location.slug is
  'Public booking and marketplace path segment. Unique per company today '
  '(location_company_id_slug_key). Listed slugs are also globally unique, '
  'case-insensitive, via location_listed_slug_key.';

comment on column public.location.geo_location is
  'WGS84 point. Marketplace search copies this onto '
  'marketplace_search_location.coordinates. A location with no geo_location '
  'can still be listed but is not inserted into the search projection.';

comment on column public.location.marketplace_description is
  'Consumer-facing blurb for the marketplace profile. Not the internal '
  'company notes. Null until the salon writes one. Not in the anon column '
  'grant on location.';

comment on column public.location.marketplace_published_at is
  'When this location last became listed. Nullable. Not maintained by a '
  'trigger (no new functions). The marketplace sync edge function sets it.';

-- 0 rows are listed on SalonFlow today, so this cannot collide on apply.
-- Unlisted locations may still share a slug across companies.
create unique index location_listed_slug_key
  on public.location (lower(slug))
  where is_listed and slug is not null;

alter table public.location
  add constraint location_listed_requires_slug
  check (
    not is_listed
    or (slug is not null and btrim(slug) <> '')
  );

create index location_listed_active_idx
  on public.location (id)
  where is_listed and is_active;

-- ---------------------------------------------------------------------------
-- 2) service.is_marketplace_visible
-- ---------------------------------------------------------------------------
alter table public.service
  add column is_marketplace_visible boolean not null default true;

comment on column public.service.is_marketplace_visible is
  'When false, marketplace sync omits the service from search treatments, '
  'suggest, and the public profile. Default true so existing services stay '
  'eligible until a salon hides them. There is no treatment table.';

-- Trigram lookup for marketplace-suggest on service names. Skip when a
-- gin_trgm index on service.name already exists under another name.
do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'service'
      and indexdef ilike '%gin_trgm_ops%'
      and indexdef ilike '%name%'
  ) then
    execute $idx$
      create index service_name_trgm_idx
        on public.service
        using gin (lower(name) extensions.gin_trgm_ops)
    $idx$;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 3) marketplace_category — public read of active rows, no client writes
-- ---------------------------------------------------------------------------
create table public.marketplace_category (
  id uuid primary key,
  parent_id uuid,
  name text not null,
  slug text not null,
  sort_order integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketplace_category_slug_key unique (slug),
  constraint marketplace_category_name_key unique (name),
  constraint marketplace_category_sort_order_key unique (sort_order),
  constraint marketplace_category_parent_id_fkey
    foreign key (parent_id) references public.marketplace_category (id) on delete restrict
);

comment on table public.marketplace_category is
  'Fixed consumer categories. Clients may read active rows. Writes are '
  'service_role / migrations only — there is no insert policy.';

comment on column public.marketplace_category.slug is
  'Stable kebab-case key. Prefer this over id in clients.';

-- Ids are fixed so a client can cache them. Slugs are the public keys.
insert into public.marketplace_category (id, name, slug, sort_order) values
  ('01900000-0000-4000-8000-000000000001', 'Herenkapper', 'herenkapper', 1),
  ('01900000-0000-4000-8000-000000000002', 'Vrouwenkapper', 'vrouwenkapper', 2),
  ('01900000-0000-4000-8000-000000000003', 'Haar en styling', 'haar-en-styling', 3),
  ('01900000-0000-4000-8000-000000000004', 'Keratine', 'keratine', 4),
  ('01900000-0000-4000-8000-000000000005', 'Wenkbrauwen en wimpers', 'wenkbrauwen-en-wimpers', 5),
  ('01900000-0000-4000-8000-000000000006', 'Massagesalon', 'massagesalon', 6),
  ('01900000-0000-4000-8000-000000000007', 'Ontharing', 'ontharing', 7),
  ('01900000-0000-4000-8000-000000000008', 'Nagels', 'nagels', 8),
  ('01900000-0000-4000-8000-000000000009', 'Gezichtsbehandeling', 'gezichtsbehandeling', 9),
  ('01900000-0000-4000-8000-00000000000a', 'Make-up', 'make-up', 10),
  ('01900000-0000-4000-8000-00000000000b', 'Tatoeages en piercings', 'tatoeages-en-piercings', 11);

create index marketplace_category_name_trgm_idx
  on public.marketplace_category
  using gin (lower(name) extensions.gin_trgm_ops);

create index marketplace_category_parent_id_idx
  on public.marketplace_category (parent_id);

comment on column public.marketplace_category.parent_id is
  'Optional parent. The seed is flat (all null). No touch trigger on updated_at.';

create index marketplace_category_active_sort_idx
  on public.marketplace_category (sort_order)
  where is_active;

alter table public.marketplace_category enable row level security;

create policy "marketplace_category select (active)"
  on public.marketplace_category
  for select
  to anon, authenticated
  using (is_active);

-- ---------------------------------------------------------------------------
-- 4) service_marketplace_category
-- ---------------------------------------------------------------------------
-- SELECT is USING (true), not "listed locations only".
-- A listed-only predicate has to read location.is_listed. Anon has no column
-- privilege on that flag (20260905190000), and authenticated location RLS is
-- membership-scoped, so a join would hide mappings from marketplace consumers
-- and from the salon editing a shop that is not listed yet.
-- Rows are (service_id, category_id, created_at) — no service name. Name
-- leakage of unlisted salons is the suggest/search edge functions' job.
-- Writes use the same company catalog helper as service itself.

create table public.service_marketplace_category (
  service_id uuid not null references public.service (id) on delete cascade,
  marketplace_category_id uuid not null references public.marketplace_category (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (service_id, marketplace_category_id)
);

comment on table public.service_marketplace_category is
  'Which marketplace categories a service belongs to. Replaces the plan''s '
  'treatment_marketplace_category. service_id references service, not a '
  'treatment table.';

create index service_marketplace_category_category_id_idx
  on public.service_marketplace_category (marketplace_category_id);

alter table public.service_marketplace_category enable row level security;

create policy "service_marketplace_category select (public)"
  on public.service_marketplace_category
  for select
  to anon, authenticated
  using (true);

create policy "service_marketplace_category insert (catalog:manage)"
  on public.service_marketplace_category
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.service s
      where s.id = service_id
        and private.has_permission_for_company('catalog:manage', s.company_id)
    )
  );

create policy "service_marketplace_category delete (catalog:manage)"
  on public.service_marketplace_category
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.service s
      where s.id = service_id
        and private.has_permission_for_company('catalog:manage', s.company_id)
    )
  );

-- ---------------------------------------------------------------------------
-- 5) Listed-location ids, bypassing location RLS / column grants
-- ---------------------------------------------------------------------------
-- marketplace_media public read and marketplace_location_like insert need
-- "is this location listed?" for callers who are not company members.
-- Subquerying public.location from an RLS policy runs as the caller, so
-- membership RLS and the anon column grant hide is_listed.
-- This view is security_invoker = false (view owner, BYPASSRLS on Supabase)
-- and exposes only the id. The schema is not in the Data API config.

create schema marketplace_internal;

revoke all on schema marketplace_internal from public;
grant usage on schema marketplace_internal to anon, authenticated, service_role;

create view marketplace_internal.listed_location
with (security_invoker = false, security_barrier = true) as
select l.id
from public.location l
where l.is_listed
  and l.is_active;

comment on view marketplace_internal.listed_location is
  'Ids of listed active locations. security_invoker false so marketplace '
  'RLS can see the publish flag without granting is_listed or opening '
  'location to every authenticated user. Do not add this schema to the API.';

revoke all on marketplace_internal.listed_location from public;
grant select on marketplace_internal.listed_location to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6) marketplace_search_location — projection
-- ---------------------------------------------------------------------------
-- Row presence is the published signal. Sync deletes the row when the
-- location is unlisted, inactive, missing a slug, or missing geo_location.
-- rating stays null and review_count stays 0 until a reviews table exists.
-- treatments is display-only: [{serviceId, serviceVariantId, name}] where
-- serviceVariantId is the service's default (first active) variant. Search
-- does not filter on it. The availability engine needs the variant id.

create table public.marketplace_search_location (
  location_id uuid primary key references public.location (id) on delete cascade,
  company_id uuid not null references public.company (id) on delete cascade,
  name text not null,
  slug text not null,
  image_url text,
  city text,
  address text,
  coordinates public.geography(point, 4326) not null,
  category_ids uuid[] not null default '{}',
  search_text text not null default '',
  search_vector tsvector generated always as (
    to_tsvector('simple', search_text)
  ) stored,
  treatments jsonb not null default '[]'::jsonb,
  rating numeric(3, 2),
  review_count integer not null default 0,
  like_count integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint marketplace_search_location_slug_key unique (slug),
  constraint marketplace_search_location_treatments_array
    check (jsonb_typeof(treatments) = 'array'),
  constraint marketplace_search_location_review_count_nonnegative
    check (review_count >= 0),
  constraint marketplace_search_location_like_count_nonnegative
    check (like_count >= 0),
  constraint marketplace_search_location_rating_range
    check (rating is null or (rating >= 0 and rating <= 5))
);

comment on column public.marketplace_search_location.address is
  'Street and postal code, composed by sync from location.street and '
  'location.postal_code. City stays its own column. The public profile '
  'reads the live location columns, not this copy.';

comment on table public.marketplace_search_location is
  'Derived marketplace search document. No is_published column: if the row '
  'exists, the location is in the public index. Written only by the sync '
  'edge function (service_role / direct DB). Clients get SELECT.';

comment on column public.marketplace_search_location.coordinates is
  'Copy of location.geo_location. NOT NULL because locations without a point '
  'are not indexed.';

comment on column public.marketplace_search_location.category_ids is
  'Distinct marketplace_category ids of visible services offered here. '
  'Filtered with the overlaps operator (&&), never by unnesting treatments.';

comment on column public.marketplace_search_location.search_text is
  'Denormalized name, city, category names, and visible service names. '
  'Built in TypeScript by the sync. Trigram fallback for suggest/search.';

comment on column public.marketplace_search_location.search_vector is
  'Generated from search_text with the built-in simple text search config. '
  'No custom dictionary and no new function. simple matches salon names '
  'better than dutch stemming.';

comment on column public.marketplace_search_location.treatments is
  'Display list only. Shape: [{"serviceId","serviceVariantId","name"}]. '
  'serviceVariantId is the first active variant. Do not index or filter on it.';

comment on column public.marketplace_search_location.rating is
  'Reserved. Stays null until reviews exist. Ranking treats null as 0.';

comment on column public.marketplace_search_location.review_count is
  'Reserved. Stays 0 until reviews exist.';

comment on column public.marketplace_search_location.like_count is
  'Recounted from marketplace_location_like by sync (when a row is rebuilt) '
  'and by the daily like-count edge function. Not a +1/-1 counter.';

comment on column public.marketplace_search_location.updated_at is
  'Set by the sync upsert. There is no touch trigger.';

create index marketplace_search_location_coordinates_gix
  on public.marketplace_search_location
  using gist (coordinates);

create index marketplace_search_location_category_ids_idx
  on public.marketplace_search_location
  using gin (category_ids);

create index marketplace_search_location_search_vector_idx
  on public.marketplace_search_location
  using gin (search_vector);

create index marketplace_search_location_search_text_trgm_idx
  on public.marketplace_search_location
  using gin (search_text extensions.gin_trgm_ops);

create index marketplace_search_location_name_trgm_idx
  on public.marketplace_search_location
  using gin (lower(name) extensions.gin_trgm_ops);

create index marketplace_search_location_company_id_idx
  on public.marketplace_search_location (company_id);

alter table public.marketplace_search_location enable row level security;

create policy "marketplace_search_location select (public)"
  on public.marketplace_search_location
  for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- 7) marketplace_media + public storage bucket
-- ---------------------------------------------------------------------------
create table public.marketplace_media (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.location (id) on delete cascade,
  company_id uuid not null references public.company (id) on delete cascade,
  storage_path text not null,
  type text not null default 'IMAGE',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint marketplace_media_storage_path_prefix check (
    starts_with(storage_path, company_id::text || '/')
  ),
  constraint marketplace_media_storage_path_nonempty check (storage_path <> ''),
  constraint marketplace_media_type_nonempty check (type <> '')
);

comment on table public.marketplace_media is
  'Gallery rows for a location. storage_path is an object name in the '
  'marketplace bucket and must start with {company_id}/. company_id is '
  'denormalized so the storage policies can check the prefix without a '
  'join. Public read is listed active locations only. locations:manage or '
  'settings:manage on the company may read and write even before the '
  'location is listed. type defaults to IMAGE.';

comment on column public.marketplace_media.storage_path is
  'Object name inside bucket marketplace. Lowercase company uuid prefix, '
  'matching storage.objects policies. Example: '
  '{company_id}/locations/{location_id}/{file}.jpg';

create index marketplace_media_location_sort_idx
  on public.marketplace_media (location_id, sort_order, id);

create index marketplace_media_company_id_idx
  on public.marketplace_media (company_id);

alter table public.marketplace_media enable row level security;

create policy "marketplace_media select (listed)"
  on public.marketplace_media
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from marketplace_internal.listed_location listed
      where listed.id = marketplace_media.location_id
    )
  );

create policy "marketplace_media select (owner)"
  on public.marketplace_media
  for select
  to authenticated
  using (
    private.has_company_permission('locations:manage', company_id)
    or private.has_company_permission('settings:manage', company_id)
  );

create policy "marketplace_media insert (owner)"
  on public.marketplace_media
  for insert
  to authenticated
  with check (
    (
      private.has_company_permission('locations:manage', company_id)
      or private.has_company_permission('settings:manage', company_id)
    )
    and exists (
      select 1
      from public.location l
      where l.id = location_id
        and l.company_id = marketplace_media.company_id
    )
  );

create policy "marketplace_media update (owner)"
  on public.marketplace_media
  for update
  to authenticated
  using (
    private.has_company_permission('locations:manage', company_id)
    or private.has_company_permission('settings:manage', company_id)
  )
  with check (
    (
      private.has_company_permission('locations:manage', company_id)
      or private.has_company_permission('settings:manage', company_id)
    )
    and exists (
      select 1
      from public.location l
      where l.id = location_id
        and l.company_id = marketplace_media.company_id
    )
  );

create policy "marketplace_media delete (owner)"
  on public.marketplace_media
  for delete
  to authenticated
  using (
    private.has_company_permission('locations:manage', company_id)
    or private.has_company_permission('settings:manage', company_id)
  );

-- Public object URL: /storage/v1/object/public/marketplace/{path}
-- 10 MiB, images only. The company bucket is unchanged.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'marketplace',
  'marketplace',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']::text[]
);

-- storage.objects already has row level security enabled on Supabase.
-- The table is owned by supabase_storage_admin. The migration role (postgres)
-- is not a member of that role, so `alter table storage.objects` fails here.
-- Do not try to enable RLS again. The policies below are created as postgres.

create policy "marketplace objects select (public)"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'marketplace');

-- Prefix must be a company uuid. Permission matches location writes.
-- The uuid test is inside the cast expression so a non-uuid prefix becomes
-- null and the permission helper returns false instead of raising.
create policy "marketplace objects insert (company prefix)"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'marketplace'
    and (
      private.has_company_permission(
        'locations:manage',
        case
          when split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            then split_part(name, '/', 1)::uuid
          else null
        end
      )
      or private.has_company_permission(
        'settings:manage',
        case
          when split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            then split_part(name, '/', 1)::uuid
          else null
        end
      )
    )
  );

create policy "marketplace objects update (company prefix)"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'marketplace'
    and (
      private.has_company_permission(
        'locations:manage',
        case
          when split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            then split_part(name, '/', 1)::uuid
          else null
        end
      )
      or private.has_company_permission(
        'settings:manage',
        case
          when split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            then split_part(name, '/', 1)::uuid
          else null
        end
      )
    )
  )
  with check (
    bucket_id = 'marketplace'
    and (
      private.has_company_permission(
        'locations:manage',
        case
          when split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            then split_part(name, '/', 1)::uuid
          else null
        end
      )
      or private.has_company_permission(
        'settings:manage',
        case
          when split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            then split_part(name, '/', 1)::uuid
          else null
        end
      )
    )
  );

create policy "marketplace objects delete (company prefix)"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'marketplace'
    and (
      private.has_company_permission(
        'locations:manage',
        case
          when split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            then split_part(name, '/', 1)::uuid
          else null
        end
      )
      or private.has_company_permission(
        'settings:manage',
        case
          when split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            then split_part(name, '/', 1)::uuid
          else null
        end
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 8) marketplace_location_like — users manage their own rows
-- ---------------------------------------------------------------------------
-- No webhook on this table. like_count on the projection is recounted by
-- the daily edge function and whenever sync rebuilds a location.

create table public.marketplace_location_like (
  location_id uuid not null references public.location (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (location_id, user_id)
);

comment on table public.marketplace_location_like is
  'Consumer likes. A user can select, insert, and delete only their own '
  'rows. Insert requires the location to be listed and active. Delete is '
  'allowed after unlist so the user can remove a stale like.';

create index marketplace_location_like_user_id_idx
  on public.marketplace_location_like (user_id);

alter table public.marketplace_location_like enable row level security;

create policy "marketplace_location_like select (own)"
  on public.marketplace_location_like
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "marketplace_location_like insert (own listed)"
  on public.marketplace_location_like
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from marketplace_internal.listed_location listed
      where listed.id = location_id
    )
  );

create policy "marketplace_location_like delete (own)"
  on public.marketplace_location_like
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 9) Grants — same shape as company_payment_account. RLS is the write gate.
-- ---------------------------------------------------------------------------
grant all on table public.marketplace_category to anon, authenticated, service_role;
grant all on table public.service_marketplace_category to anon, authenticated, service_role;
grant all on table public.marketplace_search_location to anon, authenticated, service_role;
grant all on table public.marketplace_media to anon, authenticated, service_role;
grant all on table public.marketplace_location_like to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 10) Apply-time verify
-- ---------------------------------------------------------------------------
do $$
declare
  category_count integer;
  tattoo_count integer;
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'marketplace_search_location'
      and column_name = 'is_published'
  ) then
    raise exception 'marketplace_search_location must not have is_published';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'location'
      and column_name = 'marketplace_description'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'location'
      and column_name = 'marketplace_published_at'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'service'
      and column_name = 'is_marketplace_visible'
  ) then
    raise exception 'location/service marketplace columns missing';
  end if;

  select count(*) into category_count from public.marketplace_category;
  select count(*) into tattoo_count
  from public.marketplace_category
  where slug = 'tatoeages-en-piercings';

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'marketplace_category'
      and column_name = 'parent_id'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'marketplace_search_location'
      and column_name = 'address'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'marketplace_media'
      and column_name = 'storage_path'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'marketplace_media'
      and column_name = 'type'
  ) then
    raise exception 'plan columns parent_id, address, storage_path, or type missing';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'marketplace_search_location'
      and column_name in ('street', 'postal_code', 'timezone')
  ) then
    raise exception 'projection must store address, not street/postal_code/timezone';
  end if;

  if category_count <> 11 then
    raise exception 'expected 11 marketplace categories, found %', category_count;
  end if;

  if tattoo_count <> 1 then
    raise exception 'tattoo category must be seeded once, found %', tattoo_count;
  end if;

  if not exists (
    select 1
    from storage.buckets
    where id = 'marketplace'
      and public is true
  ) then
    raise exception 'marketplace bucket missing or not public';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'marketplace_search_location'
      and policyname = 'marketplace_search_location select (public)'
      and cmd = 'SELECT'
      and qual = 'true'
  ) then
    raise exception 'projection select policy must be USING (true)';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'marketplace_search_location',
        'marketplace_category'
      )
      and cmd in ('INSERT', 'UPDATE', 'DELETE')
  ) then
    raise exception 'projection and category must not have client write policies';
  end if;

  if to_regclass('public.location_listed_slug_key') is null
     or to_regclass('public.marketplace_search_location_coordinates_gix') is null
     or to_regclass('public.marketplace_search_location_category_ids_idx') is null
     or to_regclass('public.marketplace_search_location_search_vector_idx') is null
     or to_regclass('public.marketplace_search_location_search_text_trgm_idx') is null
  then
    raise exception 'expected marketplace indexes missing';
  end if;
end
$$;
