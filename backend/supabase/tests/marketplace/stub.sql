-- Throwaway core for marketplace migration checks. Not applied to SalonFlow.
create schema if not exists extensions;
create extension if not exists postgis;
create extension if not exists pg_trgm with schema extensions;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end
$$;

create schema if not exists auth;
create table if not exists auth.users (id uuid primary key);
create or replace function auth.uid() returns uuid
language sql stable as $$ select null::uuid $$;

create schema if not exists private;
create or replace function private.has_company_permission(perm text, company_id uuid)
returns boolean language sql stable security definer as $$ select false $$;
create or replace function private.has_permission_for_company(perm text, company_id uuid)
returns boolean language sql stable security definer as $$ select false $$;

create schema if not exists storage;
create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text,
  name text
);

create table if not exists public.company (id uuid primary key);

create table if not exists public.service (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.company (id) on delete cascade,
  name text not null,
  description text,
  display_order integer,
  is_active boolean,
  is_deleted boolean,
  updated_at timestamptz
);

create table if not exists public.location (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.company (id) on delete cascade,
  name text not null,
  slug text,
  street text,
  postal_code text,
  city text,
  country text,
  geo_location public.geography(point, 4326),
  image_url text,
  timezone text not null default 'Europe/Brussels',
  is_listed boolean not null default false,
  is_active boolean not null default true,
  updated_at timestamptz
);

create table if not exists public.location_service (
  location_id uuid not null references public.location (id) on delete cascade,
  service_id uuid not null references public.service (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (location_id, service_id)
);

create table if not exists public.service_variant (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.service (id) on delete cascade,
  company_id uuid not null references public.company (id) on delete cascade,
  name text not null,
  price numeric not null default 0,
  client_duration_minutes integer not null default 30,
  display_order integer,
  is_active boolean,
  is_deleted boolean
);
