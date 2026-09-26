-- Marketplace customer accounts.
-- FILE ONLY — do not apply from CI or an agent. Glenn applies after review.
-- Targets SalonFlow production directly. There is no staging.
--
-- A marketplace customer is an auth.users row linked to one or more
-- public.client rows through client.user_id. Linking happens only in the
-- marketplace-account-complete Edge Function (service role), by verified
-- email. This file adds:
--   1) indexes for user_id and case-insensitive email lookups,
--   2) a guard so only the service role can set or change client.user_id,
--   3) customer read access to their own client rows (RLS, additive),
--   4) a column-safe appointment history RPC for customers,
--   5) service-role-only helpers for the account Edge Functions.
--
-- Appointments get no customer RLS policy on purpose. RLS is row-level and
-- appointment carries staff_notes / staff_image_path / notes that salons
-- write for themselves. Customers read history through
-- public.marketplace_my_appointments(), which returns only safe columns.
--
-- marketplace_location_like already has own-only RLS (20260924183000).

-- ---------------------------------------------------------------------------
-- 0) Preconditions
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'client' and column_name = 'user_id'
  ) then
    raise exception 'public.client.user_id must already exist';
  end if;

  if to_regprocedure('private.location_ids_for_user()') is null then
    raise exception 'private.location_ids_for_user() missing';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 1) Indexes
-- ---------------------------------------------------------------------------
create index if not exists client_user_id_idx
  on public.client (user_id)
  where user_id is not null;

create index if not exists client_email_lower_idx
  on public.client (lower(email))
  where email is not null;

-- ---------------------------------------------------------------------------
-- 2) client.user_id is service-role only
-- ---------------------------------------------------------------------------
-- client rows are shared across salons (client_location). A staff member with
-- clients:manage could otherwise point user_id at their own account and read
-- that client's history at other salons through marketplace_my_appointments.
create or replace function private.guard_client_user_id()
returns trigger
language plpgsql
set search_path = private, public, pg_temp
as $$
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin')
     or coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' and new.user_id is not null then
    raise exception 'client.user_id can only be set by the service role'
      using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
    raise exception 'client.user_id can only be changed by the service role'
      using errcode = '42501';
  end if;

  return new;
end
$$;

drop trigger if exists client_guard_user_id on public.client;
create trigger client_guard_user_id
  before insert or update of user_id on public.client
  for each row execute function private.guard_client_user_id();

-- ---------------------------------------------------------------------------
-- 3) Customer RLS on client (additive to the staff membership policies)
-- ---------------------------------------------------------------------------
create or replace function private.client_ids_for_user()
returns setof uuid
language sql
stable
security definer
set search_path = private, public, pg_temp
as $$
  select c.id
  from client c
  where c.user_id = (select auth.uid())
$$;

revoke all on function private.client_ids_for_user() from public, anon;
grant execute on function private.client_ids_for_user() to authenticated;

drop policy if exists "client select (own)" on public.client;
create policy "client select (own)"
  on public.client
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 4) Customer appointment history (column-safe)
-- ---------------------------------------------------------------------------
create or replace function public.marketplace_my_appointments(
  p_limit integer default 50,
  p_before timestamp default null
)
returns table (
  id uuid,
  starts_at timestamp,
  ends_at timestamp,
  status text,
  is_canceled boolean,
  price numeric,
  location_id uuid,
  location_name text,
  location_slug text,
  location_city text,
  location_image_url text,
  services text[]
)
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select
    a.id,
    a.start,
    a."end",
    a.status,
    a.is_canceled,
    a.price,
    a.location_id,
    loc.name,
    loc.slug,
    loc.city,
    loc.image_url,
    coalesce(
      (
        select array_agg(s.name order by seg.sequence)
        from appointment_segment seg
        join service s on s.id = seg.service_id
        where seg.appointment_id = a.id
      ),
      '{}'::text[]
    )
  from appointment a
  join location loc on loc.id = a.location_id
  where a.client_id in (select private.client_ids_for_user())
    and (p_before is null or a.start < p_before)
  order by a.start desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
$$;

revoke all on function public.marketplace_my_appointments(integer, timestamp) from public, anon;
grant execute on function public.marketplace_my_appointments(integer, timestamp) to authenticated;

-- ---------------------------------------------------------------------------
-- 5) Service-role helpers for the marketplace account Edge Functions
-- ---------------------------------------------------------------------------
-- Decides which screen follows "Doorgaan" on the email step. Only callable by
-- the service role; the Edge Function is the only caller.
create or replace function public.marketplace_auth_email_status(p_email text)
returns table (account_exists boolean, has_password boolean)
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select
    count(*) > 0,
    coalesce(bool_or(coalesce(u.encrypted_password, '') <> ''), false)
  from auth.users u
  where lower(u.email) = lower(trim(p_email))
    and u.deleted_at is null
$$;

revoke all on function public.marketplace_auth_email_status(text) from public, anon, authenticated;
grant execute on function public.marketplace_auth_email_status(text) to service_role;

-- Links every unlinked client with the user's (verified) email, fills blank
-- profile fields without overwriting what a salon entered, and creates a
-- client when none exists. Idempotent. Returns what the account now sees.
create or replace function public.marketplace_link_customer(
  p_user_id uuid,
  p_email text,
  p_first_name text,
  p_last_name text,
  p_phone text
)
returns table (client_count integer, appointment_count integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text := lower(trim(p_email));
begin
  if p_user_id is null or coalesce(v_email, '') = '' then
    raise exception 'user id and email are required';
  end if;

  update client c
  set user_id = p_user_id,
      updated_at = now()
  where lower(c.email) = v_email
    and c.user_id is null;

  update client c
  set first_name = coalesce(nullif(trim(c.first_name), ''), p_first_name),
      last_name = coalesce(nullif(trim(c.last_name), ''), p_last_name),
      phone = coalesce(nullif(trim(c.phone), ''), p_phone),
      updated_at = now()
  where c.user_id = p_user_id;

  if not exists (select 1 from client c where c.user_id = p_user_id) then
    insert into client (email, first_name, last_name, phone, user_id)
    values (v_email, p_first_name, p_last_name, p_phone, p_user_id)
    on conflict (email) do nothing;
  end if;

  return query
  select
    (select count(*)::integer from client c where c.user_id = p_user_id),
    (
      select count(*)::integer
      from appointment a
      join client c on c.id = a.client_id
      where c.user_id = p_user_id
    );
end
$$;

revoke all on function public.marketplace_link_customer(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.marketplace_link_customer(uuid, text, text, text, text) to service_role;
