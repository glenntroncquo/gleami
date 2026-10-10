-- Company-scoped salon setup.
--
-- A company grants app access only after its own setup is complete.
-- Existing companies stay established. A company_setup row with
-- completed_at set is complete even though the previous saver stored
-- current_step 5. An unfinished row marks that company in_setup and
-- its memberships stop granting access. Other companies for the same
-- person are unchanged.
--
-- user_id remains the draft creator. It is no longer the primary key,
-- so one person can keep a separate draft per company. The legacy
-- salon-setup-* Edge Functions are intentionally left in place; this
-- migration makes their premature memberships stop granting access.

alter table public.company
  add column if not exists setup_status text;

update public.company
set setup_status = 'established'
where setup_status is null;

alter table public.company
  alter column setup_status set default 'established';

alter table public.company
  alter column setup_status set not null;

alter table public.company
  drop constraint if exists company_setup_status_value_check;

alter table public.company
  add constraint company_setup_status_value_check
  check (setup_status in ('established', 'in_setup'));

comment on column public.company.setup_status is
  'established companies are usable. in_setup companies stay out of the app until their own setup completes.';

alter table public.company_setup
  add column if not exists id uuid,
  add column if not exists status text,
  add column if not exists idempotency_key text;

update public.company_setup
set id = gen_random_uuid()
where id is null;

update public.company_setup
set
  status = case when completed_at is not null then 'completed' else 'in_progress' end,
  current_step = case when completed_at is not null then 6 else current_step end;

alter table public.company_setup
  alter column id set default gen_random_uuid();

alter table public.company_setup
  alter column id set not null;

alter table public.company_setup
  alter column status set default 'in_progress';

alter table public.company_setup
  alter column status set not null;

do $$
declare
  v_name text;
begin
  select conname into v_name
  from pg_constraint
  where conrelid = 'public.company_setup'::regclass
    and contype = 'p';
  if v_name is not null then
    execute format('alter table public.company_setup drop constraint %I', v_name);
  end if;
end $$;

alter table public.company_setup
  add constraint company_setup_pkey primary key (id);

create index if not exists company_setup_user_id_idx
  on public.company_setup (user_id);

create unique index if not exists company_setup_user_idempotency_key
  on public.company_setup (user_id, idempotency_key)
  where idempotency_key is not null;

alter table public.company_setup
  drop constraint if exists company_setup_status_check;

alter table public.company_setup
  add constraint company_setup_status_check
  check (status in ('in_progress', 'completed'));

alter table public.company_setup
  drop constraint if exists company_setup_status_completed_at_check;

alter table public.company_setup
  add constraint company_setup_status_completed_at_check
  check (
    (status = 'in_progress' and completed_at is null)
    or (status = 'completed' and completed_at is not null)
  );

comment on column public.company_setup.user_id is
  'Creator of this draft. One person may have one draft per company.';

comment on column public.company_setup.status is
  'in_progress drafts do not grant app access. completed_at, not current_step, is the completion signal.';

update public.company c
set setup_status = 'in_setup'
from public.company_setup s
where s.company_id = c.id
  and s.status = 'in_progress';

update public.location l
set is_active = false,
    is_listed = false
from public.company c
where l.company_id = c.id
  and c.setup_status = 'in_setup';

delete from public.location_membership lm
using public.location l, public.company c
where lm.location_id = l.id
  and l.company_id = c.id
  and c.setup_status = 'in_setup';

delete from public.company_membership cm
using public.company c
where cm.company_id = c.id
  and c.setup_status = 'in_setup';

-- ---------------------------------------------------------------------------
-- Shared access filter. public.my_* is what the app reads. RLS helpers keep
-- their bodies; in_setup companies have no membership rows, and triggers
-- below keep it that way.
-- ---------------------------------------------------------------------------
create or replace function public.my_company_ids()
returns setof uuid
language sql
stable
security invoker
set search_path = public
as $$
  select c.id
  from public.company c
  where c.setup_status = 'established'
    and not exists (
      select 1
      from public.company_setup s
      where s.company_id = c.id
        and s.status = 'in_progress'
    )
    and c.id in (select private.company_ids_for_user());
$$;

create or replace function public.my_location_ids()
returns setof uuid
language sql
stable
security invoker
set search_path = public
as $$
  select l.id
  from public.location l
  join public.company c on c.id = l.company_id
  where c.setup_status = 'established'
    and not exists (
      select 1
      from public.company_setup s
      where s.company_id = c.id
        and s.status = 'in_progress'
    )
    and l.id in (select private.location_ids_for_user());
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
  join company c on c.id = cm.company_id
  where cm.user_id = (select auth.uid())
    and c.setup_status = 'established'
    and not exists (
      select 1
      from company_setup s
      where s.company_id = c.id
        and s.status = 'in_progress'
    )
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
  join company c on c.id = loc.company_id
  join role r on r.id = lm.role_id
  where lm.user_id = (select auth.uid())
    and lm.is_active
    and c.setup_status = 'established'
    and not exists (
      select 1
      from company_setup s
      where s.company_id = c.id
        and s.status = 'in_progress'
    );
$$;

create or replace function private.reject_membership_while_company_in_setup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company uuid;
begin
  if tg_table_name = 'company_membership' then
    v_company := new.company_id;
  else
    select l.company_id into v_company
    from public.location l
    where l.id = new.location_id;
  end if;

  if v_company is not null and (
    exists (
      select 1
      from public.company c
      where c.id = v_company
        and c.setup_status = 'in_setup'
    )
    or exists (
      select 1
      from public.company_setup s
      where s.company_id = v_company
        and s.status = 'in_progress'
    )
  ) then
    raise exception 'This salon is still in setup' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function private.reject_membership_while_company_in_setup() from public, anon, authenticated;

drop trigger if exists reject_company_membership_while_in_setup on public.company_membership;
create trigger reject_company_membership_while_in_setup
  before insert or update of company_id
  on public.company_membership
  for each row
  execute function private.reject_membership_while_company_in_setup();

drop trigger if exists reject_location_membership_while_in_setup on public.location_membership;
create trigger reject_location_membership_while_in_setup
  before insert or update of location_id
  on public.location_membership
  for each row
  execute function private.reject_membership_while_company_in_setup();

create or replace function private.keep_in_setup_location_private()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  select c.setup_status into v_status
  from public.company c
  where c.id = new.company_id;
  if v_status = 'in_setup' then
    new.is_active := false;
    new.is_listed := false;
  end if;
  return new;
end;
$$;

revoke all on function private.keep_in_setup_location_private() from public, anon, authenticated;

drop trigger if exists keep_in_setup_location_private on public.location;
create trigger keep_in_setup_location_private
  before insert or update of is_active, is_listed, company_id
  on public.location
  for each row
  execute function private.keep_in_setup_location_private();

create or replace function private.sync_company_setup_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.company_id is null then
    return new;
  end if;

  if new.status = 'in_progress' then
    update public.company
    set setup_status = 'in_setup'
    where id = new.company_id
      and setup_status is distinct from 'in_setup';

    update public.location
    set is_active = false,
        is_listed = false
    where company_id = new.company_id
      and (is_active or is_listed);

    delete from public.location_membership lm
    using public.location l
    where lm.location_id = l.id
      and l.company_id = new.company_id;

    delete from public.company_membership
    where company_id = new.company_id;
  elsif new.status = 'completed' then
    update public.company
    set setup_status = 'established'
    where id = new.company_id
      and setup_status is distinct from 'established';
  end if;

  return new;
end;
$$;

revoke all on function private.sync_company_setup_access() from public, anon, authenticated;

drop trigger if exists sync_company_setup_access on public.company_setup;
create trigger sync_company_setup_access
  after insert or update of status, company_id
  on public.company_setup
  for each row
  execute function private.sync_company_setup_access();

create or replace function private.json_text(p_value jsonb, p_max integer)
returns text
language sql
immutable
as $$
  select case
    when p_value is null or jsonb_typeof(p_value) <> 'string' then ''
    else left(btrim(p_value #>> '{}'), p_max)
  end;
$$;

revoke all on function private.json_text(jsonb, integer) from public, anon, authenticated;

create or replace function private.salon_setup_payload(p_setup public.company_setup)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'id', p_setup.id,
    'companyId', p_setup.company_id,
    'locationId', p_setup.location_id,
    'currentStep', p_setup.current_step,
    'status', p_setup.status,
    'businessName', p_setup.business_name,
    'website', p_setup.website,
    'categories', to_jsonb(p_setup.categories),
    'teamSize', p_setup.team_size,
    'currentSoftware', p_setup.current_software,
    'address', p_setup.address,
    'openingHours', p_setup.opening_hours,
    'completedAt', p_setup.completed_at
  );
$$;

revoke all on function private.salon_setup_payload(public.company_setup) from public, anon, authenticated;

create or replace function private.setup_editor_allowed(p_setup public.company_setup)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_setup.user_id = (select auth.uid())
    or exists (
      select 1
      from public.company_membership cm
      join public.role r on r.id = cm.role_id
      where cm.user_id = (select auth.uid())
        and cm.company_id = p_setup.company_id
        and r.name = 'owner'
        and r.scope = 'company'
        and r.is_system is true
    );
$$;

revoke all on function private.setup_editor_allowed(public.company_setup) from public, anon, authenticated;

create or replace function public.account_workspaces()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_confirmed boolean;
  v_companies jsonb;
  v_drafts jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'unauthenticated');
  end if;

  select u.email_confirmed_at is not null
  into v_confirmed
  from auth.users u
  where u.id = v_uid;

  select coalesce(jsonb_agg(to_jsonb(company_rows) order by company_rows.name, company_rows.id), '[]'::jsonb)
  into v_companies
  from (
    select
      c.id,
      c.name,
      case
        when exists (
          select 1
          from public.company_membership cm
          where cm.user_id = v_uid
            and cm.company_id = c.id
        ) then 'company'
        else 'location'
      end as via
    from public.company c
    where c.setup_status = 'established'
      and not exists (
        select 1
        from public.company_setup s
        where s.company_id = c.id
          and s.status = 'in_progress'
      )
      and (
        exists (
          select 1
          from public.company_membership cm
          where cm.user_id = v_uid
            and cm.company_id = c.id
        )
        or exists (
          select 1
          from public.location_membership lm
          join public.location l on l.id = lm.location_id
          where lm.user_id = v_uid
            and lm.is_active
            and l.company_id = c.id
        )
      )
  ) company_rows;

  select coalesce(jsonb_agg(to_jsonb(draft_rows) order by draft_rows.name, draft_rows.id), '[]'::jsonb)
  into v_drafts
  from (
    select
      s.id,
      s.company_id as "companyId",
      coalesce(nullif(s.business_name, ''), 'New salon') as name,
      s.current_step as "currentStep"
    from public.company_setup s
    where s.user_id = v_uid
      and s.status = 'in_progress'
  ) draft_rows;

  return jsonb_build_object(
    'emailConfirmed', coalesce(v_confirmed, false),
    'companies', v_companies,
    'drafts', v_drafts
  );
end;
$$;

revoke all on function public.account_workspaces() from public, anon;
grant execute on function public.account_workspaces() to authenticated, service_role;

comment on function public.account_workspaces() is
  'Established companies, active location access, and unfinished drafts for the signed-in user. Lookup failures surface as RPC errors and must not be treated as an empty account.';

create or replace function public.get_salon_setup(p_setup_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_setup public.company_setup;
  v_count integer;
begin
  if v_uid is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;

  if p_setup_id is not null then
    select * into v_setup
    from public.company_setup
    where id = p_setup_id;
    if not found then
      return null;
    end if;
    if v_setup.status <> 'in_progress' or not private.setup_editor_allowed(v_setup) then
      return null;
    end if;
    return private.salon_setup_payload(v_setup);
  end if;

  select count(*) into v_count
  from public.company_setup
  where user_id = v_uid
    and status = 'in_progress';

  if v_count = 0 then
    return null;
  end if;
  if v_count > 1 then
    raise exception 'Choose a setup draft';
  end if;

  select * into v_setup
  from public.company_setup
  where user_id = v_uid
    and status = 'in_progress';
  return private.salon_setup_payload(v_setup);
end;
$$;

revoke all on function public.get_salon_setup(uuid) from public, anon;
grant execute on function public.get_salon_setup(uuid) to authenticated, service_role;

create or replace function public.save_salon_setup(
  p_step integer,
  p_payload jsonb default '{}'::jsonb,
  p_setup_id uuid default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_meta jsonb;
  v_confirmed boolean;
  v_setup public.company_setup;
  v_company_id uuid;
  v_location_id uuid;
  v_name text;
  v_website text;
  v_categories text[];
  v_team text;
  v_software text;
  v_street text;
  v_city text;
  v_country text;
  v_postal text;
  v_state text;
  v_timezone text;
  v_address jsonb;
  v_hours jsonb;
  v_full text;
  v_first text;
  v_last text;
  v_staff_id uuid;
  v_owner_role uuid;
  v_stylist_role uuid;
  v_loaded boolean := false;
begin
  if v_uid is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  if p_step is null or p_step < 1 or p_step > 6 then
    raise exception 'Invalid setup step';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Invalid setup payload';
  end if;
  if octet_length(p_payload::text) > 20000 then
    raise exception 'Setup payload is too large';
  end if;
  if p_idempotency_key is not null
    and p_idempotency_key !~ '^[A-Za-z0-9_-]{8,80}$' then
    raise exception 'Invalid setup request';
  end if;

  select u.email, u.raw_user_meta_data, u.email_confirmed_at is not null
  into v_email, v_meta, v_confirmed
  from auth.users u
  where u.id = v_uid;

  if v_confirmed is not true then
    raise exception 'Confirm your email before setting up a salon';
  end if;

  if p_setup_id is not null then
    select * into v_setup
    from public.company_setup
    where id = p_setup_id
    for update;
    if not found then
      raise exception 'Setup draft not found' using errcode = '42501';
    end if;
    if not private.setup_editor_allowed(v_setup) then
      raise exception 'Setup draft not found' using errcode = '42501';
    end if;
    v_loaded := true;
  elsif p_idempotency_key is not null then
    select * into v_setup
    from public.company_setup
    where user_id = v_uid
      and idempotency_key = p_idempotency_key
    for update;
    v_loaded := found;
  end if;

  if v_loaded and v_setup.status = 'completed' then
    raise exception 'Setup is already complete';
  end if;

  if not v_loaded then
    if p_step <> 1 then
      raise exception 'Start setup at step 1';
    end if;
    if p_idempotency_key is null then
      raise exception 'Invalid setup request';
    end if;

    v_name := private.json_text(p_payload->'businessName', 240);
    v_website := private.json_text(p_payload->'website', 500);
    if v_name = '' then
      raise exception 'Business name is required';
    end if;

    begin
      insert into public.company (name, email, website, setup_status)
      values (v_name, v_email, nullif(v_website, ''), 'in_setup')
      returning id into v_company_id;

      insert into public.company_setup (
        user_id,
        company_id,
        current_step,
        status,
        business_name,
        website,
        idempotency_key
      ) values (
        v_uid,
        v_company_id,
        2,
        'in_progress',
        v_name,
        nullif(v_website, ''),
        p_idempotency_key
      )
      returning * into v_setup;
    exception
      when unique_violation then
        select * into v_setup
        from public.company_setup
        where user_id = v_uid
          and idempotency_key = p_idempotency_key
        for update;
        if not found then
          raise;
        end if;
        v_loaded := true;
    end;
    v_loaded := v_setup.id is not null;
  end if;

  if not v_loaded then
    raise exception 'Start setup at step 1';
  end if;

  if v_setup.status = 'completed' then
    raise exception 'Setup is already complete';
  end if;

  if p_step > v_setup.current_step then
    raise exception 'Finish the previous step first';
  end if;

  if p_step = 1 then
    v_name := private.json_text(p_payload->'businessName', 240);
    v_website := private.json_text(p_payload->'website', 500);
    if v_name = '' then
      raise exception 'Business name is required';
    end if;
    update public.company
    set name = v_name,
        website = nullif(v_website, '')
    where id = v_setup.company_id;
    update public.company_setup
    set business_name = v_name,
        website = nullif(v_website, ''),
        current_step = greatest(current_step, 2)
    where id = v_setup.id
    returning * into v_setup;

  elsif p_step = 2 then
    if jsonb_typeof(p_payload->'categories') is distinct from 'array' then
      raise exception 'Choose at least one category';
    end if;
    select coalesce(array_agg(left(btrim(item), 80) order by ord), '{}')
    into v_categories
    from (
      select item, ord
      from jsonb_array_elements_text(p_payload->'categories') with ordinality as t(item, ord)
      where btrim(item) <> ''
      limit 4
    ) limited;
    if coalesce(array_length(v_categories, 1), 0) < 1 then
      raise exception 'Choose at least one category';
    end if;
    update public.company_setup
    set categories = v_categories,
        current_step = greatest(current_step, 3)
    where id = v_setup.id
    returning * into v_setup;

  elsif p_step = 3 then
    v_team := private.json_text(p_payload->'teamSize', 40);
    if v_team = '' then
      raise exception 'Team size is required';
    end if;
    update public.company_setup
    set team_size = v_team,
        current_step = greatest(current_step, 4)
    where id = v_setup.id
    returning * into v_setup;

  elsif p_step = 4 then
    if jsonb_typeof(p_payload->'address') is distinct from 'object' then
      raise exception 'Street, city and country are required';
    end if;
    v_street := private.json_text(p_payload->'address'->'street', 240);
    v_city := private.json_text(p_payload->'address'->'city', 120);
    v_country := private.json_text(p_payload->'address'->'country', 120);
    v_postal := private.json_text(p_payload->'address'->'postalCode', 32);
    v_state := private.json_text(p_payload->'address'->'state', 120);
    v_timezone := private.json_text(p_payload->'address'->'timezone', 80);
    if v_timezone = '' then
      v_timezone := 'Europe/Brussels';
    end if;
    if v_street = '' or v_city = '' or v_country = '' then
      raise exception 'Street, city and country are required';
    end if;
    v_address := jsonb_build_object(
      'street', v_street,
      'city', v_city,
      'postalCode', v_postal,
      'state', v_state,
      'country', v_country,
      'timezone', v_timezone
    );
    v_location_id := v_setup.location_id;
    if v_location_id is null then
      insert into public.location (
        company_id, name, street, city, postal_code, state, country,
        timezone, is_primary, is_active, is_listed
      ) values (
        v_setup.company_id,
        coalesce(nullif(v_setup.business_name, ''), 'Salon'),
        v_street, v_city, nullif(v_postal, ''), nullif(v_state, ''), v_country,
        v_timezone, true, false, false
      )
      returning id into v_location_id;
    else
      update public.location
      set name = coalesce(nullif(v_setup.business_name, ''), name),
          street = v_street,
          city = v_city,
          postal_code = nullif(v_postal, ''),
          state = nullif(v_state, ''),
          country = v_country,
          timezone = v_timezone,
          is_active = false,
          is_listed = false
      where id = v_location_id
        and company_id = v_setup.company_id;
    end if;
    update public.company_setup
    set location_id = v_location_id,
        address = v_address,
        current_step = greatest(current_step, 5)
    where id = v_setup.id
    returning * into v_setup;

  elsif p_step = 5 then
    v_software := private.json_text(p_payload->'software', 100);
    update public.company_setup
    set current_software = nullif(v_software, ''),
        current_step = greatest(current_step, 6)
    where id = v_setup.id
    returning * into v_setup;

  else
    if v_setup.location_id is null or v_setup.current_step < 6 then
      raise exception 'Finish the previous step first';
    end if;
    if jsonb_typeof(p_payload->'openingHours') is distinct from 'object' then
      raise exception 'Opening hours are required';
    end if;
    v_hours := p_payload->'openingHours';
    if octet_length(v_hours::text) > 8000 then
      raise exception 'Setup payload is too large';
    end if;

    -- Mark the draft complete before granting membership. The in-setup
    -- guard rejects membership while this row is still in progress, and
    -- the completion trigger then marks the company established.
    update public.company_setup
    set opening_hours = v_hours,
        current_step = 6,
        status = 'completed',
        completed_at = now()
    where id = v_setup.id
    returning * into v_setup;

    update public.location
    set is_active = true
    where id = v_setup.location_id
      and company_id = v_setup.company_id;

    select s.id into v_staff_id
    from public.staff s
    where s.company_id = v_setup.company_id
      and s.user_id = v_uid
    limit 1;

    if v_staff_id is null then
      v_full := coalesce(
        nullif(btrim(v_meta->>'full_name'), ''),
        nullif(btrim(v_meta->>'name'), ''),
        split_part(coalesce(v_email, 'owner'), '@', 1)
      );
      v_first := coalesce(
        nullif(btrim(v_meta->>'given_name'), ''),
        nullif(btrim(v_meta->>'first_name'), ''),
        split_part(v_full, ' ', 1)
      );
      v_last := nullif(btrim(regexp_replace(v_full, '^\S+\s*', '')), '');
      v_last := coalesce(nullif(btrim(v_meta->>'family_name'), ''), nullif(btrim(v_meta->>'last_name'), ''), v_last);
      insert into public.staff (
        company_id, user_id, email, first_name, last_name, status
      ) values (
        v_setup.company_id,
        v_uid,
        coalesce(v_email, ''),
        left(v_first, 80),
        left(v_last, 80),
        'Active'
      )
      returning id into v_staff_id;
    end if;

    select r.id into v_owner_role
    from public.role r
    where r.name = 'owner'
      and r.scope = 'company'
      and r.is_system is true;
    if v_owner_role is null then
      raise exception 'Owner role is not configured';
    end if;

    select r.id into v_stylist_role
    from public.role r
    where r.name = 'stylist'
      and r.scope = 'location'
      and r.is_system is true;
    if v_stylist_role is null then
      raise exception 'Stylist role is not configured';
    end if;

    insert into public.company_membership (user_id, company_id, role_id)
    values (v_uid, v_setup.company_id, v_owner_role)
    on conflict (user_id, company_id) do update
      set role_id = excluded.role_id;

    insert into public.location_membership (user_id, location_id, staff_id, role_id, is_active)
    values (v_uid, v_setup.location_id, v_staff_id, v_stylist_role, true)
    on conflict (user_id, location_id) do update
      set staff_id = excluded.staff_id,
          role_id = excluded.role_id,
          is_active = true;
  end if;

  return private.salon_setup_payload(v_setup);
end;
$$;

revoke all on function public.save_salon_setup(integer, jsonb, uuid, text) from public, anon;
grant execute on function public.save_salon_setup(integer, jsonb, uuid, text) to authenticated, service_role;

create or replace function public.discard_salon_setup(p_setup_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_setup public.company_setup;
  v_company uuid;
begin
  if v_uid is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  if p_setup_id is null then
    raise exception 'Setup draft not found' using errcode = '42501';
  end if;

  select * into v_setup
  from public.company_setup
  where id = p_setup_id
  for update;

  if not found then
    raise exception 'Setup draft not found' using errcode = '42501';
  end if;
  if v_setup.status <> 'in_progress' or not private.setup_editor_allowed(v_setup) then
    raise exception 'Setup draft not found' using errcode = '42501';
  end if;

  v_company := v_setup.company_id;

  if exists (select 1 from public.appointment a where a.company_id = v_company)
    or exists (select 1 from public."order" o where o.company_id = v_company)
    or exists (select 1 from public.service sv where sv.company_id = v_company)
    or exists (
      select 1
      from public.staff s
      where s.company_id = v_company
        and s.user_id is distinct from v_uid
    )
  then
    raise exception 'This salon already has business data and cannot be discarded';
  end if;

  begin
    delete from public.staff where company_id = v_company;
    delete from public.company where id = v_company;
  exception
    when foreign_key_violation then
      raise exception 'This salon already has business data and cannot be discarded';
  end;

  return jsonb_build_object('discarded', true);
end;
$$;

revoke all on function public.discard_salon_setup(uuid) from public, anon;
grant execute on function public.discard_salon_setup(uuid) to authenticated, service_role;

comment on function public.save_salon_setup(integer, jsonb, uuid, text) is
  'Saves one setup step for a draft the caller created. Company, location, staff, and user ids in the payload are ignored. Step 6 grants access only to that company.';

comment on function public.discard_salon_setup(uuid) is
  'Deletes an unfinished draft company when it has no appointments, orders, services, or other people.';
