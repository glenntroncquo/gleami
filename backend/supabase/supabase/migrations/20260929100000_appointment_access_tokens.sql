-- Appointment manage-booking tokens (C3/C4).
--
-- Guest cancel/manage links used to be authorization-free UUID triples
-- (appointmentId + clientId + companyId), which made every appointment of a
-- client enumerable and cancelable by anyone who ever saw one link. Tokens
-- replace that: each notification email mints a fresh random token per
-- appointment; only the SHA-256 hash is stored, raw tokens exist only in the
-- sent email and the guest's browser.
--
-- Only service_role (edge functions) may read/write this table: RLS enabled,
-- zero policies, all grants to anon/authenticated revoked.

create table if not exists public.appointment_access_token (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointment(id) on delete cascade,
  token_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists appointment_access_token_lookup_idx
  on public.appointment_access_token (appointment_id, token_hash);

alter table public.appointment_access_token enable row level security;

revoke all on public.appointment_access_token from anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_tables
    where schemaname = 'public' and tablename = 'appointment_access_token'
  ) then
    raise exception 'appointment_access_token table missing after migration';
  end if;

  if not (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'appointment_access_token'
  ) then
    raise exception 'RLS not enabled on appointment_access_token';
  end if;

  if exists (
    select 1
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'appointment_access_token'
  ) then
    raise exception 'appointment_access_token must have no RLS policies';
  end if;

  if exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = 'appointment_access_token'
      and grantee in ('anon', 'authenticated')
  ) then
    raise exception 'appointment_access_token still grants privileges to anon/authenticated';
  end if;
end $$;
