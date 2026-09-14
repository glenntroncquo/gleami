-- Phase 5 ONLY — drop leftover pre-membership staff artifacts.
-- FILE ONLY — do not apply from CI or an agent. Glenn applies after review.
--
-- Drops:
--   * public.staff.role (roles live on company_membership / location_membership)
--   * public.staff_company (replaced by memberships)
--   * public.staff_notes (unused in this repo; no incoming FKs; 0 live rows)
--
-- Keeps:
--   * public.staff.company_id
--   * public.client_notes
--   * public.appointment.staff_notes (appointment column, not the table)
--
-- Do NOT: new public RPCs, chairs/rooms/resources, mail location address,
-- Expo cutover, marketplace, apply to SalonFlow production from this PR.
--
-- Live audit 2026-09-05 (SalonFlow kvhinnhnwgvdpzggdnxs):
--   * staff.role exists (text, nullable). 3 staff rows have a value.
--   * staff_company exists (1 row). FKs only to company + staff. No incoming
--     FKs. Policy: "staff_company all (membership)". Not in realtime pub.
--   * staff_notes exists (0 rows). PK only; no FKs. Membership/permission
--     policies. No SQL functions, views, or edge paths read/write the table.
--   * No public/private function bodies reference staff.role or staff_company.
--
-- Idempotent: IF EXISTS / to_regclass guards. Revoke + drop policies before
-- DROP TABLE so grants and RLS do not linger.

-- ---------------------------------------------------------------------------
-- 1) public.staff.role
-- ---------------------------------------------------------------------------
alter table public.staff drop column if exists role;

-- ---------------------------------------------------------------------------
-- 2) public.staff_company
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.staff_company') is not null then
    drop policy if exists "Company Access" on public.staff_company;
    drop policy if exists "staff_company all (membership)" on public.staff_company;
    revoke all on table public.staff_company from public;
    revoke all on table public.staff_company from anon;
    revoke all on table public.staff_company from authenticated;
    revoke all on table public.staff_company from service_role;
  end if;
end;
$$;

drop table if exists public.staff_company;

-- ---------------------------------------------------------------------------
-- 3) public.staff_notes (the table — not appointment.staff_notes)
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.staff_notes') is not null then
    drop policy if exists "Company Access" on public.staff_notes;
    drop policy if exists "staff_notes select (membership)" on public.staff_notes;
    drop policy if exists "staff_notes insert (permission)" on public.staff_notes;
    drop policy if exists "staff_notes update (permission)" on public.staff_notes;
    drop policy if exists "staff_notes delete (permission)" on public.staff_notes;
    revoke all on table public.staff_notes from public;
    revoke all on table public.staff_notes from anon;
    revoke all on table public.staff_notes from authenticated;
    revoke all on table public.staff_notes from service_role;
  end if;
end;
$$;

drop table if exists public.staff_notes;

-- ---------------------------------------------------------------------------
-- 4) verify — leftovers gone; kept objects still present
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'staff'
      and column_name = 'role'
  ) then
    raise exception 'Phase 5: public.staff.role still exists';
  end if;

  if to_regclass('public.staff_company') is not null then
    raise exception 'Phase 5: public.staff_company still exists';
  end if;

  if to_regclass('public.staff_notes') is not null then
    raise exception 'Phase 5: public.staff_notes still exists';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'staff'
      and column_name = 'company_id'
  ) then
    raise exception 'Phase 5: public.staff.company_id missing — must keep';
  end if;

  if to_regclass('public.client_notes') is null then
    raise exception 'Phase 5: public.client_notes missing — must keep';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'appointment'
      and column_name = 'staff_notes'
  ) then
    raise exception 'Phase 5: appointment.staff_notes missing — must keep';
  end if;
end;
$$;
