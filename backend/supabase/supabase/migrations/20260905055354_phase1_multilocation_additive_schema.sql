-- Phase 1 ONLY — additive multi-location schema for SalonFlow (kvhinnhnwgvdpzggdnxs).
-- FILE ONLY — do not apply from CI or an agent. Glenn applies after review.
--
-- Do NOT: Phase 2 RLS cutover, JWT hook, UI, drop company address / staff.role /
-- staff_company, convert appointment.start to timestamptz, chairs/rooms, anon
-- listing policy, redo Phase 0 payment RLS / staff_company PK.
--
-- Live facts 2026-09-05: no location/membership/permission/role/client_location/
-- location_service tables. No location_id on appointment*, schedule*, order*,
-- payment, staff_service*. staff/service definition stay company-scoped.
-- staff_service / staff_service_variant get location_id (offer per shop).
-- 3 companies, 1:1 location backfill.

-- ---------------------------------------------------------------------------
-- 1) Extensions
-- ---------------------------------------------------------------------------
-- pg_trgm is not installed. Put it in extensions (same as pgcrypto / pg_net /
-- uuid-ossp), never public. Advisor ticket:
-- https://app.notion.com/p/3d16789dd08381f0aac8d98540653ef2
create extension if not exists pg_trgm with schema extensions;

-- postgis + btree_gist are installed in public today. NOT moved in this file.
-- Why unsafe on this project (do in a dedicated branch, never live-first):
--   * postgis owns public.geography used by company.geo_location
--   * public.spatial_ref_sys (8500 rows, RLS off — pre-existing advisor)
--   * nearby_companies_v2 and other SQL call ST_* without schema qualification
--   * btree_gist contributes ~188 functions in public; no EXCLUDE constraints
--     today, but ALTER EXTENSION SET SCHEMA still rewrites operators/opclasses
--     that future staff_busy_no_overlap EXCLUDE will need
-- After a successful branch test of:
--   alter extension postgis set schema extensions;
--   alter extension btree_gist set schema extensions;
-- re-check get_advisors(type: security) for extension_in_public and re-run
-- nearby_companies_v2. Until then leave them in public.

-- ---------------------------------------------------------------------------
-- 2) private schema (trigger helpers; not exposed via Data API)
-- ---------------------------------------------------------------------------
create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

comment on schema private is
  'Internal helpers (triggers). Not in API schemas. Phase 2 will add has_permission here.';

-- ---------------------------------------------------------------------------
-- 3) permission / role / role_permission (global catalog + system roles)
-- ---------------------------------------------------------------------------
create table public.permission (
  key text primary key
);

comment on table public.permission is
  'Global permission catalog. Companies do not create keys. manage = full bundle on that resource.';

insert into public.permission (key) values
  ('locations:read'),
  ('locations:manage'),
  ('calendar:read'),
  ('calendar:write'),
  ('schedule:manage'),
  ('catalog:manage'),
  ('staff:manage'),
  ('clients:read'),
  ('clients:manage'),
  ('pos:read'),
  ('pos:manage'),
  ('pos:refund'),
  ('billing:manage'),
  ('settings:manage'),
  ('invites:manage');

create table public.role (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  name text not null,
  is_system boolean not null default false,
  company_id uuid references public.company(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint role_scope_check check (scope in ('company', 'location')),
  constraint role_system_company_check check (
    (is_system and company_id is null)
    or (not is_system and company_id is not null)
  )
);

create unique index role_system_name_key
  on public.role (name)
  where is_system;

create unique index role_company_name_key
  on public.role (company_id, name)
  where company_id is not null;

comment on table public.role is
  'Role is a permission bundle. scope=company|location. is_system + company_id null = catalog role. Never mutate system rows. Custom roles (company_id set) are later.';

comment on column public.role.scope is
  'Enforced at membership tables: company roles only on company_membership, location roles only on location_membership.';

insert into public.role (scope, name, is_system, company_id) values
  ('company', 'owner', true, null),
  ('company', 'admin', true, null),
  ('location', 'manager', true, null),
  ('location', 'stylist', true, null),
  ('location', 'staff', true, null),
  ('location', 'freelancer', true, null);

create table public.role_permission (
  role_id uuid not null references public.role(id) on delete cascade,
  permission_key text not null references public.permission(key) on delete cascade,
  primary key (role_id, permission_key)
);

-- Owner: one row per permission (not hardcoded allow-all).
insert into public.role_permission (role_id, permission_key)
select r.id, p.key
from public.role r
cross join public.permission p
where r.name = 'owner' and r.is_system;

-- Admin: company operations; billing stays owner-only.
insert into public.role_permission (role_id, permission_key)
select r.id, p.key
from public.role r
cross join public.permission p
where r.name = 'admin'
  and r.is_system
  and p.key <> 'billing:manage';

-- Location system roles. Grants are unused until Phase 2 policies.
insert into public.role_permission (role_id, permission_key)
select r.id, p.key
from public.role r
cross join public.permission p
where r.name = 'manager'
  and r.is_system
  and p.key in (
    'locations:read',
    'calendar:read',
    'calendar:write',
    'schedule:manage',
    'catalog:manage',
    'staff:manage',
    'clients:read',
    'clients:manage',
    'pos:read',
    'pos:manage',
    'pos:refund',
    'invites:manage'
  );

insert into public.role_permission (role_id, permission_key)
select r.id, p.key
from public.role r
cross join public.permission p
where r.name = 'stylist'
  and r.is_system
  and p.key in (
    'locations:read',
    'calendar:read',
    'calendar:write',
    'clients:read',
    'clients:manage',
    'pos:read'
  );

insert into public.role_permission (role_id, permission_key)
select r.id, p.key
from public.role r
cross join public.permission p
where r.name = 'staff'
  and r.is_system
  and p.key in (
    'locations:read',
    'calendar:read',
    'clients:read',
    'pos:read'
  );

insert into public.role_permission (role_id, permission_key)
select r.id, p.key
from public.role r
cross join public.permission p
where r.name = 'freelancer'
  and r.is_system
  and p.key in (
    'locations:read',
    'calendar:read',
    'calendar:write',
    'clients:read',
    'pos:read'
  );

-- ---------------------------------------------------------------------------
-- 4) location — 1:1 per existing company
-- ---------------------------------------------------------------------------
create table public.location (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.company(id) on delete cascade,
  name text not null,
  slug text,
  country text,
  state text,
  city text,
  postal_code text,
  street text,
  geo_location public.geography(point, 4326),
  email text,
  image_url text,
  timezone text not null default 'Europe/Brussels',
  is_primary boolean not null default false,
  is_listed boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint location_timezone_nonempty check (timezone <> '')
);

comment on table public.location is
  'Place of work (address, geo, IANA timezone, listing). company stays brand/billing/Stripe. Phase 1: is_listed default false, no anon policy.';

comment on column public.location.timezone is
  'IANA zone, not null. appointment.start/end stay timestamp without time zone in this cut.';

comment on column public.location.is_primary is
  'Exactly one true per company. Resolves legacy company.slug booking URLs until the tenant picks.';

comment on column public.location.is_listed is
  'Marketplace groundwork. Default false. Do not add anon SELECT in Phase 1 — listed rows still expose every column.';

insert into public.location (
  company_id,
  name,
  slug,
  country,
  state,
  city,
  postal_code,
  street,
  geo_location,
  email,
  image_url,
  timezone,
  is_primary,
  is_listed,
  is_active
)
select
  c.id,
  c.name,
  c.slug,
  c.country,
  c.state,
  c.city,
  c.postal_code,
  c.street,
  c.geo_location,
  c.email,
  c.image_url,
  'Europe/Brussels',
  true,
  false,
  true
from public.company c;

create index location_company_id_idx on public.location (company_id);
create index location_geo_location_gix on public.location using gist (geo_location);
create unique index location_company_id_slug_key on public.location (company_id, slug);
create unique index location_one_primary_per_company
  on public.location (company_id)
  where is_primary;
create index location_name_trgm_idx
  on public.location
  using gin (lower(name) extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- 5) Dual-write helper — fill location_id from primary when writers still
--    send only company_id (zero app-impact while 1:1). Then stamp company_id
--    from location so the two cannot drift.
-- ---------------------------------------------------------------------------
create or replace function private.sync_company_id_from_location()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.location_id is null and new.company_id is not null then
    select id
      into new.location_id
    from public.location
    where company_id = new.company_id
      and is_primary
    limit 1;
  end if;

  if new.location_id is null then
    raise exception
      'location_id is required (or company_id so the primary location can be resolved)';
  end if;

  select company_id
    into new.company_id
  from public.location
  where id = new.location_id;

  if new.company_id is null then
    raise exception 'location % not found', new.location_id;
  end if;

  return new;
end;
$$;

revoke all on function private.sync_company_id_from_location() from public;
revoke all on function private.sync_company_id_from_location() from anon, authenticated;

-- appointment.company_id has no FK today. Add it with location_id.
do $$
begin
  if exists (
    select 1
    from public.appointment a
    left join public.company c on c.id = a.company_id
    where c.id is null
  ) then
    raise exception 'appointment.company_id orphans; cannot add FK';
  end if;
end;
$$;

alter table public.appointment
  add constraint appointment_company_id_fkey
  foreign key (company_id)
  references public.company(id)
  on update cascade
  on delete cascade;

-- 5a) location_id on scoped tables (not staff person, not service definition).
-- staff_service / staff_service_variant ARE included: offer is per location.
-- Phase 1 still company-scoped app writes; location_id enables per-shop
-- "I do keratin only at A" once apps/UI send location_id.
alter table public.appointment
  add column location_id uuid references public.location(id) on update cascade on delete cascade;

alter table public.appointment_segment
  add column location_id uuid references public.location(id) on update cascade on delete cascade;

alter table public.appointment_segment_phase
  add column location_id uuid references public.location(id) on update cascade on delete cascade;

alter table public.staff_schedule_rule
  add column location_id uuid references public.location(id) on update cascade on delete cascade;

alter table public.staff_schedule_exception
  add column location_id uuid references public.location(id) on update cascade on delete cascade;

alter table public."order"
  add column location_id uuid references public.location(id) on update cascade on delete cascade;

alter table public.order_item
  add column location_id uuid references public.location(id) on update cascade on delete cascade;

alter table public.payment
  add column location_id uuid references public.location(id) on update cascade on delete cascade;

alter table public.staff_service
  add column location_id uuid references public.location(id) on update cascade on delete cascade;

alter table public.staff_service_variant
  add column location_id uuid references public.location(id) on update cascade on delete cascade;

-- Backfill via the 1:1 company → location map
update public.appointment a
set location_id = l.id
from public.location l
where l.company_id = a.company_id;

update public.appointment_segment s
set location_id = l.id
from public.location l
where l.company_id = s.company_id;

update public.appointment_segment_phase p
set location_id = l.id
from public.location l
where l.company_id = p.company_id;

update public.staff_schedule_rule r
set location_id = l.id
from public.location l
where l.company_id = r.company_id;

update public.staff_schedule_exception e
set location_id = l.id
from public.location l
where l.company_id = e.company_id;

update public."order" o
set location_id = l.id
from public.location l
where l.company_id = o.company_id;

-- 5 orders (2026-09-05) have company_id null but order_item.company_id set
update public."order" o
set location_id = l.id
from public.order_item oi
join public.location l on l.company_id = oi.company_id
where o.location_id is null
  and oi.order_id = o.id
  and oi.company_id is not null;

update public.order_item oi
set location_id = l.id
from public.location l
where l.company_id = oi.company_id;

update public.payment p
set location_id = l.id
from public.location l
where l.company_id = p.company_id;

update public.staff_service ss
set location_id = l.id
from public.location l
where l.company_id = ss.company_id
  and l.is_primary;

update public.staff_service_variant ssv
set location_id = l.id
from public.location l
where l.company_id = ssv.company_id
  and l.is_primary;

create trigger sync_company_id_from_location
  before insert or update of location_id
  on public.appointment
  for each row
  execute function private.sync_company_id_from_location();

create trigger sync_company_id_from_location
  before insert or update of location_id
  on public.appointment_segment
  for each row
  execute function private.sync_company_id_from_location();

create trigger sync_company_id_from_location
  before insert or update of location_id
  on public.appointment_segment_phase
  for each row
  execute function private.sync_company_id_from_location();

create trigger sync_company_id_from_location
  before insert or update of location_id
  on public.staff_schedule_rule
  for each row
  execute function private.sync_company_id_from_location();

create trigger sync_company_id_from_location
  before insert or update of location_id
  on public.staff_schedule_exception
  for each row
  execute function private.sync_company_id_from_location();

create trigger sync_company_id_from_location
  before insert or update of location_id
  on public."order"
  for each row
  execute function private.sync_company_id_from_location();

create trigger sync_company_id_from_location
  before insert or update of location_id
  on public.order_item
  for each row
  execute function private.sync_company_id_from_location();

create trigger sync_company_id_from_location
  before insert or update of location_id
  on public.payment
  for each row
  execute function private.sync_company_id_from_location();

create trigger sync_company_id_from_location
  before insert or update of location_id
  on public.staff_service
  for each row
  execute function private.sync_company_id_from_location();

create trigger sync_company_id_from_location
  before insert or update of location_id
  on public.staff_service_variant
  for each row
  execute function private.sync_company_id_from_location();

-- Stamp company_id on the leftover orders now that location_id is known
update public."order" o
set company_id = l.company_id
from public.location l
where l.id = o.location_id
  and o.company_id is null;

alter table public.appointment alter column location_id set not null;
alter table public.appointment_segment alter column location_id set not null;
alter table public.appointment_segment_phase alter column location_id set not null;
alter table public.staff_schedule_rule alter column location_id set not null;
alter table public.staff_schedule_exception alter column location_id set not null;
alter table public."order" alter column location_id set not null;
alter table public.order_item alter column location_id set not null;
alter table public.payment alter column location_id set not null;
alter table public.staff_service alter column location_id set not null;
alter table public.staff_service_variant alter column location_id set not null;

-- Offer unique is per location (was company-level staff+service).
-- 1:1 backfill: no collisions on the old (staff_id, service_id) key.
alter table public.staff_service
  drop constraint staff_service_staff_service_key;
alter table public.staff_service
  add constraint staff_service_staff_location_service_key
  unique (staff_id, location_id, service_id);

alter table public.staff_service_variant
  drop constraint staff_service_variant_staff_variant_key;
alter table public.staff_service_variant
  add constraint staff_service_variant_staff_location_variant_key
  unique (staff_id, location_id, service_variant_id);

create index appointment_location_id_start_idx
  on public.appointment (location_id, start);
create index appointment_segment_location_id_staff_id_starts_at_idx
  on public.appointment_segment (location_id, staff_id, starts_at);
create index appointment_segment_phase_location_id_idx
  on public.appointment_segment_phase (location_id);
create index staff_schedule_rule_location_id_staff_id_day_of_week_idx
  on public.staff_schedule_rule (location_id, staff_id, day_of_week);
create index staff_schedule_exception_location_id_idx
  on public.staff_schedule_exception (location_id);
create index order_location_id_idx
  on public."order" (location_id);
create index order_item_location_id_idx
  on public.order_item (location_id);
create index payment_location_id_idx
  on public.payment (location_id);
create index staff_service_location_id_service_id_idx
  on public.staff_service (location_id, service_id);
create index staff_service_location_id_staff_id_idx
  on public.staff_service (location_id, staff_id);
create index staff_service_variant_location_id_service_variant_id_idx
  on public.staff_service_variant (location_id, service_variant_id);
create index staff_service_variant_location_id_staff_id_idx
  on public.staff_service_variant (location_id, staff_id);

comment on column public.staff_service.location_id is
  'Phase 1 still company-scoped app writes (trigger fills from primary location). Enables per-shop "I do keratin only at A" once apps/UI send location_id.';

comment on column public.staff_service_variant.location_id is
  'Phase 1 still company-scoped app writes (trigger fills from primary location). Enables per-shop variant offer once apps/UI send location_id.';

-- ---------------------------------------------------------------------------
-- 6) location_service + client_location
-- ---------------------------------------------------------------------------
create table public.location_service (
  location_id uuid not null references public.location(id) on delete cascade,
  service_id uuid not null references public.service(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (location_id, service_id)
);

comment on table public.location_service is
  'Which location sells a company-scoped service. Price override / menu UI later.';

insert into public.location_service (location_id, service_id)
select l.id, s.id
from public.service s
join public.location l on l.company_id = s.company_id;

create table public.client_location (
  client_id uuid not null references public.client(id) on delete cascade,
  location_id uuid not null references public.location(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (client_id, location_id)
);

comment on table public.client_location is
  'Day-to-day logbook scope. 1 client + N locations. Keep client_company as company rollup.';

insert into public.client_location (client_id, location_id)
select cc.client_id, l.id
from public.client_company cc
join public.location l on l.company_id = cc.company_id;

create index location_service_service_id_idx on public.location_service (service_id);
create index client_location_location_id_idx on public.client_location (location_id);

-- ---------------------------------------------------------------------------
-- 7) Memberships + role.scope enforcement
-- ---------------------------------------------------------------------------
create table public.company_membership (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.company(id) on delete cascade,
  role_id uuid not null references public.role(id),
  created_at timestamptz not null default now(),
  unique (user_id, company_id)
);

comment on table public.company_membership is
  'Company-scoped assignment (owner/admin). No per-location row. JWT is a cache.';

create table public.location_membership (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  location_id uuid not null references public.location(id) on delete cascade,
  staff_id uuid references public.staff(id) on delete set null,
  role_id uuid not null references public.role(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, location_id)
);

comment on table public.location_membership is
  'Location-scoped assignment (manager/stylist/staff/freelancer). 1 staff row = 1 person.';

create index company_membership_user_id_idx
  on public.company_membership (user_id);
create index location_membership_user_id_active_idx
  on public.location_membership (user_id)
  where is_active;
create index location_membership_location_id_idx
  on public.location_membership (location_id);
create index location_membership_staff_id_idx
  on public.location_membership (staff_id);

create or replace function private.enforce_membership_role_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scope text;
  v_expected text;
begin
  select scope
    into v_scope
  from public.role
  where id = new.role_id;

  if v_scope is null then
    raise exception 'role % does not exist', new.role_id;
  end if;

  if tg_table_name = 'company_membership' then
    v_expected := 'company';
  elsif tg_table_name = 'location_membership' then
    v_expected := 'location';
  else
    raise exception 'enforce_membership_role_scope on unexpected table %', tg_table_name;
  end if;

  if v_scope is distinct from v_expected then
    raise exception
      'role.scope % cannot be assigned on %',
      v_scope,
      tg_table_name;
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_membership_role_scope() from public;
revoke all on function private.enforce_membership_role_scope() from anon, authenticated;

create trigger enforce_membership_role_scope
  before insert or update of role_id
  on public.company_membership
  for each row
  execute function private.enforce_membership_role_scope();

create trigger enforce_membership_role_scope
  before insert or update of role_id
  on public.location_membership
  for each row
  execute function private.enforce_membership_role_scope();

-- company_membership:
--   * staff.role = 'Owner' + user_id → system owner (nailsbloom / Sandra).
--   * If a company has zero staff.role = 'Owner' rows, EVERY staff row on
--     that company with a non-null user_id also gets system owner.
--     Live 2026-09-05 that is D'Ana Hair and Glenn Salon. nailsbloom already
--     has an Owner, so it is not in this second pass (no extra invent).
-- Location memberships below are kept (owner company row does not replace them).
--
-- staff with user_id, by company (others have user_id null and cannot join):
--   nailsbloom  acd31c93-1a2f-452c-b021-fbdeac8c6a82
--     1fbe7513-a8e8-4c13-9787-75750bdf8d43  Sandra Martins
--     user_id 118f4b21-3d2f-49c2-b53f-91f29dc1bb53  role Owner
--     → company_membership owner (existing Owner mapping only)
--   Glenn Salon  b66720ac-dcb8-4051-b287-f8f8b6291cc0
--     c9599318-ee8d-4349-a121-9bdd0f07c950  Anapaula Troncquo
--     user_id 8a7c7534-c467-4350-8467-dab68fc7435c  role Staff Member
--     → company_membership owner + location_membership staff
--   D'Ana Hair  19789524-a05a-4434-bc3f-63e6e333205e
--     8446e8ef-7e84-49c7-94b4-9a4b3a85fbf8  Ana Paula (info.danahair@gmail.com)
--     user_id 2c223789-584f-452c-ae6b-6590681c6a72  role null
--     → company_membership owner + location_membership manager
insert into public.company_membership (user_id, company_id, role_id)
select
  s.user_id,
  s.company_id,
  (select r.id from public.role r where r.name = 'owner' and r.is_system)
from public.staff s
where s.role = 'Owner'
  and s.user_id is not null
  and s.company_id is not null;

insert into public.company_membership (user_id, company_id, role_id)
select
  s.user_id,
  s.company_id,
  (select r.id from public.role r where r.name = 'owner' and r.is_system)
from public.staff s
where s.user_id is not null
  and s.company_id is not null
  and not exists (
    select 1
    from public.staff owner_row
    where owner_row.company_id = s.company_id
      and owner_row.role = 'Owner'
  );

-- Staff Member + user_id → location staff on the company's one location.
insert into public.location_membership (user_id, location_id, staff_id, role_id)
select
  s.user_id,
  l.id,
  s.id,
  (select r.id from public.role r where r.name = 'staff' and r.is_system)
from public.staff s
join public.location l on l.company_id = s.company_id
where s.role = 'Staff Member'
  and s.user_id is not null;

-- Glenn: Ana Paula D'Ana Hair (8446e8ef-7e84-49c7-94b4-9a4b3a85fbf8,
-- info.danahair@gmail.com, role null) → system location role manager.
-- company_membership owner is added above (no-Owner-company pass); keep manager.
insert into public.location_membership (user_id, location_id, staff_id, role_id)
select
  s.user_id,
  l.id,
  s.id,
  (select r.id from public.role r where r.name = 'manager' and r.is_system)
from public.staff s
join public.location l on l.company_id = s.company_id
where s.id = '8446e8ef-7e84-49c7-94b4-9a4b3a85fbf8'
  and s.user_id is not null;

-- ---------------------------------------------------------------------------
-- 8) RLS — JWT company_ids, same shape as existing "Company Access"
--    No Phase 2 has_permission policies. No anon listing policy.
-- ---------------------------------------------------------------------------
alter table public.permission enable row level security;
alter table public.role enable row level security;
alter table public.role_permission enable row level security;
alter table public.location enable row level security;
alter table public.location_service enable row level security;
alter table public.client_location enable row level security;
alter table public.company_membership enable row level security;
alter table public.location_membership enable row level security;

-- Catalog: authenticated read. Writes via service_role (bypasses RLS).
create policy "Authenticated read catalog"
  on public.permission
  for select
  to authenticated
  using (true);

create policy "Authenticated read catalog"
  on public.role
  for select
  to authenticated
  using (true);

create policy "Authenticated read catalog"
  on public.role_permission
  for select
  to authenticated
  using (true);

create policy "Company Access"
  on public.location
  for all
  to authenticated
  using (
    (((select auth.jwt()) -> 'app_metadata') -> 'company_ids') is not null
    and company_id is not null
    and (((select auth.jwt()) -> 'app_metadata') -> 'company_ids') ? (company_id)::text
  );

create policy "Company Access"
  on public.company_membership
  for all
  to authenticated
  using (
    (((select auth.jwt()) -> 'app_metadata') -> 'company_ids') is not null
    and company_id is not null
    and (((select auth.jwt()) -> 'app_metadata') -> 'company_ids') ? (company_id)::text
  );

create policy "Company Access"
  on public.location_service
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.location l
      where l.id = location_service.location_id
        and (((select auth.jwt()) -> 'app_metadata') -> 'company_ids') is not null
        and l.company_id is not null
        and (((select auth.jwt()) -> 'app_metadata') -> 'company_ids') ? (l.company_id)::text
    )
  );

create policy "Company Access"
  on public.client_location
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.location l
      where l.id = client_location.location_id
        and (((select auth.jwt()) -> 'app_metadata') -> 'company_ids') is not null
        and l.company_id is not null
        and (((select auth.jwt()) -> 'app_metadata') -> 'company_ids') ? (l.company_id)::text
    )
  );

create policy "Company Access"
  on public.location_membership
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.location l
      where l.id = location_membership.location_id
        and (((select auth.jwt()) -> 'app_metadata') -> 'company_ids') is not null
        and l.company_id is not null
        and (((select auth.jwt()) -> 'app_metadata') -> 'company_ids') ? (l.company_id)::text
    )
  );

grant all on table public.permission to anon, authenticated, service_role;
grant all on table public.role to anon, authenticated, service_role;
grant all on table public.role_permission to anon, authenticated, service_role;
grant all on table public.location to anon, authenticated, service_role;
grant all on table public.location_service to anon, authenticated, service_role;
grant all on table public.client_location to anon, authenticated, service_role;
grant all on table public.company_membership to anon, authenticated, service_role;
grant all on table public.location_membership to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 9) Apply-time verify (fails the migration if backfill is incomplete)
-- ---------------------------------------------------------------------------
do $$
declare
  loc_n int;
  co_n int;
  ana_paula_danahair constant uuid := '8446e8ef-7e84-49c7-94b4-9a4b3a85fbf8';
  danahair constant uuid := '19789524-a05a-4434-bc3f-63e6e333205e';
  glenn_salon constant uuid := 'b66720ac-dcb8-4051-b287-f8f8b6291cc0';
begin
  select count(*) into loc_n from public.location;
  select count(*) into co_n from public.company;
  if loc_n is distinct from co_n then
    raise exception 'location count % != company count %', loc_n, co_n;
  end if;

  if exists (
    select 1
    from public.company c
    where (
      select count(*) from public.location l
      where l.company_id = c.id and l.is_primary
    ) <> 1
  ) then
    raise exception 'each company must have exactly one primary location';
  end if;

  if exists (select 1 from public.appointment where location_id is null)
     or exists (select 1 from public.appointment_segment where location_id is null)
     or exists (select 1 from public.appointment_segment_phase where location_id is null)
     or exists (select 1 from public.staff_schedule_rule where location_id is null)
     or exists (select 1 from public.staff_schedule_exception where location_id is null)
     or exists (select 1 from public."order" where location_id is null)
     or exists (select 1 from public.order_item where location_id is null)
     or exists (select 1 from public.payment where location_id is null)
     or exists (select 1 from public.staff_service where location_id is null)
     or exists (select 1 from public.staff_service_variant where location_id is null)
  then
    raise exception 'location_id nulls remain on a scoped table';
  end if;

  if exists (
    select 1
    from public.staff_service ss
    join public.location l on l.id = ss.location_id
    where ss.company_id is distinct from l.company_id
  ) or exists (
    select 1
    from public.staff_service_variant ssv
    join public.location l on l.id = ssv.location_id
    where ssv.company_id is distinct from l.company_id
  ) then
    raise exception 'staff_service*.company_id does not match location.company_id';
  end if;

  if exists (
    select 1
    from public.service s
    where not exists (
      select 1
      from public.location_service ls
      join public.location l on l.id = ls.location_id
      where ls.service_id = s.id
        and l.company_id = s.company_id
    )
  ) then
    raise exception 'service missing location_service for its company location';
  end if;

  if exists (
    select 1
    from public.client_company cc
    where not exists (
      select 1
      from public.client_location cl
      join public.location l on l.id = cl.location_id
      where cl.client_id = cc.client_id
        and l.company_id = cc.company_id
    )
  ) then
    raise exception 'client_company row missing client_location for its company location';
  end if;

  if exists (
    select 1
    from public.staff s
    where s.role = 'Owner'
      and s.user_id is not null
      and not exists (
        select 1
        from public.company_membership cm
        join public.role r on r.id = cm.role_id
        where cm.user_id = s.user_id
          and cm.company_id = s.company_id
          and r.name = 'owner'
          and r.is_system
      )
  ) then
    raise exception 'Owner staff with user_id missing company_membership owner';
  end if;

  if exists (
    select 1
    from public.staff s
    where s.role = 'Staff Member'
      and s.user_id is not null
      and not exists (
        select 1
        from public.location_membership lm
        join public.location l on l.id = lm.location_id
        join public.role r on r.id = lm.role_id
        where lm.user_id = s.user_id
          and l.company_id = s.company_id
          and r.name = 'staff'
          and r.is_system
      )
  ) then
    raise exception 'Staff Member with user_id missing location_membership staff';
  end if;

  if not exists (
    select 1
    from public.location_membership lm
    join public.role r on r.id = lm.role_id
    where lm.staff_id = ana_paula_danahair
      and r.name = 'manager'
      and r.is_system
  ) then
    raise exception 'Ana Paula D''Ana Hair % must keep location role manager', ana_paula_danahair;
  end if;

  -- Companies with zero staff.role = Owner: every staff-with-user_id is owner.
  if exists (
    select 1
    from public.staff s
    where s.user_id is not null
      and s.company_id is not null
      and not exists (
        select 1
        from public.staff owner_row
        where owner_row.company_id = s.company_id
          and owner_row.role = 'Owner'
      )
      and not exists (
        select 1
        from public.company_membership cm
        join public.role r on r.id = cm.role_id
        where cm.user_id = s.user_id
          and cm.company_id = s.company_id
          and r.name = 'owner'
          and r.is_system
      )
  ) then
    raise exception
      'staff with user_id on a no-Owner company must have company_membership owner';
  end if;

  if not exists (
    select 1
    from public.company_membership cm
    join public.staff s on s.user_id = cm.user_id and s.company_id = cm.company_id
    join public.role r on r.id = cm.role_id
    where s.id = ana_paula_danahair
      and cm.company_id = danahair
      and r.name = 'owner'
      and r.is_system
  ) then
    raise exception 'Ana Paula D''Ana Hair % must have company_membership owner', ana_paula_danahair;
  end if;

  if exists (
    select 1
    from public.staff s
    where s.company_id = glenn_salon
      and s.user_id is not null
      and not exists (
        select 1
        from public.company_membership cm
        join public.role r on r.id = cm.role_id
        where cm.user_id = s.user_id
          and cm.company_id = glenn_salon
          and r.name = 'owner'
          and r.is_system
      )
  ) then
    raise exception 'Glenn Salon staff with user_id must have company_membership owner';
  end if;
end;
$$;
