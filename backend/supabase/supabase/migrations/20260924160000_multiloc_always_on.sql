-- Multi-location is always on. company.multi_location_enabled was dropped
-- in the Phase 5 cutover; these functions still selected it and raised 42703.
--
-- Does not add a public RPC. Replaces existing private helpers so:
--   * omitted location_id still resolves to the company's primary location
--   * extra locations are allowed without a company flag
--   * the dropped column is not read or written
--
-- Idempotent if the column and guard trigger are already gone.

drop trigger if exists guard_multi_location_enabled on public.company;
drop function if exists private.guard_multi_location_enabled();

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

create or replace function private.enforce_location_product_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  if tg_op = 'INSERT' then
    v_company_id := new.company_id;

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

comment on function private.enforce_location_product_rules() is
  'Multi-location is always on: extra locations do not consult a company flag. '
  'Exactly one is_primary (with unique index location_one_primary_per_company). '
  'Hard-delete blocked for primary and for any location with appointments; '
  'close via is_active=false.';

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

  select *
    into v_primary
  from public.location
  where company_id = p_company_id
    and is_primary
  limit 1;

  if v_primary.id is null then
    return jsonb_build_object('error', 'PRIMARY_REQUIRED');
  end if;

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

comment on function public.create_location(uuid, text, text, text, text, text, text, text, text, text, text, boolean, boolean, double precision, double precision) is
  'Owner/admin: create a non-primary location. Multi-location is always on. Copies address/timezone/geo from the primary unless overridden. is_listed false unless p_is_listed is true. Does not copy location_service / staff_service.';

alter table public.company drop column if exists multi_location_enabled;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'company'
      and column_name = 'multi_location_enabled'
  ) then
    raise exception 'company.multi_location_enabled still exists';
  end if;

  if pg_get_functiondef('private.sync_company_id_from_location()'::regprocedure)
     ilike '%multi_location_enabled%'
  then
    raise exception 'sync_company_id_from_location still references multi_location_enabled';
  end if;

  if pg_get_functiondef('private.enforce_location_product_rules()'::regprocedure)
     ilike '%multi_location_enabled%'
  then
    raise exception 'enforce_location_product_rules still references multi_location_enabled';
  end if;

  if pg_get_functiondef(
    'private.create_location(uuid,text,text,text,text,text,text,text,text,text,text,boolean,boolean,double precision,double precision)'::regprocedure
  ) ilike '%multi_location_enabled%'
  then
    raise exception 'create_location still references multi_location_enabled';
  end if;
end;
$$;
