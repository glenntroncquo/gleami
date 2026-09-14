-- Phase 4 ONLY — per-tenant multi-location product flag + owner/admin CRUD.
-- FILE ONLY — do not apply from CI or an agent. Glenn applies after review.
--
-- Depends on Phase 1 (location + unique primary + dual-write trigger),
-- Phase 2 (private.has_permission / has_company_permission /
-- location_ids_for_user; location SELECT membership + write permission
-- policies), Phase 3 (public my_* / has_* wrappers).
--
-- Do NOT: Phase 5 drops (staff.role, staff_company, company address),
-- chairs/rooms, marketplace / anon listing, Expo, convert appointment
-- timestamptz, force every company to multi, apply to SalonFlow production.
--
-- Live facts 2026-09-05 (SalonFlow kvhinnhnwgvdpzggdnxs):
--   * company has no multi_location_enabled
--   * location_one_primary_per_company unique (company_id) WHERE is_primary
--   * location SELECT: id in (select private.location_ids_for_user())
--   * location writes: has_company_permission('locations:manage')
--     OR has_permission('locations:manage', id)
--   * Seeded keys include locations:manage and settings:manage.
--     Owner = every key. Admin = every key except billing:manage.
--     Location roles do not get locations:manage or settings:manage.
--   * 3 companies, still 1:1. Flag default false keeps it that way.
--   * private.sync_company_id_from_location always fills location_id from
--     the primary when only company_id is sent.
--
-- Choice: close a location with is_active=false. Do not hard-delete when
-- appointments exist (BEFORE DELETE trigger). Empty non-primary rows may
-- still be deleted (mistake cleanup). Primary row cannot be deleted.

-- ---------------------------------------------------------------------------
-- 1) company.multi_location_enabled — default false, operator-only flip
-- ---------------------------------------------------------------------------
alter table public.company
  add column if not exists multi_location_enabled boolean not null default false;

comment on column public.company.multi_location_enabled is
  'Phase 4 per-tenant flag. Default false = stay 1:1 (current clients). '
  'true = company may have more than one location; location-scoped writes '
  'must send location_id. Flip via service_role only, e.g. '
  'update public.company set multi_location_enabled = true '
  'where id = ''b66720ac-dcb8-4051-b287-f8f8b6291cc0''; -- Glenn Salon';

create or replace function private.guard_multi_location_enabled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and new.multi_location_enabled is distinct from old.multi_location_enabled
     and auth.role() is distinct from 'service_role'
     and current_user not in ('postgres', 'supabase_admin')
  then
    raise exception
      'company.multi_location_enabled is operator-only (service_role)';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_multi_location_enabled() from public;
revoke all on function private.guard_multi_location_enabled() from anon, authenticated;

drop trigger if exists guard_multi_location_enabled on public.company;
create trigger guard_multi_location_enabled
  before update of multi_location_enabled
  on public.company
  for each row
  execute function private.guard_multi_location_enabled();

-- ---------------------------------------------------------------------------
-- 2) Dual-write trigger — require location_id when the flag is on
-- ---------------------------------------------------------------------------
-- Flag false / 1:1: keep Phase 1 behaviour (fill from primary). Current
-- clients that only send company_id keep working.
-- Flag true: do not guess the shop — raise if location_id is missing.
create or replace function private.sync_company_id_from_location()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_multi boolean;
begin
  if new.location_id is null and new.company_id is not null then
    select c.multi_location_enabled
      into v_multi
    from public.company c
    where c.id = new.company_id;

    if coalesce(v_multi, false) then
      raise exception
        'location_id is required when company.multi_location_enabled is true';
    end if;

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

-- ---------------------------------------------------------------------------
-- 3) location RLS writes — company locations:manage OR settings:manage
-- ---------------------------------------------------------------------------
-- Reads stay membership-set (Phase 2). Create/close location is company-
-- scoped (owner/admin). Drop the unused has_permission(locations:manage, id)
-- branch — no location role is seeded that key.
drop policy if exists "location insert (permission)" on public.location;
drop policy if exists "location update (permission)" on public.location;
drop policy if exists "location delete (permission)" on public.location;

create policy "location insert (permission)"
  on public.location
  for insert
  to authenticated
  with check (
    private.has_company_permission('locations:manage', company_id)
    or private.has_company_permission('settings:manage', company_id)
  );

create policy "location update (permission)"
  on public.location
  for update
  to authenticated
  using (
    private.has_company_permission('locations:manage', company_id)
    or private.has_company_permission('settings:manage', company_id)
  )
  with check (
    private.has_company_permission('locations:manage', company_id)
    or private.has_company_permission('settings:manage', company_id)
  );

create policy "location delete (permission)"
  on public.location
  for delete
  to authenticated
  using (
    private.has_company_permission('locations:manage', company_id)
    or private.has_company_permission('settings:manage', company_id)
  );

-- ---------------------------------------------------------------------------
-- 4) Enforce 1:1 unless flagged; keep exactly one primary; no hard-delete
--    when appointments exist
-- ---------------------------------------------------------------------------
-- location_one_primary_per_company already exists (Phase 1) — at most one
-- primary. This trigger adds: at least one primary; second+ location only
-- when the flag is on; never delete primary; never delete if appointments
-- exist (close with is_active=false instead).
create or replace function private.enforce_location_product_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_multi boolean;
begin
  if tg_op = 'INSERT' then
    v_company_id := new.company_id;

    select c.multi_location_enabled
      into v_multi
    from public.company c
    where c.id = v_company_id;

    if exists (
      select 1
      from public.location l
      where l.company_id = v_company_id
        and l.id is distinct from new.id
    ) and not coalesce(v_multi, false) then
      raise exception
        'company % is not multi-location enabled',
        v_company_id;
    end if;

    if new.is_primary
       and exists (
         select 1
         from public.location l
         where l.company_id = v_company_id
           and l.id is distinct from new.id
           and l.is_primary
       )
    then
      raise exception
        'company % already has a primary location',
        v_company_id;
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.is_primary and not new.is_primary then
      if not exists (
        select 1
        from public.location l
        where l.company_id = new.company_id
          and l.id is distinct from new.id
          and l.is_primary
      ) then
        raise exception
          'company % must keep exactly one primary location',
          new.company_id;
      end if;
    end if;

    if new.company_id is distinct from old.company_id then
      raise exception 'location.company_id cannot be moved';
    end if;

    return new;
  end if;

  -- DELETE
  if old.is_primary then
    raise exception
      'cannot delete the primary location of company % — create/promote another first, or deactivate with is_active=false',
      old.company_id;
  end if;

  if exists (
    select 1
    from public.appointment a
    where a.location_id = old.id
  ) then
    raise exception
      'cannot delete location %; appointments exist — set is_active=false instead',
      old.id;
  end if;

  return old;
end;
$$;

revoke all on function private.enforce_location_product_rules() from public;
revoke all on function private.enforce_location_product_rules() from anon, authenticated;

drop trigger if exists enforce_location_product_rules on public.location;
create trigger enforce_location_product_rules
  before insert or update or delete
  on public.location
  for each row
  execute function private.enforce_location_product_rules();

comment on function private.enforce_location_product_rules() is
  'Phase 4: extra locations require company.multi_location_enabled. '
  'Exactly one is_primary (with unique index location_one_primary_per_company). '
  'Hard-delete blocked for primary and for any location with appointments; '
  'close via is_active=false.';

-- ---------------------------------------------------------------------------
-- 5) public.my_locations — list locations for the caller''s memberships
-- ---------------------------------------------------------------------------
-- Phase 3 already has my_location_ids (uuid[]) and my_memberships (roles).
-- Apps still need the location rows (name, timezone, address, flags).
create or replace function public.my_locations()
returns setof public.location
language sql
stable
security invoker
set search_path = public
as $$
  select l.*
  from public.location l
  where l.id in (select private.location_ids_for_user());
$$;

comment on function public.my_locations() is
  'Location rows the caller can see: active location_membership plus every '
  'location of companies where they have company_membership (owner/admin). '
  'Includes inactive locations so an owner can reopen/close shops.';

revoke all on function public.my_locations() from public;
revoke all on function public.my_locations() from anon;
grant execute on function public.my_locations() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6) create_location / update_location — SECURITY DEFINER in private,
--    public invoker wrappers (same pattern as Phase 3 has_* RPCs)
-- ---------------------------------------------------------------------------
create or replace function private.can_manage_locations(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    private.has_company_permission('locations:manage', p_company_id)
    or private.has_company_permission('settings:manage', p_company_id);
$$;

revoke all on function private.can_manage_locations(uuid) from public;
revoke all on function private.can_manage_locations(uuid) from anon;
grant execute on function private.can_manage_locations(uuid) to authenticated, service_role;

create or replace function private.create_location(
  p_company_id uuid,
  p_name text,
  p_street text default null,
  p_city text default null,
  p_postal_code text default null,
  p_state text default null,
  p_country text default null,
  p_email text default null,
  p_image_url text default null,
  p_timezone text default null,
  p_slug text default null,
  p_is_active boolean default true,
  p_is_listed boolean default false,
  p_lat double precision default null,
  p_lon double precision default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_primary public.location%rowtype;
  v_row public.location%rowtype;
  v_geo public.geography;
  v_slug text;
  v_tz text;
begin
  if p_company_id is null or coalesce(btrim(p_name), '') = '' then
    return jsonb_build_object('error', 'INVALID_INPUT');
  end if;

  if not private.can_manage_locations(p_company_id) then
    return jsonb_build_object('error', 'UNAUTHORIZED');
  end if;

  if not exists (
    select 1
    from public.company c
    where c.id = p_company_id
      and c.multi_location_enabled
  ) then
    return jsonb_build_object('error', 'MULTI_LOCATION_DISABLED');
  end if;

  select *
    into v_primary
  from public.location
  where company_id = p_company_id
    and is_primary
  limit 1;

  if v_primary.id is null then
    return jsonb_build_object('error', 'PRIMARY_REQUIRED');
  end if;

  -- Copy sensible defaults from primary (address / contact / timezone / geo).
  -- Do NOT copy slug (unique per company) or catalog (location_service /
  -- staff_service). Admin import of the menu is a conscious share.
  -- is_primary always false. is_listed false unless the caller passes true.
  v_slug := nullif(btrim(coalesce(p_slug, '')), '');
  v_tz := coalesce(
    nullif(btrim(coalesce(p_timezone, '')), ''),
    v_primary.timezone,
    'Europe/Brussels'
  );

  if p_lat is not null and p_lon is not null then
    v_geo := st_setsrid(st_makepoint(p_lon, p_lat), 4326)::public.geography;
  else
    v_geo := v_primary.geo_location;
  end if;

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
    is_active,
    updated_at
  ) values (
    p_company_id,
    btrim(p_name),
    v_slug,
    coalesce(p_country, v_primary.country),
    coalesce(p_state, v_primary.state),
    coalesce(p_city, v_primary.city),
    coalesce(p_postal_code, v_primary.postal_code),
    coalesce(p_street, v_primary.street),
    v_geo,
    coalesce(p_email, v_primary.email),
    coalesce(p_image_url, v_primary.image_url),
    v_tz,
    false,
    coalesce(p_is_listed, false),
    coalesce(p_is_active, true),
    now()
  )
  returning * into v_row;

  return jsonb_build_object(
    'success', true,
    'id', v_row.id,
    'location', jsonb_build_object(
      'id', v_row.id,
      'company_id', v_row.company_id,
      'name', v_row.name,
      'slug', v_row.slug,
      'country', v_row.country,
      'state', v_row.state,
      'city', v_row.city,
      'postal_code', v_row.postal_code,
      'street', v_row.street,
      'email', v_row.email,
      'image_url', v_row.image_url,
      'timezone', v_row.timezone,
      'is_primary', v_row.is_primary,
      'is_listed', v_row.is_listed,
      'is_active', v_row.is_active,
      'lat', case
        when v_row.geo_location is null then null
        else st_y(v_row.geo_location::geometry)
      end,
      'lon', case
        when v_row.geo_location is null then null
        else st_x(v_row.geo_location::geometry)
      end
    )
  );
exception
  when unique_violation then
    return jsonb_build_object('error', 'CONFLICT');
end;
$$;

create or replace function private.update_location(
  p_location_id uuid,
  p_name text default null,
  p_street text default null,
  p_city text default null,
  p_postal_code text default null,
  p_state text default null,
  p_country text default null,
  p_email text default null,
  p_image_url text default null,
  p_timezone text default null,
  p_slug text default null,
  p_is_active boolean default null,
  p_is_listed boolean default null,
  p_lat double precision default null,
  p_lon double precision default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.location%rowtype;
  v_geo public.geography;
begin
  if p_location_id is null then
    return jsonb_build_object('error', 'INVALID_INPUT');
  end if;

  select *
    into v_row
  from public.location
  where id = p_location_id;

  if v_row.id is null then
    return jsonb_build_object('error', 'NOT_FOUND');
  end if;

  if not private.can_manage_locations(v_row.company_id) then
    return jsonb_build_object('error', 'UNAUTHORIZED');
  end if;

  -- Null means leave unchanged. is_listed stays as-is unless explicit.
  -- is_primary is not a parameter — unique index + trigger keep exactly one.
  -- Close / deactivate: p_is_active = false (do not hard-delete).
  if p_lat is not null and p_lon is not null then
    v_geo := st_setsrid(st_makepoint(p_lon, p_lat), 4326)::public.geography;
  else
    v_geo := v_row.geo_location;
  end if;

  update public.location
  set
    name = coalesce(nullif(btrim(coalesce(p_name, '')), ''), name),
    street = case when p_street is null then street else nullif(btrim(p_street), '') end,
    city = case when p_city is null then city else nullif(btrim(p_city), '') end,
    postal_code = case when p_postal_code is null then postal_code else nullif(btrim(p_postal_code), '') end,
    state = case when p_state is null then state else nullif(btrim(p_state), '') end,
    country = case when p_country is null then country else nullif(btrim(p_country), '') end,
    email = case when p_email is null then email else nullif(btrim(p_email), '') end,
    image_url = case when p_image_url is null then image_url else nullif(btrim(p_image_url), '') end,
    timezone = case
      when p_timezone is null then timezone
      else coalesce(nullif(btrim(p_timezone), ''), 'Europe/Brussels')
    end,
    slug = case when p_slug is null then slug else nullif(btrim(p_slug), '') end,
    is_active = coalesce(p_is_active, is_active),
    is_listed = coalesce(p_is_listed, is_listed),
    geo_location = v_geo,
    updated_at = now()
  where id = p_location_id
  returning * into v_row;

  return jsonb_build_object(
    'success', true,
    'id', v_row.id,
    'location', jsonb_build_object(
      'id', v_row.id,
      'company_id', v_row.company_id,
      'name', v_row.name,
      'slug', v_row.slug,
      'country', v_row.country,
      'state', v_row.state,
      'city', v_row.city,
      'postal_code', v_row.postal_code,
      'street', v_row.street,
      'email', v_row.email,
      'image_url', v_row.image_url,
      'timezone', v_row.timezone,
      'is_primary', v_row.is_primary,
      'is_listed', v_row.is_listed,
      'is_active', v_row.is_active,
      'lat', case
        when v_row.geo_location is null then null
        else st_y(v_row.geo_location::geometry)
      end,
      'lon', case
        when v_row.geo_location is null then null
        else st_x(v_row.geo_location::geometry)
      end
    )
  );
exception
  when unique_violation then
    return jsonb_build_object('error', 'CONFLICT');
end;
$$;

revoke all on function private.create_location(uuid, text, text, text, text, text, text, text, text, text, text, boolean, boolean, double precision, double precision) from public;
revoke all on function private.create_location(uuid, text, text, text, text, text, text, text, text, text, text, boolean, boolean, double precision, double precision) from anon;
revoke all on function private.update_location(uuid, text, text, text, text, text, text, text, text, text, text, boolean, boolean, double precision, double precision) from public;
revoke all on function private.update_location(uuid, text, text, text, text, text, text, text, text, text, text, boolean, boolean, double precision, double precision) from anon;

grant execute on function private.create_location(uuid, text, text, text, text, text, text, text, text, text, text, boolean, boolean, double precision, double precision) to authenticated, service_role;
grant execute on function private.update_location(uuid, text, text, text, text, text, text, text, text, text, text, boolean, boolean, double precision, double precision) to authenticated, service_role;

create or replace function public.create_location(
  p_company_id uuid,
  p_name text,
  p_street text default null,
  p_city text default null,
  p_postal_code text default null,
  p_state text default null,
  p_country text default null,
  p_email text default null,
  p_image_url text default null,
  p_timezone text default null,
  p_slug text default null,
  p_is_active boolean default true,
  p_is_listed boolean default false,
  p_lat double precision default null,
  p_lon double precision default null
)
returns jsonb
language sql
security invoker
set search_path = public
as $$
  select private.create_location(
    p_company_id,
    p_name,
    p_street,
    p_city,
    p_postal_code,
    p_state,
    p_country,
    p_email,
    p_image_url,
    p_timezone,
    p_slug,
    p_is_active,
    p_is_listed,
    p_lat,
    p_lon
  );
$$;

create or replace function public.update_location(
  p_location_id uuid,
  p_name text default null,
  p_street text default null,
  p_city text default null,
  p_postal_code text default null,
  p_state text default null,
  p_country text default null,
  p_email text default null,
  p_image_url text default null,
  p_timezone text default null,
  p_slug text default null,
  p_is_active boolean default null,
  p_is_listed boolean default null,
  p_lat double precision default null,
  p_lon double precision default null
)
returns jsonb
language sql
security invoker
set search_path = public
as $$
  select private.update_location(
    p_location_id,
    p_name,
    p_street,
    p_city,
    p_postal_code,
    p_state,
    p_country,
    p_email,
    p_image_url,
    p_timezone,
    p_slug,
    p_is_active,
    p_is_listed,
    p_lat,
    p_lon
  );
$$;

comment on function public.create_location(uuid, text, text, text, text, text, text, text, text, text, text, boolean, boolean, double precision, double precision) is
  'Owner/admin: create a non-primary location on a flagged company. Copies address/timezone/geo from the primary unless overridden. is_listed false unless p_is_listed is true. Does not copy location_service / staff_service.';

comment on function public.update_location(uuid, text, text, text, text, text, text, text, text, text, text, boolean, boolean, double precision, double precision) is
  'Owner/admin: update location fields. Null = leave unchanged. Close with p_is_active=false (no hard-delete). is_listed only changes when p_is_listed is passed. is_primary is not writable here.';

revoke all on function public.create_location(uuid, text, text, text, text, text, text, text, text, text, text, boolean, boolean, double precision, double precision) from public;
revoke all on function public.create_location(uuid, text, text, text, text, text, text, text, text, text, text, boolean, boolean, double precision, double precision) from anon;
revoke all on function public.update_location(uuid, text, text, text, text, text, text, text, text, text, text, boolean, boolean, double precision, double precision) from public;
revoke all on function public.update_location(uuid, text, text, text, text, text, text, text, text, text, text, boolean, boolean, double precision, double precision) from anon;

grant execute on function public.create_location(uuid, text, text, text, text, text, text, text, text, text, text, boolean, boolean, double precision, double precision) to authenticated, service_role;
grant execute on function public.update_location(uuid, text, text, text, text, text, text, text, text, text, text, boolean, boolean, double precision, double precision) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7) create_appointment_staff — optional p_location_id (default null)
-- ---------------------------------------------------------------------------
-- DROP the 17-arg form and recreate with an 18th defaulted arg so named
-- PostgREST calls that omit p_location_id keep working while flag is false.
-- When the flag is on, pass p_location_id or the dual-write trigger raises.
drop function if exists public.create_appointment_staff(uuid, uuid, uuid, numeric, text, integer, timestamp with time zone, timestamp with time zone, timestamp with time zone, timestamp with time zone, text, jsonb, text, text, text, text, text);

create or replace function public.create_appointment_staff(
  p_company_id uuid,
  p_staff_id uuid,
  p_client_id uuid,
  p_price numeric,
  p_notes text,
  p_duration_in_minutes integer,
  p_start timestamp with time zone,
  p_end timestamp with time zone,
  p_actual_start timestamp with time zone,
  p_actual_end timestamp with time zone,
  p_image_path text,
  p_segments jsonb,
  p_staff_notes text default null,
  p_email text default null,
  p_first_name text default null,
  p_last_name text default null,
  p_phone text default null,
  p_location_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_appointment_id uuid;
  v_client_id uuid;
  v_header_staff_id uuid;
  v_cursor timestamptz;
  v_end timestamptz;
  v_segment jsonb;
  v_sequence integer := 0;
  v_service_id uuid;
  v_variant_id uuid;
  v_segment_staff_id uuid;
  v_segment_id uuid;
  v_seg_start timestamptz;
  v_variant record;
  v_phase record;
  v_phase_start timestamptz;
  v_phase_end timestamptz;
  v_has_phases boolean;
  v_price numeric;
  v_price_net numeric;
  v_seg_client_end timestamptz;
  v_client_end timestamptz;
  v_client_minutes integer := 0;
  v_brussels constant text := 'Europe/Brussels';
begin
  -- Authenticated/anon (PostgREST) must have a membership on p_company_id.
  -- service_role / edge supabaseAdmin / direct SQL skip this.
  if auth.role() in ('authenticated', 'anon') then
    if p_company_id is null
       or not (
         p_company_id in (select private.company_ids_for_user())
       )
    then
      return jsonb_build_object('error', 'UNAUTHORIZED');
    end if;
  end if;

  if p_location_id is not null
     and not exists (
       select 1
       from public.location loc
       where loc.id = p_location_id
         and loc.company_id = p_company_id
     )
  then
    return jsonb_build_object('error', 'INVALID_LOCATION');
  end if;

  if p_segments is null or jsonb_typeof(p_segments) <> 'array' or jsonb_array_length(p_segments) = 0 then
    return jsonb_build_object('error', 'NO_SEGMENTS');
  end if;

  if p_email is not null and btrim(p_email) <> '' then
    select c.id
      into v_client_id
    from public.client c
    where c.email = p_email;

    if v_client_id is null then
      begin
        insert into public.client (email, first_name, last_name, phone, updated_at)
        values (p_email, p_first_name, p_last_name, coalesce(p_phone, ''), now())
        returning id into v_client_id;
      exception
        when unique_violation then
          select c.id
            into v_client_id
          from public.client c
          where c.email = p_email;
      end;
    end if;

    if v_client_id is null then
      return jsonb_build_object('error', 'CLIENT_RESOLVE_FAILED');
    end if;

    update public.client
    set
      first_name = coalesce(nullif(first_name, ''), nullif(p_first_name, '')),
      last_name  = coalesce(nullif(last_name, ''), nullif(p_last_name, '')),
      phone      = coalesce(nullif(phone, ''), nullif(p_phone, '')),
      updated_at = now()
    where id = v_client_id;

  elsif p_client_id is not null then
    v_client_id := p_client_id;

    if coalesce(nullif(p_first_name, ''), nullif(p_last_name, ''), nullif(p_phone, '')) is not null then
      update public.client
      set
        first_name = coalesce(nullif(first_name, ''), nullif(p_first_name, '')),
        last_name  = coalesce(nullif(last_name, ''), nullif(p_last_name, '')),
        phone      = coalesce(nullif(phone, ''), nullif(p_phone, '')),
        updated_at = now()
      where id = v_client_id;
    end if;

  else
    insert into public.client (email, first_name, last_name, phone, updated_at)
    values (
      null,
      coalesce(nullif(p_first_name, ''), 'Walk-in'),
      coalesce(nullif(p_last_name, ''), 'Client'),
      coalesce(p_phone, ''),
      now()
    )
    returning id into v_client_id;
  end if;

  insert into public.client_company (client_id, company_id)
  values (v_client_id, p_company_id)
  on conflict (client_id, company_id) do nothing;

  v_segment := p_segments -> 0;
  v_header_staff_id := coalesce(
    nullif(v_segment->>'staff_id', '')::uuid,
    p_staff_id
  );
  v_cursor := p_start;
  v_client_end := p_start;

  insert into public.appointment (
    company_id, staff_id, client_id,
    price, notes, staff_notes,
    "start", "end", image_path,
    allow_overlap,
    location_id
  ) values (
    p_company_id,
    v_header_staff_id,
    v_client_id,
    p_price,
    p_notes,
    p_staff_notes,
    p_start at time zone v_brussels,
    p_end at time zone v_brussels,
    p_image_path,
    true,
    p_location_id
  )
  returning id into v_appointment_id;

  insert into public.client_location (client_id, location_id)
  select v_client_id, a.location_id
  from public.appointment a
  where a.id = v_appointment_id
  on conflict (client_id, location_id) do nothing;

  for v_segment in select value from jsonb_array_elements(p_segments)
  loop
    v_variant_id := nullif(v_segment->>'service_variant_id', '')::uuid;
    v_service_id := nullif(v_segment->>'service_id', '')::uuid;
    v_segment_staff_id := coalesce(
      nullif(v_segment->>'staff_id', '')::uuid,
      p_staff_id
    );

    if v_variant_id is null or v_segment_staff_id is null then
      delete from public.appointment where id = v_appointment_id;
      return jsonb_build_object('error', 'INVALID_SEGMENT');
    end if;

    select sv.id, sv.service_id, sv.price, sv.price_net, sv.client_duration_minutes
      into v_variant
    from public.service_variant sv
    where sv.id = v_variant_id
      and sv.company_id = p_company_id
      and coalesce(sv.is_deleted, false) = false;

    if v_variant.id is null then
      delete from public.appointment where id = v_appointment_id;
      return jsonb_build_object('error', 'INVALID_SERVICE_VARIANT');
    end if;

    v_service_id := coalesce(v_service_id, v_variant.service_id);
    v_price := v_variant.price;
    v_price_net := v_variant.price_net;
    v_seg_start := v_cursor;
    v_seg_client_end := v_cursor;

    select exists (
      select 1 from public.service_variant_phase p
      where p.service_variant_id = v_variant_id
    ) into v_has_phases;

    insert into public.appointment_segment (
      company_id, appointment_id, service_id, service_variant_id, staff_id,
      sequence, starts_at, ends_at, price, price_net, allow_overlap,
      location_id
    ) values (
      p_company_id, v_appointment_id, v_service_id, v_variant_id, v_segment_staff_id,
      v_sequence, v_seg_start, v_seg_start + interval '1 minute', v_price, v_price_net, true,
      p_location_id
    )
    returning id into v_segment_id;

    if v_has_phases then
      for v_phase in
        select sequence, phase_type, duration_minutes
        from public.service_variant_phase
        where service_variant_id = v_variant_id
        order by sequence
      loop
        v_phase_start := v_cursor;
        v_phase_end := v_cursor + make_interval(mins => v_phase.duration_minutes::integer);

        insert into public.appointment_segment_phase (
          company_id, appointment_segment_id, staff_id,
          sequence, phase_type, starts_at, ends_at, allow_overlap,
          location_id
        ) values (
          p_company_id, v_segment_id, v_segment_staff_id,
          v_phase.sequence, v_phase.phase_type, v_phase_start, v_phase_end, true,
          p_location_id
        );

        if v_phase.phase_type in ('busy', 'free') then
          v_seg_client_end := v_phase_end;
          v_client_end := v_phase_end;
          v_client_minutes := v_client_minutes + v_phase.duration_minutes::integer;
        end if;

        v_cursor := v_phase_end;
      end loop;
    else
      v_phase_start := v_cursor;
      v_phase_end := v_cursor + make_interval(mins => coalesce(v_variant.client_duration_minutes, 0)::integer);
      if v_phase_end <= v_phase_start then
        delete from public.appointment where id = v_appointment_id;
        return jsonb_build_object('error', 'INVALID_SERVICE_VARIANT');
      end if;
      insert into public.appointment_segment_phase (
        company_id, appointment_segment_id, staff_id,
        sequence, phase_type, starts_at, ends_at, allow_overlap,
        location_id
      ) values (
        p_company_id, v_segment_id, v_segment_staff_id,
        0, 'busy', v_phase_start, v_phase_end, true,
        p_location_id
      );
      v_seg_client_end := v_phase_end;
      v_client_end := v_phase_end;
      v_client_minutes := v_client_minutes + coalesce(v_variant.client_duration_minutes, 0)::integer;
      v_cursor := v_phase_end;
    end if;

    update public.appointment_segment
    set ends_at = v_seg_client_end
    where id = v_segment_id;

    v_sequence := v_sequence + 1;
  end loop;

  v_end := v_client_end;

  update public.appointment
  set
    "end" = v_end at time zone v_brussels
  where id = v_appointment_id;

  return jsonb_build_object(
    'success', true,
    'id', v_appointment_id,
    'client_id', v_client_id
  );

exception
  when exclusion_violation then
    return jsonb_build_object('error', 'CONFLICT_DETECTED');
  when unique_violation then
    return jsonb_build_object('error', 'CONFLICT_DETECTED');
  when serialization_failure then
    return jsonb_build_object('error', 'CONCURRENCY_RETRY');
  when others then
    return jsonb_build_object('error', SQLERRM);
end;
$function$;

grant execute on function public.create_appointment_staff(uuid, uuid, uuid, numeric, text, integer, timestamp with time zone, timestamp with time zone, timestamp with time zone, timestamp with time zone, text, jsonb, text, text, text, text, text, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 8) Apply-time verify (fails the migration if Phase 4 objects are missing)
-- ---------------------------------------------------------------------------
do $$
declare
  flag_default text;
  flag_nullable text;
  enabled_n int;
begin
  if to_regprocedure('private.has_permission(text,uuid)') is null
     or to_regprocedure('private.has_company_permission(text,uuid)') is null
     or to_regprocedure('private.location_ids_for_user()') is null
     or to_regprocedure('public.my_location_ids()') is null
     or to_regprocedure('public.my_memberships()') is null
  then
    raise exception 'Phase 2/3 helpers missing — apply those first';
  end if;

  select column_default, is_nullable
    into flag_default, flag_nullable
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'company'
    and column_name = 'multi_location_enabled';

  if flag_default is null or flag_nullable is distinct from 'NO' then
    raise exception 'company.multi_location_enabled missing, nullable, or has no default';
  end if;

  if flag_default not like '%false%' then
    raise exception 'company.multi_location_enabled default must be false, got %', flag_default;
  end if;

  select count(*) into enabled_n
  from public.company
  where multi_location_enabled;
  if enabled_n <> 0 then
    raise exception 'Phase 4 apply must leave every company flagged false, found %', enabled_n;
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'location_one_primary_per_company'
  ) then
    raise exception 'location_one_primary_per_company unique index missing';
  end if;

  if exists (
    select 1
    from public.company c
    where (
      select count(*) from public.location l
      where l.company_id = c.id and l.is_primary
    ) <> 1
  ) then
    raise exception 'each company must still have exactly one primary location';
  end if;

  if to_regprocedure('public.my_locations()') is null
     or to_regprocedure('public.create_location(uuid,text,text,text,text,text,text,text,text,text,text,boolean,boolean,double precision,double precision)') is null
     or to_regprocedure('public.update_location(uuid,text,text,text,text,text,text,text,text,text,text,boolean,boolean,double precision,double precision)') is null
     or to_regprocedure('public.create_appointment_staff(uuid,uuid,uuid,numeric,text,integer,timestamptz,timestamptz,timestamptz,timestamptz,text,jsonb,text,text,text,text,text,uuid)') is null
  then
    raise exception 'Phase 4 public RPCs missing';
  end if;

  if to_regprocedure('public.create_appointment_staff(uuid,uuid,uuid,numeric,text,integer,timestamptz,timestamptz,timestamptz,timestamptz,text,jsonb,text,text,text,text,text)') is not null then
    raise exception 'old 17-arg create_appointment_staff overload must be dropped';
  end if;

  if pg_get_functiondef('private.sync_company_id_from_location()'::regprocedure)
     not like '%multi_location_enabled%'
  then
    raise exception 'sync_company_id_from_location does not consult multi_location_enabled';
  end if;

  if not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'location'
          and policyname = 'location insert (permission)' and cmd = 'INSERT'
          and with_check like '%locations:manage%'
          and with_check like '%settings:manage%'
      )
     or not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'location'
          and policyname = 'location update (permission)' and cmd = 'UPDATE'
          and qual like '%locations:manage%'
          and qual like '%settings:manage%'
      )
     or not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'location'
          and policyname = 'location select (membership)' and cmd = 'SELECT'
      )
  then
    raise exception 'location RLS policies missing Phase 4 write keys or SELECT membership';
  end if;

  if has_function_privilege('anon', 'public.create_location(uuid,text,text,text,text,text,text,text,text,text,text,boolean,boolean,double precision,double precision)', 'execute')
     or has_function_privilege('anon', 'public.update_location(uuid,text,text,text,text,text,text,text,text,text,text,boolean,boolean,double precision,double precision)', 'execute')
     or has_function_privilege('anon', 'public.my_locations()', 'execute')
  then
    raise exception 'anon must not execute Phase 4 location RPCs';
  end if;

  if not has_function_privilege('authenticated', 'public.create_location(uuid,text,text,text,text,text,text,text,text,text,text,boolean,boolean,double precision,double precision)', 'execute')
     or not has_function_privilege('authenticated', 'public.update_location(uuid,text,text,text,text,text,text,text,text,text,text,boolean,boolean,double precision,double precision)', 'execute')
     or not has_function_privilege('authenticated', 'public.my_locations()', 'execute')
  then
    raise exception 'authenticated must execute Phase 4 location RPCs';
  end if;
end;
$$;

-- Rollback (do not run in this file):
--   drop function public.create_location(...);
--   drop function public.update_location(...);
--   drop function public.my_locations();
--   drop function private.create_location(...);
--   drop function private.update_location(...);
--   drop function private.can_manage_locations(uuid);
--   drop trigger enforce_location_product_rules on public.location;
--   drop function private.enforce_location_product_rules();
--   drop trigger guard_multi_location_enabled on public.company;
--   drop function private.guard_multi_location_enabled();
--   alter table public.company drop column multi_location_enabled;
--   Restore Phase 2 location write policies and Phase 3 create_appointment_staff
--   (17-arg, no p_location_id) and Phase 1 sync_company_id_from_location.
