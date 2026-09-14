-- Final step: DROP public.client_company.
-- FILE ONLY — GitHub Action deploys functions, not SQL.
-- Parent must apply_migration on SalonFlow (kvhinnhnwgvdpzggdnxs) after merge.
--
-- Cutover already live (20260906074848): apps + RPCs + client RLS use
-- client_location only. This migration must not recreate RPCs or tables.
-- No chairs/rooms. Table drop only.
--
-- FKs are outbound only (client_company → client / company). Nothing FKs
-- here, so DROP TABLE without CASCADE.

-- ---------------------------------------------------------------------------
-- 1) Drop every RLS policy on client_company, then revoke leftover grants
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  if to_regclass('public.client_company') is null then
    return;
  end if;

  for r in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'client_company'
  loop
    execute format('drop policy if exists %I on public.client_company', r.policyname);
  end loop;

  revoke all on table public.client_company from public;
  revoke all on table public.client_company from anon;
  revoke all on table public.client_company from authenticated;
  revoke all on table public.client_company from service_role;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) Drop the table
-- ---------------------------------------------------------------------------
drop table if exists public.client_company;

-- ---------------------------------------------------------------------------
-- 3) Assert to_regclass('public.client_company') is null
-- 4) Assert search / staff / referral RPCs still have no client_company refs
-- ---------------------------------------------------------------------------
do $$
declare
  search_def text;
  staff_def text;
  referral_def text;
begin
  if to_regclass('public.client_company') is not null then
    raise exception 'public.client_company still exists after drop';
  end if;

  if to_regclass('public.client_location') is null then
    raise exception 'public.client_location missing — must keep';
  end if;

  if to_regprocedure('public.search_clients_by_company(text,uuid)') is null then
    raise exception 'search_clients_by_company missing';
  end if;

  if to_regprocedure('public.create_appointment_staff(uuid,uuid,uuid,numeric,text,integer,timestamptz,timestamptz,timestamptz,timestamptz,text,jsonb,text,text,text,text,text,uuid)') is null then
    raise exception 'create_appointment_staff 18-arg form missing';
  end if;

  if to_regprocedure('public.create_appointment_with_referral(uuid,uuid,text,text,text,text,numeric,text,integer,timestamptz,timestamptz,timestamptz,text,jsonb,text,uuid)') is null then
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

  staff_def := pg_get_functiondef('public.create_appointment_staff(uuid,uuid,uuid,numeric,text,integer,timestamptz,timestamptz,timestamptz,timestamptz,text,jsonb,text,text,text,text,text,uuid)'::regprocedure);
  if position('client_company' in staff_def) > 0 then
    raise exception 'create_appointment_staff still writes or reads client_company';
  end if;

  referral_def := pg_get_functiondef('public.create_appointment_with_referral(uuid,uuid,text,text,text,text,numeric,text,integer,timestamptz,timestamptz,timestamptz,text,jsonb,text,uuid)'::regprocedure);
  if position('client_company' in referral_def) > 0 then
    raise exception 'create_appointment_with_referral still references client_company';
  end if;
end;
$$;
