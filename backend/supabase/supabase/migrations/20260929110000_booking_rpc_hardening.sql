-- H2: booking trust-boundary hardening for create_appointment /
-- create_appointment_staff / create_appointment_with_referral.
--
-- Before: the RPCs trusted p_price for the appointment header (deposit
-- amounts are derived from it), accepted any caller-supplied service_id next
-- to the variant, never checked variant/service is_active, never checked
-- staff→company, staff→service, or service→location, and leaked SQLERRM.
--
-- After: the header price is the sum of the booked variants' catalog prices
-- (p_price remains in the signature for caller compatibility but is ignored),
-- the variant is the source of truth for service_id, the booking graph is
-- validated, and unexpected errors return a generic 'INTERNAL' key.
--
-- The staff_service / location_service link tables are backfilled from
-- historical bookings first so the new checks don't reject pairs that were
-- already booked operationally.

-- ---------------------------------------------------------------------------
-- 1. Backfill qualification links from booking history
-- ---------------------------------------------------------------------------

-- staff_service.location_id is NOT NULL: links are per-location. Backfill the
-- effective location of each historical booking (segment, else appointment,
-- else the company's primary location).
insert into public.staff_service (company_id, staff_id, service_id, location_id)
select company_id, staff_id, service_id, effective_location_id
from (
  select distinct
    a.company_id,
    seg.staff_id,
    seg.service_id,
    coalesce(
      seg.location_id,
      a.location_id,
      (select l.id from public.location l where l.company_id = a.company_id and l.is_primary limit 1)
    ) as effective_location_id
  from public.appointment_segment seg
  join public.appointment a on a.id = seg.appointment_id
  where seg.staff_id is not null
    and seg.service_id is not null
) pairs
where effective_location_id is not null
  and not exists (
    select 1
    from public.staff_service ss
    where ss.staff_id = pairs.staff_id
      and ss.service_id = pairs.service_id
      and ss.location_id = pairs.effective_location_id
  );

insert into public.location_service (location_id, service_id)
select distinct seg.location_id, seg.service_id
from public.appointment_segment seg
where seg.location_id is not null
  and seg.service_id is not null
  and not exists (
    select 1
    from public.location_service ls
    where ls.location_id = seg.location_id
      and ls.service_id = seg.service_id
  );

-- ---------------------------------------------------------------------------
-- 2. create_appointment (public marketplace booking)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_appointment(p_company_id uuid, p_staff_id uuid, p_client_id uuid, p_price numeric, p_notes text, p_duration_in_minutes integer, p_start timestamp with time zone, p_end timestamp with time zone, p_actual_start timestamp with time zone, p_actual_end timestamp with time zone, p_image_path text, p_segments jsonb DEFAULT '[]'::jsonb, p_location_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
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
  v_total_price numeric := 0;
  v_seg_client_end timestamptz;
  v_client_end timestamptz;
  v_client_minutes integer := 0;
  v_phase_allow_overlap boolean;
  v_tz text := 'Europe/Brussels';
  v_location_id uuid;
begin
  -- p_price is ignored: the header price is repriced server-side below.
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

  select a.location_id
    into v_location_id
  from public.appointment a
  where a.id = v_appointment_id;

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

    -- The variant must be bookable: active, not deleted, and its parent
    -- service active too. The variant is the source of truth for service_id
    -- and price; caller-supplied service_id is ignored.
    select sv.id, sv.service_id, sv.price, sv.price_net, sv.client_duration_minutes
      into v_variant
    from public.service_variant sv
    join public.service s on s.id = sv.service_id
    where sv.id = v_variant_id
      and sv.company_id = p_company_id
      and coalesce(sv.is_deleted, false) = false
      and coalesce(sv.is_active, false) = true
      and coalesce(s.is_deleted, false) = false
      and coalesce(s.is_active, false) = true;

    if v_variant.id is null then
      delete from public.appointment where id = v_appointment_id;
      return jsonb_build_object('error', 'INVALID_SERVICE_VARIANT');
    end if;

    v_service_id := v_variant.service_id;

    if not exists (
      select 1
      from public.staff st
      where st.id = v_segment_staff_id
        and st.company_id = p_company_id
    ) then
      delete from public.appointment where id = v_appointment_id;
      return jsonb_build_object('error', 'INVALID_STAFF');
    end if;

    -- Qualification is per-location (staff_service.location_id NOT NULL);
    -- when the booking has no location yet, any-location qualification counts.
    if not exists (
      select 1
      from public.staff_service ss
      where ss.staff_id = v_segment_staff_id
        and ss.service_id = v_service_id
        and ss.company_id = p_company_id
        and (p_location_id is null or ss.location_id = p_location_id)
    ) then
      delete from public.appointment where id = v_appointment_id;
      return jsonb_build_object('error', 'STAFF_NOT_QUALIFIED');
    end if;

    if p_location_id is not null and not exists (
      select 1
      from public.location_service ls
      where ls.location_id = p_location_id
        and ls.service_id = v_service_id
    ) then
      delete from public.appointment where id = v_appointment_id;
      return jsonb_build_object('error', 'SERVICE_NOT_AT_LOCATION');
    end if;

    v_price := v_variant.price;
    v_price_net := v_variant.price_net;
    v_total_price := v_total_price + coalesce(v_variant.price, 0);
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
        where p.service_variant_id = v_variant_id
        order by sequence
      loop
        v_phase_start := v_cursor;
        v_phase_end := v_cursor + make_interval(mins => v_phase.duration_minutes::integer);
        v_phase_allow_overlap := (v_phase.phase_type = 'free');

        if v_phase.phase_type in ('busy', 'buffer') then
          if not public.staff_is_on_schedule(p_company_id, v_segment_staff_id, v_phase_start, v_phase_end, v_location_id) then
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
      if not public.staff_is_on_schedule(p_company_id, v_segment_staff_id, v_phase_start, v_phase_end, v_location_id) then
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

  -- Server-side reprice: the header price is the sum of catalog prices, not
  -- the caller-supplied p_price.
  update public.appointment
  set
    "end" = v_end at time zone v_tz,
    price = v_total_price
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
    return jsonb_build_object('error', 'INTERNAL');
end;
$function$;

-- ---------------------------------------------------------------------------
-- 3. create_appointment_staff (staff booking; SECURITY DEFINER, membership
--    gate for PostgREST callers stays unchanged)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_appointment_staff(p_company_id uuid, p_staff_id uuid, p_client_id uuid, p_price numeric, p_notes text, p_duration_in_minutes integer, p_start timestamp with time zone, p_end timestamp with time zone, p_actual_start timestamp with time zone, p_actual_end timestamp with time zone, p_image_path text, p_segments jsonb, p_staff_notes text DEFAULT NULL::text, p_email text DEFAULT NULL::text, p_first_name text DEFAULT NULL::text, p_last_name text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_location_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
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
  v_total_price numeric := 0;
  v_seg_client_end timestamptz;
  v_client_end timestamptz;
  v_client_minutes integer := 0;
  v_tz text := 'Europe/Brussels';
  v_start_naive timestamp;
begin
  -- p_price is ignored: the header price is repriced server-side below.
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

  select coalesce(
    (select loc.timezone from public.location loc where loc.id = p_location_id),
    (select loc.timezone from public.location loc where loc.company_id = p_company_id and loc.is_primary),
    'Europe/Brussels'
  ) into v_tz;

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

  v_segment := p_segments -> 0;
  v_header_staff_id := coalesce(
    nullif(v_segment->>'staff_id', '')::uuid,
    p_staff_id
  );
  -- typed clock face of incoming ISO/fake-Z; segments use absolute occupancy
  v_start_naive := p_start at time zone 'UTC';
  v_cursor := timezone(v_tz, v_start_naive);
  v_client_end := v_cursor;

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
    p_start at time zone 'UTC',
    p_end   at time zone 'UTC',
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

    -- Same trust rules as public booking: variant must be bookable and is
    -- the source of truth for service_id and price.
    select sv.id, sv.service_id, sv.price, sv.price_net, sv.client_duration_minutes
      into v_variant
    from public.service_variant sv
    join public.service s on s.id = sv.service_id
    where sv.id = v_variant_id
      and sv.company_id = p_company_id
      and coalesce(sv.is_deleted, false) = false
      and coalesce(sv.is_active, false) = true
      and coalesce(s.is_deleted, false) = false
      and coalesce(s.is_active, false) = true;

    if v_variant.id is null then
      delete from public.appointment where id = v_appointment_id;
      return jsonb_build_object('error', 'INVALID_SERVICE_VARIANT');
    end if;

    v_service_id := v_variant.service_id;

    if not exists (
      select 1
      from public.staff st
      where st.id = v_segment_staff_id
        and st.company_id = p_company_id
    ) then
      delete from public.appointment where id = v_appointment_id;
      return jsonb_build_object('error', 'INVALID_STAFF');
    end if;

    if not exists (
      select 1
      from public.staff_service ss
      where ss.staff_id = v_segment_staff_id
        and ss.service_id = v_service_id
        and ss.company_id = p_company_id
        and (p_location_id is null or ss.location_id = p_location_id)
    ) then
      delete from public.appointment where id = v_appointment_id;
      return jsonb_build_object('error', 'STAFF_NOT_QUALIFIED');
    end if;

    if p_location_id is not null and not exists (
      select 1
      from public.location_service ls
      where ls.location_id = p_location_id
        and ls.service_id = v_service_id
    ) then
      delete from public.appointment where id = v_appointment_id;
      return jsonb_build_object('error', 'SERVICE_NOT_AT_LOCATION');
    end if;

    v_price := v_variant.price;
    v_price_net := v_variant.price_net;
    v_total_price := v_total_price + coalesce(v_variant.price, 0);
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
        where p.service_variant_id = v_variant_id
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

  -- Server-side reprice (see create_appointment).
  update public.appointment
  set
    "end" = v_end at time zone v_tz,
    price = v_total_price
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
    return jsonb_build_object('error', 'INTERNAL');
end;
$function$;

-- ---------------------------------------------------------------------------
-- 4. create_appointment_with_referral: only the error oracle changes; pricing
--    and graph validation come from the inner create_appointment call.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_appointment_with_referral(p_company_id uuid, p_staff_id uuid, p_email text, p_first_name text, p_last_name text, p_phone text, p_price numeric, p_notes text, p_duration_in_minutes integer, p_start timestamp with time zone, p_end timestamp with time zone, p_actual_start timestamp with time zone, p_actual_end timestamp with time zone, p_image_path text, p_segments jsonb, p_referral_code text DEFAULT NULL::text, p_location_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare
  v_client_id uuid;
  v_client_was_created boolean := false;
  v_booking jsonb;
  v_appointment_id uuid;
  v_referral_code_id uuid;
  v_referrer_client_id uuid;
  v_existing_link boolean;
  v_link_location_id uuid;
begin
  -- p_price is ignored downstream: create_appointment reprices server-side.
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
    select 1
    from public.client_location cl
    join public.location loc on loc.id = cl.location_id
    where cl.client_id = v_client_id
      and loc.company_id = p_company_id
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
    v_link_location_id := coalesce(
      p_location_id,
      (
        select loc.id
        from public.location loc
        where loc.company_id = p_company_id
          and loc.is_primary
      )
    );

    if v_link_location_id is not null then
      insert into public.client_location (client_id, location_id)
      values (v_client_id, v_link_location_id)
      on conflict (client_id, location_id) do nothing;
    end if;
  end if;

  return jsonb_build_object('success', true, 'id', v_appointment_id, 'client_id', v_client_id);

exception
  when serialization_failure then
    return jsonb_build_object('error', 'CONCURRENCY_RETRY');
  when others then
    return jsonb_build_object('error', 'INTERNAL');
end;
$function$;

-- ---------------------------------------------------------------------------
-- 5. Apply-time verification
-- ---------------------------------------------------------------------------

do $$
begin
  if pg_get_functiondef('public.create_appointment(uuid,uuid,uuid,numeric,text,integer,timestamptz,timestamptz,timestamptz,timestamptz,text,jsonb,uuid)'::regprocedure) like '%SQLERRM%'
     or pg_get_functiondef('public.create_appointment_staff(uuid,uuid,uuid,numeric,text,integer,timestamptz,timestamptz,timestamptz,timestamptz,text,jsonb,text,text,text,text,text,uuid)'::regprocedure) like '%SQLERRM%'
     or pg_get_functiondef('public.create_appointment_with_referral(uuid,uuid,text,text,text,text,numeric,text,integer,timestamptz,timestamptz,timestamptz,timestamptz,text,jsonb,text,uuid)'::regprocedure) like '%SQLERRM%'
  then
    raise exception 'SQLERRM oracle still present in booking RPCs';
  end if;

  if not pg_get_functiondef('public.create_appointment(uuid,uuid,uuid,numeric,text,integer,timestamptz,timestamptz,timestamptz,timestamptz,text,jsonb,uuid)'::regprocedure) like '%v_total_price%'
  then
    raise exception 'server-side repricing missing from create_appointment';
  end if;

  -- Backfill must leave no upcoming booking pair unqualified at its
  -- effective location.
  if exists (
    select 1
    from (
      select distinct
        seg.staff_id,
        seg.service_id,
        coalesce(seg.location_id, a.location_id) as effective_location_id
      from public.appointment_segment seg
      join public.appointment a on a.id = seg.appointment_id
      where a.is_canceled = false
        and a.start > (now() - interval '7 days')
    ) fs
    where fs.effective_location_id is not null
      and not exists (
        select 1
        from public.staff_service ss
        where ss.staff_id = fs.staff_id
          and ss.service_id = fs.service_id
          and ss.location_id = fs.effective_location_id
      )
  ) then
    raise exception 'staff_service coverage incomplete after backfill';
  end if;

  if exists (
    select 1
    from (
      select distinct seg.location_id, seg.service_id
      from public.appointment_segment seg
      join public.appointment a on a.id = seg.appointment_id
      where a.is_canceled = false
        and a.start > (now() - interval '7 days')
        and seg.location_id is not null
    ) fs
    where not exists (
      select 1
      from public.location_service ls
      where ls.location_id = fs.location_id
        and ls.service_id = fs.service_id
    )
  ) then
    raise exception 'location_service coverage incomplete after backfill';
  end if;
end $$;
