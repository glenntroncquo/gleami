-- Optional p_location_id on staff_is_on_schedule (same name; 5th arg default null).
-- Filters schedule rules/exceptions by location when set. Public create_appointment
-- threads the appointment location (p_location_id or trigger-filled primary).
-- create_appointment_staff uses location.timezone like public create.
--
-- FILE ONLY — GitHub Action deploys functions, not SQL.
-- Parent must apply_migration on SalonFlow (kvhinnhnwgvdpzggdnxs) after merge.
-- No new RPC names. No chairs/rooms.

drop function if exists public.staff_is_on_schedule(uuid, uuid, timestamp with time zone, timestamp with time zone);

create or replace function public.staff_is_on_schedule(
  p_company_id uuid,
  p_staff_id uuid,
  p_start timestamp with time zone,
  p_end timestamp with time zone,
  p_location_id uuid default null
)
returns boolean
language plpgsql
stable
set search_path to 'public', 'pg_temp'
as $schedule$
declare
  v_tz text;
begin
  select coalesce(
    (select loc.timezone from public.location loc where loc.id = p_location_id),
    (select loc.timezone from public.location loc where loc.company_id = p_company_id and loc.is_primary),
    'Europe/Brussels'
  ) into v_tz;

  return
    not exists (
      select 1
      from public.staff_schedule_exception e
      where e.company_id = p_company_id
        and e.staff_id = p_staff_id
        and e.kind = 'unavailable'
        and (p_location_id is null or e.location_id = p_location_id)
        and tstzrange(e.starts_at, e.ends_at) && tstzrange(p_start, p_end)
    )
    and (
      exists (
        select 1
        from public.staff_schedule_rule r
        where r.company_id = p_company_id
          and r.staff_id = p_staff_id
          and r.is_active
          and (p_location_id is null or r.location_id = p_location_id)
          and r.day_of_week = extract(dow from (p_start at time zone v_tz))::smallint
          and (r.effective_from is null or r.effective_from <= (p_start at time zone v_tz)::date)
          and (r.effective_to is null or r.effective_to >= (p_start at time zone v_tz)::date)
          and (p_start at time zone v_tz)::date = (p_end at time zone v_tz)::date
          and (p_start at time zone v_tz)::time >= r.start_time
          and (p_end at time zone v_tz)::time <= r.end_time
      )
      or exists (
        select 1
        from public.staff_schedule_exception e
        where e.company_id = p_company_id
          and e.staff_id = p_staff_id
          and e.kind = 'available_addition'
          and (p_location_id is null or e.location_id = p_location_id)
          and e.starts_at <= p_start
          and e.ends_at >= p_end
      )
    );
end;
$schedule$;

grant execute on function public.staff_is_on_schedule(uuid, uuid, timestamp with time zone, timestamp with time zone, uuid) to authenticated, service_role;

-- create_appointment: thread location into staff_is_on_schedule

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
  v_location_id uuid;
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

-- create_appointment_staff: location timezone like public create

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
  v_tz text := 'Europe/Brussels';
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
    p_start at time zone v_tz,
    p_end at time zone v_tz,
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
    "end" = v_end at time zone v_tz
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


do $$
declare
  schedule_def text;
  staff_def text;
  public_def text;
begin
  if to_regprocedure('public.staff_is_on_schedule(uuid,uuid,timestamptz,timestamptz,uuid)') is null then
    raise exception 'staff_is_on_schedule missing optional p_location_id';
  end if;

  if to_regprocedure('public.staff_is_on_schedule(uuid,uuid,timestamptz,timestamptz)') is not null then
    raise exception 'old 4-arg staff_is_on_schedule overload must be dropped';
  end if;

  if to_regprocedure('public.create_appointment(uuid,uuid,uuid,numeric,text,integer,timestamptz,timestamptz,timestamptz,timestamptz,text,jsonb,uuid)') is null then
    raise exception 'create_appointment 13-arg form missing';
  end if;

  if to_regprocedure('public.create_appointment_staff(uuid,uuid,uuid,numeric,text,integer,timestamptz,timestamptz,timestamptz,timestamptz,text,jsonb,text,text,text,text,text,uuid)') is null then
    raise exception 'create_appointment_staff 18-arg form missing';
  end if;

  if to_regprocedure('public.list_locations()') is not null
     or to_regprocedure('public.list_locations(uuid)') is not null
  then
    raise exception 'do not add a list_locations RPC';
  end if;

  schedule_def := pg_get_functiondef('public.staff_is_on_schedule(uuid,uuid,timestamptz,timestamptz,uuid)'::regprocedure);
  if position('p_location_id' in schedule_def) = 0
     or position('staff_schedule_rule' in schedule_def) = 0
     or position('staff_schedule_exception' in schedule_def) = 0
  then
    raise exception 'staff_is_on_schedule must filter rules/exceptions by p_location_id';
  end if;

  public_def := pg_get_functiondef('public.create_appointment(uuid,uuid,uuid,numeric,text,integer,timestamptz,timestamptz,timestamptz,timestamptz,text,jsonb,uuid)'::regprocedure);
  if position('staff_is_on_schedule(p_company_id, v_segment_staff_id, v_phase_start, v_phase_end, v_location_id)' in public_def) = 0 then
    raise exception 'create_appointment must thread location into staff_is_on_schedule';
  end if;

  staff_def := pg_get_functiondef('public.create_appointment_staff(uuid,uuid,uuid,numeric,text,integer,timestamptz,timestamptz,timestamptz,timestamptz,text,jsonb,text,text,text,text,text,uuid)'::regprocedure);
  if position('v_brussels' in staff_def) > 0 then
    raise exception 'create_appointment_staff still hardcodes v_brussels';
  end if;
  if position('loc.timezone' in staff_def) = 0 then
    raise exception 'create_appointment_staff must resolve location.timezone';
  end if;
end;
$$;
