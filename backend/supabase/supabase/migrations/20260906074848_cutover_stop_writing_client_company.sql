-- Phase cutover: stop depending on public.client_company in live SQL.
-- Table + its RLS stay until a later DROP after apps ship.
--
-- FILE ONLY — GitHub Action deploys functions, not SQL.
-- Parent must apply_migration on SalonFlow (kvhinnhnwgvdpzggdnxs) after merge.
-- No new RPC names. No chairs/rooms. Do not DROP client_company.
--
-- Bodies taken from:
--   search_clients_by_company — live + client-search/sql snapshot
--   create_appointment_staff — 20260906063207_schedule_location_and_staff_tz
--   create_appointment_with_referral — 20260905190000_anon_location_select_public_booking

-- ---------------------------------------------------------------------------
-- 1) search_clients_by_company — EXISTS via client_location → location.company_id
--    (no is_active filter)
-- ---------------------------------------------------------------------------
create or replace function public.search_clients_by_company(
  search_term text,
  p_company_id uuid default null
)
returns table(id uuid, first_name text, last_name text, email text, rank real)
language plpgsql
as $function$BEGIN
 DECLARE
  query tsquery;
 BEGIN
  query := to_tsquery('simple', search_term || ':*');

  RETURN QUERY
  SELECT
   c.id,
   c.first_name,
   c.last_name,
   c.email,
   ts_rank_cd(c.search_vector, query)::REAL AS rank
  FROM client c
  WHERE c.search_vector @@ query
    AND (
      p_company_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM client_location cl
        JOIN location loc ON loc.id = cl.location_id
        WHERE cl.client_id = c.id
          AND loc.company_id = p_company_id
      )
    )
  ORDER BY rank DESC
  LIMIT 50;
 END;
EXCEPTION WHEN OTHERS THEN
 RETURN;
END;$function$;

-- ---------------------------------------------------------------------------
-- 2) create_appointment_staff — drop INSERT client_company; keep client_location
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 3) create_appointment_with_referral — company link via client_location⋈location
-- ---------------------------------------------------------------------------
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
  v_link_location_id uuid;
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
    return jsonb_build_object('error', SQLERRM);
end;
$function$;

grant execute on function public.create_appointment_with_referral(uuid, uuid, text, text, text, text, numeric, text, integer, timestamp with time zone, timestamp with time zone, timestamp with time zone, timestamp with time zone, text, jsonb, text, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4) public.client RLS — location-only SELECT/UPDATE/DELETE; INSERT without
--    chicken-egg (membership / clients:manage, no existing client_* row)
-- ---------------------------------------------------------------------------
drop policy if exists "client select (membership)" on public.client;
create policy "client select (membership)"
  on public.client
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.client_location cl
      where cl.client_id = client.id
        and cl.location_id in (select private.location_ids_for_user())
    )
  );

drop policy if exists "client insert (membership)" on public.client;
create policy "client insert (membership)"
  on public.client
  for insert
  to authenticated
  with check (
    exists (select 1 from private.company_ids_for_user())
    or exists (select 1 from private.location_ids_for_user())
    or exists (
      select 1
      from private.location_ids_for_user() lid
      where private.has_permission('clients:manage', lid)
    )
    or exists (
      select 1
      from private.company_ids_for_user() cid
      where private.has_permission_for_company('clients:manage', cid)
    )
  );

comment on policy "client insert (membership)" on public.client is
  'New client insert: caller has company or location membership (or clients:manage). '
  'Does not require an existing client_company / client_location row for the new id.';

drop policy if exists "client update (permission)" on public.client;
create policy "client update (permission)"
  on public.client
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.client_location cl
      where cl.client_id = client.id
        and private.has_permission('clients:manage', cl.location_id)
    )
  )
  with check (
    exists (
      select 1
      from public.client_location cl
      where cl.client_id = client.id
        and private.has_permission('clients:manage', cl.location_id)
    )
  );

drop policy if exists "client delete (permission)" on public.client;
create policy "client delete (permission)"
  on public.client
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.client_location cl
      where cl.client_id = client.id
        and private.has_permission('clients:manage', cl.location_id)
    )
  );

-- ---------------------------------------------------------------------------
-- 5) Apply-time verify
-- ---------------------------------------------------------------------------
do $$
declare
  search_def text;
  staff_def text;
  referral_def text;
  select_using text;
  insert_check text;
  update_using text;
  delete_using text;
begin
  if to_regclass('public.client_company') is null then
    raise exception 'client_company must stay until a later drop PR';
  end if;

  if to_regprocedure('public.search_clients_by_company(text,uuid)') is null then
    raise exception 'search_clients_by_company missing';
  end if;

  if to_regprocedure('public.create_appointment_staff(uuid,uuid,uuid,numeric,text,integer,timestamptz,timestamptz,timestamptz,timestamptz,text,jsonb,text,text,text,text,text,uuid)') is null then
    raise exception 'create_appointment_staff 18-arg form missing';
  end if;

  if to_regprocedure('public.create_appointment_with_referral(uuid,uuid,text,text,text,text,numeric,text,integer,timestamptz,timestamptz,timestamptz,timestamptz,text,jsonb,text,uuid)') is null then
    raise exception 'create_appointment_with_referral 17-arg form missing';
  end if;

  if to_regprocedure('public.list_locations()') is not null
     or to_regprocedure('public.list_locations(uuid)') is not null
  then
    raise exception 'do not add a list_locations RPC';
  end if;

  search_def := pg_get_functiondef('public.search_clients_by_company(text,uuid)'::regprocedure);
  if position('client_company' in search_def) > 0 then
    raise exception 'search_clients_by_company still references client_company';
  end if;
  if position('client_location' in search_def) = 0
     or position('loc.company_id' in search_def) = 0
  then
    raise exception 'search_clients_by_company must EXISTS via client_location → location.company_id';
  end if;
  if position('is_active' in search_def) > 0 then
    raise exception 'search_clients_by_company must not filter is_active';
  end if;

  staff_def := pg_get_functiondef('public.create_appointment_staff(uuid,uuid,uuid,numeric,text,integer,timestamptz,timestamptz,timestamptz,timestamptz,text,jsonb,text,text,text,text,text,uuid)'::regprocedure);
  if position('client_company' in staff_def) > 0 then
    raise exception 'create_appointment_staff still writes or reads client_company';
  end if;
  if position('client_location' in staff_def) = 0 then
    raise exception 'create_appointment_staff must keep client_location write';
  end if;

  referral_def := pg_get_functiondef('public.create_appointment_with_referral(uuid,uuid,text,text,text,text,numeric,text,integer,timestamptz,timestamptz,timestamptz,timestamptz,text,jsonb,text,uuid)'::regprocedure);
  if position('client_company' in referral_def) > 0 then
    raise exception 'create_appointment_with_referral still references client_company';
  end if;
  if position('client_location' in referral_def) = 0
     or position('loc.company_id' in referral_def) = 0
     or position('REFERRAL_NOT_NEW_CLIENT' in referral_def) = 0
  then
    raise exception 'create_appointment_with_referral must use client_location⋈location for existing-link / insert';
  end if;

  select pg_get_expr(pol.polqual, pol.polrelid)
    into select_using
  from pg_policy pol
  join pg_class c on c.oid = pol.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'client' and pol.polname = 'client select (membership)';

  if select_using is null or position('client_company' in select_using) > 0 then
    raise exception 'client SELECT still references client_company';
  end if;
  if position('client_location' in select_using) = 0
     or position('location_ids_for_user' in select_using) = 0
  then
    raise exception 'client SELECT must be location-only via client_location + location_ids_for_user';
  end if;

  select pg_get_expr(pol.polwithcheck, pol.polrelid)
    into insert_check
  from pg_policy pol
  join pg_class c on c.oid = pol.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'client' and pol.polname = 'client insert (membership)';

  if insert_check is null
     or position('client_company' in insert_check) > 0
     or position('client_location' in insert_check) > 0
  then
    raise exception 'client INSERT must not require an existing client_company / client_location row';
  end if;
  if position('company_ids_for_user' in insert_check) = 0
     or position('location_ids_for_user' in insert_check) = 0
  then
    raise exception 'client INSERT must allow company or location membership';
  end if;

  select pg_get_expr(pol.polqual, pol.polrelid)
    into update_using
  from pg_policy pol
  join pg_class c on c.oid = pol.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'client' and pol.polname = 'client update (permission)';

  if update_using is null or position('client_company' in update_using) > 0 then
    raise exception 'client UPDATE still references client_company';
  end if;
  if position('has_permission' in update_using) = 0
     or position('client_location' in update_using) = 0
  then
    raise exception 'client UPDATE must be location-only via has_permission(clients:manage)';
  end if;

  select pg_get_expr(pol.polqual, pol.polrelid)
    into delete_using
  from pg_policy pol
  join pg_class c on c.oid = pol.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'client' and pol.polname = 'client delete (permission)';

  if delete_using is null or position('client_company' in delete_using) > 0 then
    raise exception 'client DELETE still references client_company';
  end if;
  if position('has_permission' in delete_using) = 0
     or position('client_location' in delete_using) = 0
  then
    raise exception 'client DELETE must be location-only via has_permission(clients:manage)';
  end if;
end;
$$;
