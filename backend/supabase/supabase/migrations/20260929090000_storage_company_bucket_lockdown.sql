-- ---------------------------------------------------------------------------
-- Storage lockdown (audit finding H1).
--
-- The live database carried a "CRUD Access" policy on storage.objects granting
-- ALL to any authenticated user. Because RLS permissive policies OR together,
-- that single policy defeated every bucket-scoped rule and gave any signed-up
-- account read/write/delete on every object in every bucket, across tenants.
-- It was created out-of-band and existed in no migration.
--
-- The `company` bucket (staff photos, appointment images, treatment images,
-- branding, illustrations) additionally had no size limit and no MIME
-- restriction, so the project domain could be turned into a free file host.
--
-- This migration:
--   1. drops the global CRUD policy;
--   2. gives the company bucket the same 10 MiB / image-only limits the
--      marketplace bucket already has;
--   3. adds bucket-scoped policies. Reads stay public (the bucket is public
--      and booking-widget / marketplace-web render public URLs and list
--      illustrations anonymously). Writes require a permission on the company
--      named by the first path segment, matched per use-case subfolder:
--        profile/          staff:manage  (or calendar:write so practitioners
--                                         can update their own photo)
--        appointments/     calendar:write
--        treatment_images/ catalog:manage
--        branding/         settings:manage
--        illustrations/    settings:manage
--      Any other subfolder is denied. Service-role edge function uploads
--      bypass RLS entirely and are unaffected.
--
-- Uses private.has_permission_for_company (company-level grant OR a grant at
-- any location of the company), the same helper family as the marketplace
-- storage policies in 20260924183000_marketplace_schema.sql.
-- ---------------------------------------------------------------------------

drop policy if exists "CRUD Access" on storage.objects;

update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
where id = 'company';

-- Reads: public bucket, public read. Also makes storage list() work for
-- anonymous marketplace visitors browsing illustrations.
drop policy if exists "company objects select (public)" on storage.objects;
create policy "company objects select (public)"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'company');

-- Writes: company from first path segment, permission chosen by subfolder.
create or replace function private.company_storage_write_allowed(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with parsed as (
    select
      case
        when split_part(object_name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then split_part(object_name, '/', 1)::uuid
        else null::uuid
      end as company_id,
      split_part(object_name, '/', 2) as scope
  )
  select case
    when (select company_id from parsed) is null then false
    when (select scope from parsed) = 'profile' then
      private.has_permission_for_company('staff:manage', (select company_id from parsed))
      or private.has_permission_for_company('calendar:write', (select company_id from parsed))
    when (select scope from parsed) = 'appointments' then
      private.has_permission_for_company('calendar:write', (select company_id from parsed))
    when (select scope from parsed) = 'treatment_images' then
      private.has_permission_for_company('catalog:manage', (select company_id from parsed))
    when (select scope from parsed) in ('branding', 'illustrations') then
      private.has_permission_for_company('settings:manage', (select company_id from parsed))
    else false
  end
$$;

-- RLS predicates execute as the invoking user, so authenticated callers need
-- EXECUTE or every write policy fails closed with a permission error.
revoke all on function private.company_storage_write_allowed(text) from public, anon;
grant execute on function private.company_storage_write_allowed(text) to authenticated;

drop policy if exists "company objects insert (scoped)" on storage.objects;
create policy "company objects insert (scoped)"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'company' and private.company_storage_write_allowed(name));

drop policy if exists "company objects update (scoped)" on storage.objects;
create policy "company objects update (scoped)"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'company' and private.company_storage_write_allowed(name))
  with check (bucket_id = 'company' and private.company_storage_write_allowed(name));

drop policy if exists "company objects delete (scoped)" on storage.objects;
create policy "company objects delete (scoped)"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'company' and private.company_storage_write_allowed(name));

-- ---------------------------------------------------------------------------
-- Apply-time verification.
-- ---------------------------------------------------------------------------
do $$
declare
  global_policies int;
  company_policies int;
  bucket_ok boolean;
begin
  select count(*) into global_policies
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'storage'
    and c.relname = 'objects'
    and p.polname = 'CRUD Access';

  select count(*) into company_policies
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'storage'
    and c.relname = 'objects'
    and p.polname like 'company objects %';

  select (file_size_limit = 10485760 and allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
    into bucket_ok
  from storage.buckets
  where id = 'company';

  if global_policies > 0 then
    raise exception 'global CRUD Access policy still present on storage.objects';
  end if;
  if company_policies <> 4 then
    raise exception 'expected 4 company-bucket policies, found %', company_policies;
  end if;
  if not coalesce(bucket_ok, false) then
    raise exception 'company bucket limits not applied';
  end if;
end
$$;
