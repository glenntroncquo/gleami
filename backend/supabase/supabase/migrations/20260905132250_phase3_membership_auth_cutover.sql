-- Phase 3 ONLY — retire app_metadata.company_ids as source of truth.
-- FILE ONLY — do not apply from CI or an agent. Glenn applies after review.
--
-- Depends on Phase 2 (20260905111626_phase2_rls_membership_cutover) already
-- applied: private.has_permission / has_company_permission /
-- location_ids_for_user / company_ids_for_user / has_permission_for_company.
--
-- Do NOT: Custom Access Token Hook (JWT company_ids is no longer read in
-- this repo after this file + the edge changes), Phase 4 UI /
-- multi_location flag, drop staff.role / staff_company / company address,
-- chairs/rooms, convert appointment timestamptz, anon location listing,
-- apply to SalonFlow production from this PR.
--
-- Live leftover JWT policies inspected 2026-09-05 on SalonFlow
-- (kvhinnhnwgvdpzggdnxs): company / staff_company / subscriptions all still
-- have "Company Access" FOR ALL on JWT app_metadata.company_ids.
-- create_appointment_staff still gates authenticated/anon on that claim.
-- Public booking RPCs (create_appointment, create_appointment_with_referral)
-- have no JWT company_ids check — leave them alone.
--
-- ---------------------------------------------------------------------------
-- Chosen Phase 3 pattern (leftover JWT tables only + client RPCs)
-- ---------------------------------------------------------------------------
-- Live audit 2026-09-05: ONLY company / staff_company / subscriptions still
-- use auth.jwt() app_metadata.company_ids. All other tables already use
-- Phase 2 membership helpers. Do not rework those.
--
-- These three are JWT "Company Access" FOR ALL. Replace with the same
-- shape, membership set instead of JWT, so result sets and writes stay
-- equivalent while every company is still 1:1:
--   <id|company_id> is not null
--   and <id|company_id> in (select private.company_ids_for_user())
-- USING + WITH CHECK both, matching FOR ALL. Never auth.jwt().
-- Do not permission-gate writes here — that would lock location staff
-- out of rows JWT currently lets them touch.
--
-- Client-callable wrappers live in public (the Data API schema). They are
-- SECURITY INVOKER and delegate to the Phase 2 private helpers. authenticated
-- already has USAGE on private + EXECUTE on those helpers. anon does not.
-- There is no api schema in this repo. Live has none of these RPCs yet.
--
-- No Custom Access Token Hook: after this cutover nothing in this repo
-- reads JWT company_ids. Existing users may still have a stale claim;
-- it is unused. New signups stop writing it (register-salon-owner).

-- ---------------------------------------------------------------------------
-- 0) public RPCs for web / Expo (thin wrappers over private helpers)
-- ---------------------------------------------------------------------------
create or replace function public.my_company_ids()
returns setof uuid
language sql
stable
security invoker
set search_path = public
as $$
  select private.company_ids_for_user();
$$;

create or replace function public.my_location_ids()
returns setof uuid
language sql
stable
security invoker
set search_path = public
as $$
  select private.location_ids_for_user();
$$;

create or replace function public.my_memberships()
returns table (
  source text,
  company_id uuid,
  location_id uuid,
  role_id uuid,
  role_name text,
  role_scope text,
  is_active boolean
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    'company'::text as source,
    cm.company_id,
    null::uuid as location_id,
    cm.role_id,
    r.name as role_name,
    r.scope as role_scope,
    true as is_active
  from company_membership cm
  join role r on r.id = cm.role_id
  where cm.user_id = (select auth.uid())
  union all
  select
    'location'::text,
    loc.company_id,
    lm.location_id,
    lm.role_id,
    r.name,
    r.scope,
    lm.is_active
  from location_membership lm
  join location loc on loc.id = lm.location_id
  join role r on r.id = lm.role_id
  where lm.user_id = (select auth.uid())
    and lm.is_active
$$;

create or replace function public.has_permission(perm text, location_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select private.has_permission(perm, location_id);
$$;

create or replace function public.has_company_permission(perm text, company_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select private.has_company_permission(perm, company_id);
$$;

create or replace function public.has_permission_for_company(perm text, company_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select private.has_permission_for_company(perm, company_id);
$$;

comment on function public.my_company_ids() is
  'Authenticated caller''s company ids from memberships. Replaces JWT app_metadata.company_ids.';
comment on function public.my_location_ids() is
  'Authenticated caller''s location ids from memberships (location rows + company-owned locations).';
comment on function public.my_memberships() is
  'Authenticated caller''s company_membership + active location_membership rows with role names.';
comment on function public.has_permission(text, uuid) is
  'Location-scoped permission. Scope always required. Delegates to private.has_permission.';
comment on function public.has_company_permission(text, uuid) is
  'Company-scoped permission. Scope always required. Delegates to private.has_company_permission.';
comment on function public.has_permission_for_company(text, uuid) is
  'WRITE helper: company grant OR the same key on any location of the company.';

revoke all on function public.my_company_ids() from public;
revoke all on function public.my_company_ids() from anon;
revoke all on function public.my_location_ids() from public;
revoke all on function public.my_location_ids() from anon;
revoke all on function public.my_memberships() from public;
revoke all on function public.my_memberships() from anon;
revoke all on function public.has_permission(text, uuid) from public;
revoke all on function public.has_permission(text, uuid) from anon;
revoke all on function public.has_company_permission(text, uuid) from public;
revoke all on function public.has_company_permission(text, uuid) from anon;
revoke all on function public.has_permission_for_company(text, uuid) from public;
revoke all on function public.has_permission_for_company(text, uuid) from anon;

grant execute on function public.my_company_ids() to authenticated, service_role;
grant execute on function public.my_location_ids() to authenticated, service_role;
grant execute on function public.my_memberships() to authenticated, service_role;
grant execute on function public.has_permission(text, uuid) to authenticated, service_role;
grant execute on function public.has_company_permission(text, uuid) to authenticated, service_role;
grant execute on function public.has_permission_for_company(text, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 1) company / staff_company / subscriptions — leftover JWT only
-- ---------------------------------------------------------------------------
-- Live: "Company Access" FOR ALL on each. Drop those three; do not touch
-- any Phase 2 membership/permission policy.
drop policy if exists "Company Access" on public.company;
drop policy if exists "Company Access" on public.staff_company;
drop policy if exists "Company Access" on public.subscriptions;

-- company uses id (not company_id). Authenticated INSERT of a brand-new
-- company still fails (id is not yet in the membership set) — same as JWT
-- requiring the new id already in app_metadata. Signup stays service_role.
create policy "company all (membership)"
  on public.company
  for all
  to authenticated
  using (
    id is not null
    and id in (select private.company_ids_for_user())
  )
  with check (
    id is not null
    and id in (select private.company_ids_for_user())
  );

create policy "staff_company all (membership)"
  on public.staff_company
  for all
  to authenticated
  using (
    company_id is not null
    and company_id in (select private.company_ids_for_user())
  )
  with check (
    company_id is not null
    and company_id in (select private.company_ids_for_user())
  );

-- company_id is nullable; keep the JWT-era null guard so a row with no
-- company does not become world-readable.
create policy "subscriptions all (membership)"
  on public.subscriptions
  for all
  to authenticated
  using (
    company_id is not null
    and company_id in (select private.company_ids_for_user())
  )
  with check (
    company_id is not null
    and company_id in (select private.company_ids_for_user())
  );

-- ---------------------------------------------------------------------------
-- 2) create_appointment_staff — membership set instead of JWT company_ids
-- ---------------------------------------------------------------------------
-- Body is the live SalonFlow function (20260903115536) with only the
-- authenticated/anon gate changed. service_role / edge supabaseAdmin /
-- direct SQL still skip the check. Public booking RPCs are untouched.
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
  p_phone text default null
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
    allow_overlap
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
    true
  )
  returning id into v_appointment_id;

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
      sequence, starts_at, ends_at, price, price_net, allow_overlap
    ) values (
      p_company_id, v_appointment_id, v_service_id, v_variant_id, v_segment_staff_id,
      v_sequence, v_seg_start, v_seg_start + interval '1 minute', v_price, v_price_net, true
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
          sequence, phase_type, starts_at, ends_at, allow_overlap
        ) values (
          p_company_id, v_segment_id, v_segment_staff_id,
          v_phase.sequence, v_phase.phase_type, v_phase_start, v_phase_end, true
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
        sequence, phase_type, starts_at, ends_at, allow_overlap
      ) values (
        p_company_id, v_segment_id, v_segment_staff_id,
        0, 'busy', v_phase_start, v_phase_end, true
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

grant execute on function public.create_appointment_staff(uuid, uuid, uuid, numeric, text, integer, timestamp with time zone, timestamp with time zone, timestamp with time zone, timestamp with time zone, text, jsonb, text, text, text, text, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) Apply-time verify
-- ---------------------------------------------------------------------------
do $$
declare
  missing text;
  jwt_gate boolean;
begin
  if to_regprocedure('private.has_permission(text,uuid)') is null
     or to_regprocedure('private.has_company_permission(text,uuid)') is null
     or to_regprocedure('private.location_ids_for_user()') is null
     or to_regprocedure('private.company_ids_for_user()') is null
     or to_regprocedure('private.has_permission_for_company(text,uuid)') is null
  then
    raise exception 'Phase 2 private helpers missing — apply Phase 2 first';
  end if;

  if to_regprocedure('public.my_company_ids()') is null
     or to_regprocedure('public.my_location_ids()') is null
     or to_regprocedure('public.my_memberships()') is null
     or to_regprocedure('public.has_permission(text,uuid)') is null
     or to_regprocedure('public.has_company_permission(text,uuid)') is null
     or to_regprocedure('public.has_permission_for_company(text,uuid)') is null
  then
    raise exception 'Phase 3 public RPCs missing';
  end if;

  select string_agg(format('%s.%s', tablename, policyname), ', ' order by tablename, policyname)
    into missing
  from pg_policies
  where schemaname = 'public'
    and tablename in ('company', 'staff_company', 'subscriptions')
    and policyname = 'Company Access';

  if missing is not null then
    raise exception 'JWT Company Access policies still present: %', missing;
  end if;

  if not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'company'
          and policyname = 'company all (membership)' and cmd = 'ALL'
      )
     or not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'staff_company'
          and policyname = 'staff_company all (membership)' and cmd = 'ALL'
      )
     or not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'subscriptions'
          and policyname = 'subscriptions all (membership)' and cmd = 'ALL'
      )
  then
    raise exception 'Phase 3 membership FOR ALL policies missing on leftover tables';
  end if;

  jwt_gate := pg_get_functiondef(
    'public.create_appointment_staff(uuid,uuid,uuid,numeric,text,integer,timestamptz,timestamptz,timestamptz,timestamptz,text,jsonb,text,text,text,text,text)'::regprocedure
  ) like '%app_metadata%';

  if jwt_gate then
    raise exception 'create_appointment_staff still reads JWT app_metadata';
  end if;

  if has_function_privilege('anon', 'public.my_company_ids()', 'execute')
     or has_function_privilege('anon', 'public.has_permission(text,uuid)', 'execute')
     or has_function_privilege('anon', 'public.has_company_permission(text,uuid)', 'execute')
  then
    raise exception 'anon must not execute Phase 3 public authz RPCs';
  end if;

  if not has_function_privilege('authenticated', 'public.my_company_ids()', 'execute')
     or not has_function_privilege('authenticated', 'public.has_permission(text,uuid)', 'execute')
     or not has_function_privilege('authenticated', 'public.has_company_permission(text,uuid)', 'execute')
  then
    raise exception 'authenticated must execute Phase 3 public authz RPCs';
  end if;
end;
$$;

-- Rollback (do not run in this file). Recreate JWT Company Access:
--   drop policy "company all (membership)" on public.company;
--   drop policy "staff_company all (membership)" on public.staff_company;
--   drop policy "subscriptions all (membership)" on public.subscriptions;
--   create policy "Company Access" on public.<table>
--     for all to authenticated
--     using (
--       (((select auth.jwt()) -> 'app_metadata') -> 'company_ids') is not null
--       and <id|company_id> is not null
--       and (((select auth.jwt()) -> 'app_metadata') -> 'company_ids')
--           ? (<id|company_id>)::text
--     );
-- And restore the JWT gate in create_appointment_staff from
-- 20260903115536_create_appointment_staff_find_or_create_person.sql.
