-- Public booking multi-location — anon location SELECT + optional p_location_id
-- on existing create RPCs. FILE ONLY — do not apply from CI or an agent.
-- Glenn applies after review.
--
-- Depends on Phase 1 (location + dual-write trigger), Phase 4
-- (company.multi_location_enabled + create_appointment_staff p_location_id).
--
-- Do NOT: add list_locations / any new RPC name, require is_listed (every
-- current row is unlisted), chairs/rooms, change authenticated location
-- policies, force every company to send location_id.
--
-- Live facts 2026-09-05 (SalonFlow kvhinnhnwgvdpzggdnxs):
--   * location SELECT is authenticated membership only — no anon policy
--   * grant all on location to anon (table-level); RLS hides every row
--   * create_appointment / create_appointment_with_referral have no
--     p_location_id; trigger fills primary when flag is false and raises
--     when flag is true and location_id is null
--   * Glenn Salon is the only multi_location_enabled company
--   * staff who work a shop: staff_service.location_id (offer) plus
--     location_membership.staff_id (assignment; sparse — 2 live rows)

-- ---------------------------------------------------------------------------
-- 1) Anon SELECT — active locations of a company (no is_listed requirement)
-- ---------------------------------------------------------------------------
drop policy if exists "location select (anon public booking)" on public.location;

create policy "location select (anon public booking)"
  on public.location
  for select
  to anon
  using (is_active = true);

comment on policy "location select (anon public booking)" on public.location is
  'Public booking location picker. Active shops only. v1 does not require '
  'is_listed — every current row is unlisted.';

-- Safe columns only for anon. Authenticated / service_role grants unchanged.
revoke all on table public.location from anon;
grant select (
  id,
  name,
  slug,
  city,
  street,
  postal_code,
  timezone,
  is_primary,
  is_active,
  company_id
) on table public.location to anon;

-- ---------------------------------------------------------------------------
-- 2) create_appointment — optional p_location_id (default null)
-- ---------------------------------------------------------------------------
-- DROP the 12-arg form and recreate with a 13th defaulted arg so named
-- PostgREST calls that omit p_location_id keep working while the flag is
-- false. When the flag is on, pass p_location_id or the dual-write trigger
-- raises (edges return 400 before that).
drop function if exists public.create_appointment(uuid, uuid, uuid, numeric, text, integer, timestamp with time zone, timestamp with time zone, timestamp with time zone, timestamp with time zone, text, jsonb);

create or replace function public.create_appointment(
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
  p_segments jsonb default '[]'::jsonb,
  p_location_id uuid default null
)
returns jsonb
language plpgsql
as $function$
declare
  v_appointment_id uuid;
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
  v_phase_allow_overlap boolean;
  v_tz text := 'Europe/Brussels';
begin
  if p_location_id is not null
     and not exists (
       select 1
       from public.location loc
       where loc.id = p_location_id
         and loc.company_id = p_company_id
         and loc.is_active
     )
  then
    return jsonb_build_object('error', 'INVALID_LOCATION');
  end if;

  select coalesce(
    (select loc.timezone from public.location loc where loc.id = p_location_id),
    (select loc.timezone from public.location loc where loc.company_id = p_company_id and loc.is_primary),
    'Europe/Brussels'
  ) into v_tz;

  if p_segments is null or jsonb_typeof(p_segments) <> 'array' or jsonb_array_length(p_segments) = 0 then
    return jsonb_build_object('error', 'NO_SEGMENTS');
  end if;

  v_segment := p_segments -> 0;
  v_header_staff_id := coalesce(
    nullif(v_segment->>'staff_id', '')::uuid,
    p_staff_id
  );
  v_cursor := p_start;
  v_client_end := p_start;

  insert into public.appointment (
    company_id, staff_id, client_id,
    price, notes,
    "start", "end", image_path,
    allow_overlap,
    location_id
  ) values (
    p_company_id,
    v_header_staff_id,
    p_client_id,
    p_price,
    p_notes,
    p_start at time zone v_tz,
    p_end at time zone v_tz,
    p_image_path,
    true,
    p_location_id
  )
  returning id into v_appointment_id;

  insert into public.client_location (client_id, location_id)
  select p_client_id, a.location_id
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
      v_sequence, v_seg_start, v_seg_start + interval '1 minute', v_price, v_price_net, false,
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
        v_phase_allow_overlap := (v_phase.phase_type = 'free');

        if v_phase.phase_type in ('busy', 'buffer') then
          if not public.staff_is_on_schedule(p_company_id, v_segment_staff_id, v_phase_start, v_phase_end) then
            delete from public.appointment where id = v_appointment_id;
            return jsonb_build_object('error', 'NOT_AVAILABLE');
          end if;
        end if;

        insert into public.appointment_segment_phase (
          company_id, appointment_segment_id, staff_id,
          sequence, phase_type, starts_at, ends_at, allow_overlap,
          location_id
        ) values (
          p_company_id, v_segment_id, v_segment_staff_id,
          v_phase.sequence, v_phase.phase_type, v_phase_start, v_phase_end, v_phase_allow_overlap,
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
      if not public.staff_is_on_schedule(p_company_id, v_segment_staff_id, v_phase_start, v_phase_end) then
        delete from public.appointment where id = v_appointment_id;
        return jsonb_build_object('error', 'NOT_AVAILABLE');
      end if;
      insert into public.appointment_segment_phase (
        company_id, appointment_segment_id, staff_id,
        sequence, phase_type, starts_at, ends_at, allow_overlap,
        location_id
      ) values (
        p_company_id, v_segment_id, v_segment_staff_id,
        0, 'busy', v_phase_start, v_phase_end, false,
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
    "end" = v_end at time zone v_tz
  where id = v_appointment_id;

  return jsonb_build_object('success', true, 'id', v_appointment_id);

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

grant execute on function public.create_appointment(uuid, uuid, uuid, numeric, text, integer, timestamp with time zone, timestamp with time zone, timestamp with time zone, timestamp with time zone, text, jsonb, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) create_appointment_with_referral — optional p_location_id (default null)
-- ---------------------------------------------------------------------------
drop function if exists public.create_appointment_with_referral(uuid, uuid, text, text, text, text, numeric, text, integer, timestamp with time zone, timestamp with time zone, timestamp with time zone, timestamp with time zone, text, jsonb, text);

create or replace function public.create_appointment_with_referral(
  p_company_id uuid,
  p_staff_id uuid,
  p_email text,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_price numeric,
  p_notes text,
  p_duration_in_minutes integer,
  p_start timestamp with time zone,
  p_end timestamp with time zone,
  p_actual_start timestamp with time zone,
  p_actual_end timestamp with time zone,
  p_image_path text,
  p_segments jsonb,
  p_referral_code text default null,
  p_location_id uuid default null
)
returns jsonb
language plpgsql
as $function$
declare
  v_client_id uuid;
  v_client_was_created boolean := false;
  v_booking jsonb;
  v_appointment_id uuid;
  v_referral_code_id uuid;
  v_referrer_client_id uuid;
  v_existing_link boolean;
begin
  if p_referral_code is not null and btrim(p_referral_code) = '' then
    p_referral_code := null;
  end if;

  select c.id into v_client_id from public.client c where c.email = p_email;

  if v_client_id is null then
    insert into public.client (email, first_name, last_name, phone, updated_at)
    values (p_email, p_first_name, p_last_name, coalesce(p_phone, ''), now())
    returning id into v_client_id;
    v_client_was_created := true;
  else
    update public.client
    set
      first_name = coalesce(nullif(p_first_name, ''), first_name),
      last_name  = coalesce(nullif(p_last_name, ''), last_name),
      phone      = coalesce(nullif(p_phone, ''), phone),
      updated_at = now()
    where id = v_client_id;
  end if;

  select exists (
    select 1 from public.client_company cc
    where cc.company_id = p_company_id and cc.client_id = v_client_id
  ) into v_existing_link;

  if p_referral_code is not null then
    select rc.id, rc.referrer_client_id
      into v_referral_code_id, v_referrer_client_id
    from public.referral_code rc
    where rc.company_id = p_company_id and rc.code = p_referral_code;

    if v_referral_code_id is null then
      if v_client_was_created then delete from public.client where id = v_client_id; end if;
      return jsonb_build_object('error', 'REFERRAL_INVALID');
    end if;

    if exists (select 1 from public.referral_code rc where rc.id = v_referral_code_id and rc.is_active = false) then
      if v_client_was_created then delete from public.client where id = v_client_id; end if;
      return jsonb_build_object('error', 'REFERRAL_INACTIVE');
    end if;

    if exists (select 1 from public.referral_code rc where rc.id = v_referral_code_id and rc.expires_at is not null and rc.expires_at <= now()) then
      if v_client_was_created then delete from public.client where id = v_client_id; end if;
      return jsonb_build_object('error', 'REFERRAL_EXPIRED');
    end if;

    if v_existing_link then
      if v_client_was_created then delete from public.client where id = v_client_id; end if;
      return jsonb_build_object('error', 'REFERRAL_NOT_NEW_CLIENT');
    end if;
  end if;

  v_booking := public.create_appointment(
    p_company_id := p_company_id,
    p_staff_id := p_staff_id,
    p_client_id := v_client_id,
    p_price := p_price,
    p_notes := p_notes,
    p_duration_in_minutes := p_duration_in_minutes,
    p_start := p_start,
    p_end := p_end,
    p_actual_start := p_actual_start,
    p_actual_end := p_actual_end,
    p_image_path := p_image_path,
    p_segments := p_segments,
    p_location_id := p_location_id
  );

  if (v_booking ? 'error') then
    if v_client_was_created then delete from public.client where id = v_client_id; end if;
    return v_booking;
  end if;

  v_appointment_id := (v_booking->>'id')::uuid;

  if v_appointment_id is null then
    if v_client_was_created then delete from public.client where id = v_client_id; end if;
    return jsonb_build_object('error', 'BOOKING_FAILED');
  end if;

  if p_referral_code is not null then
    begin
      insert into public.referral_redemption (
        company_id, referral_code_id, referrer_client_id, referred_client_id, appointment_id
      ) values (
        p_company_id, v_referral_code_id, v_referrer_client_id, v_client_id, v_appointment_id
      );
    exception
      when unique_violation then
        if v_client_was_created then delete from public.client where id = v_client_id; end if;
        return jsonb_build_object('error', 'REFERRAL_REDEMPTION_CONFLICT');
    end;
  end if;

  if not v_existing_link then
    insert into public.client_company (client_id, company_id)
    values (v_client_id, p_company_id)
    on conflict (client_id, company_id) do nothing;
  end if;

  return jsonb_build_object('success', true, 'id', v_appointment_id, 'client_id', v_client_id);

exception
  when serialization_failure then
    return jsonb_build_object('error', 'CONCURRENCY_RETRY');
  when others then
    return jsonb_build_object('error', SQLERRM);
end;
$function$;

grant execute on function public.create_appointment_with_referral(uuid, uuid, text, text, text, text, numeric, text, integer, timestamp with time zone, timestamp with time zone, timestamp with time zone, timestamp with time zone, text, jsonb, text, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4) Apply-time verify
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'location'
      and policyname = 'location select (anon public booking)'
      and cmd = 'SELECT'
      and 'anon' = any (roles)
  ) then
    raise exception 'anon location SELECT policy missing';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'location'
      and policyname = 'location select (membership)'
      and cmd = 'SELECT'
      and 'authenticated' = any (roles)
  ) then
    raise exception 'authenticated location SELECT policy must stay';
  end if;

  if to_regprocedure('public.create_appointment(uuid,uuid,uuid,numeric,text,integer,timestamptz,timestamptz,timestamptz,timestamptz,text,jsonb,uuid)') is null
     or to_regprocedure('public.create_appointment_with_referral(uuid,uuid,text,text,text,text,numeric,text,integer,timestamptz,timestamptz,timestamptz,timestamptz,text,jsonb,text,uuid)') is null
  then
    raise exception 'create RPCs missing optional p_location_id';
  end if;

  if to_regprocedure('public.create_appointment(uuid,uuid,uuid,numeric,text,integer,timestamptz,timestamptz,timestamptz,timestamptz,text,jsonb)') is not null then
    raise exception 'old 12-arg create_appointment overload must be dropped';
  end if;

  if to_regprocedure('public.create_appointment_with_referral(uuid,uuid,text,text,text,text,numeric,text,integer,timestamptz,timestamptz,timestamptz,timestamptz,text,jsonb,text)') is not null then
    raise exception 'old 16-arg create_appointment_with_referral overload must be dropped';
  end if;

  if to_regprocedure('public.list_locations()') is not null
     or to_regprocedure('public.list_locations(uuid)') is not null
  then
    raise exception 'do not add a list_locations RPC';
  end if;

  if not has_column_privilege('anon', 'public.location', 'id', 'SELECT')
     or not has_column_privilege('anon', 'public.location', 'name', 'SELECT')
     or not has_column_privilege('anon', 'public.location', 'company_id', 'SELECT')
     or has_column_privilege('anon', 'public.location', 'email', 'SELECT')
     or has_column_privilege('anon', 'public.location', 'geo_location', 'SELECT')
  then
    raise exception 'anon must SELECT only safe location columns';
  end if;

  if not has_column_privilege('authenticated', 'public.location', 'email', 'SELECT') then
    raise exception 'authenticated location column grants must stay';
  end if;
end;
$$;
