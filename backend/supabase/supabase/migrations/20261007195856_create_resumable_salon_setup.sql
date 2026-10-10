-- Resumable salon onboarding. Companies are created on step 1, locations on step 4.
create table public.company_setup (
  user_id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid unique references public.company(id) on delete cascade,
  location_id uuid unique references public.location(id) on delete set null,
  current_step smallint not null default 1 check (current_step between 1 and 6),
  business_name text,
  website text,
  categories text[] not null default '{}',
  team_size text,
  current_software text,
  address jsonb not null default '{}'::jsonb,
  opening_hours jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.company_setup enable row level security;
create policy "company_setup select own" on public.company_setup
  for select to authenticated using ((select auth.uid()) = user_id);
-- All access goes through the new auth-verified Edge Functions. Do not grant
-- direct Data API writes: the service-side setup link is security-sensitive.
revoke all on public.company_setup from anon, authenticated;

create or replace function private.touch_company_setup_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;
revoke all on function private.touch_company_setup_updated_at() from public, anon, authenticated;
create trigger touch_company_setup_updated_at before update on public.company_setup
  for each row execute function private.touch_company_setup_updated_at();
