-- Fix a live outage introduced by 20260929110000: the phase loop in
-- create_appointment / create_appointment_staff referenced alias "p"
-- (p.service_variant_id) without declaring it, so EVERY booking of a
-- variant with phases raised 42P01 and surfaced as {"error":"INTERNAL"}.
-- Found by replaying the failing widget booking against a debug copy that
-- returned SQLERRM. Both function bodies below are identical to
-- 20260929110000 except the added `p` table alias.

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
        from public.service_variant_phase p
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
        from public.service_variant_phase p
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
-- Verification: text-level alias check + an end-to-end smoke test that books
-- and rolls back via a subtransaction, so a broken function body can no
-- longer pass apply-time verification. The smoke test uses live seed data
-- and skips gracefully when it is not present (fresh environments).
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('create_appointment', 'create_appointment_staff')
      and pg_get_functiondef(p.oid) ~ 'from public\.service_variant_phase\s+where p\.'
  ) then
    raise exception 'phase loop alias bug still present';
  end if;

  declare
    v_client_id uuid;
  begin
    select c.id into v_client_id from public.client c limit 1;
    if v_client_id is not null
       and exists (select 1 from public.company where id = 'b66720ac-dcb8-4051-b287-f8f8b6291cc0')
       and exists (select 1 from public.service_variant_phase svp
                   where svp.service_variant_id = '05d75e54-57b2-48d6-8420-d6600753cfba') then
    declare
      r jsonb;
    begin
      begin
        r := public.create_appointment(
          'b66720ac-dcb8-4051-b287-f8f8b6291cc0'::uuid,
          'c9599318-ee8d-4349-a121-9bdd0f07c950'::uuid,
          v_client_id, 220, null, 60,
          -- A slot the widget actually offered for this staff/variant.
          '2026-10-02 09:00:00+02'::timestamptz, '2026-10-02 10:00:00+02'::timestamptz,
          null, null, null,
          jsonb_build_array(jsonb_build_object(
            'service_variant_id', '05d75e54-57b2-48d6-8420-d6600753cfba',
            'staff_id', 'c9599318-ee8d-4349-a121-9bdd0f07c950',
            'sequence', 1)),
          '8e4ce818-b8ea-4918-b6ba-836ed4074d20'::uuid);
        raise exception '__smoke_rollback__';
      exception when others then
        if sqlerrm = '__smoke_rollback__' then
          if coalesce(r->>'success', '') <> 'true' then
            raise exception 'booking smoke test returned: %', r;
          end if;
        elsif sqlstate = 'P0001' and sqlerrm like '__smoke_rollback__%' then
          null;
        else
          raise exception 'booking smoke test raised: % (%)', sqlerrm, sqlstate;
        end if;
      end;
    end;
    end if;
  end;
end $$;
