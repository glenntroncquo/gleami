-- Marketplace sync schedule.
-- FILE ONLY — do not apply from CI or an agent. Glenn applies after review,
-- after 20260924183000_marketplace_schema.sql.
--
-- No new functions. Triggers call the existing supabase_functions.http_request.
-- Cron commands inline net.http_post.
--
-- BEFORE APPLY, replace every __MARKETPLACE_WEBHOOK_SECRET__ in this file
-- with the same random string you set as the edge secret
-- MARKETPLACE_WEBHOOK_SECRET. Do not commit the real value.
-- Also set edge secret SUPABASE_DB_URL to the session connection string
-- (direct :5432 or the session pooler). Not the transaction pooler.
--
-- Project ref is the SalonFlow project already named in backend/supabase/README.md.

-- ---------------------------------------------------------------------------
-- 0) Extensions and the webhook function that already ships with Supabase
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regprocedure('supabase_functions.http_request()') is null then
    raise exception
      'supabase_functions.http_request() is missing. Database webhooks are not available on this database.';
  end if;
end
$$;

create extension if not exists pg_net;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    return;
  end if;

  begin
    create extension pg_cron with schema cron;
  exception when others then
    raise exception
      'Enable pg_cron in the Supabase dashboard (Database → Extensions, schema cron), then re-apply this migration. %',
      sqlerrm;
  end;
end
$$;

-- ---------------------------------------------------------------------------
-- 1) Row triggers. Payload is only used to find ids; sync re-reads the row.
--    UPDATE of location ignores marketplace_published_at-only writes so the
--    sync does not loop when it stamps that column.
--    marketplace_location_like has no trigger. like_count is the daily job.
--    service_variant has no trigger. The daily drift rebuild picks up a
--    changed default variant.
-- ---------------------------------------------------------------------------
drop trigger if exists marketplace_sync_location_write on public.location;
create trigger marketplace_sync_location_write
  after insert or delete on public.location
  for each row
  execute function supabase_functions.http_request(
    'https://kvhinnhnwgvdpzggdnxs.supabase.co/functions/v1/marketplace-sync',
    'POST',
    '{"Content-Type":"application/json","Authorization":"Bearer __MARKETPLACE_WEBHOOK_SECRET__"}',
    '{}',
    '15000'
  );

drop trigger if exists marketplace_sync_location_update on public.location;
create trigger marketplace_sync_location_update
  after update on public.location
  for each row
  when (
    old.is_listed is distinct from new.is_listed
    or old.is_active is distinct from new.is_active
    or old.slug is distinct from new.slug
    or old.name is distinct from new.name
    or old.city is distinct from new.city
    or old.street is distinct from new.street
    or old.postal_code is distinct from new.postal_code
    or old.country is distinct from new.country
    or old.image_url is distinct from new.image_url
    or old.timezone is distinct from new.timezone
    or old.geo_location is distinct from new.geo_location
  )
  execute function supabase_functions.http_request(
    'https://kvhinnhnwgvdpzggdnxs.supabase.co/functions/v1/marketplace-sync',
    'POST',
    '{"Content-Type":"application/json","Authorization":"Bearer __MARKETPLACE_WEBHOOK_SECRET__"}',
    '{}',
    '15000'
  );

drop trigger if exists marketplace_sync_service_write on public.service;
create trigger marketplace_sync_service_write
  after insert or delete on public.service
  for each row
  execute function supabase_functions.http_request(
    'https://kvhinnhnwgvdpzggdnxs.supabase.co/functions/v1/marketplace-sync',
    'POST',
    '{"Content-Type":"application/json","Authorization":"Bearer __MARKETPLACE_WEBHOOK_SECRET__"}',
    '{}',
    '15000'
  );

drop trigger if exists marketplace_sync_service_update on public.service;
create trigger marketplace_sync_service_update
  after update on public.service
  for each row
  when (
    old.name is distinct from new.name
    or old.is_active is distinct from new.is_active
    or old.is_deleted is distinct from new.is_deleted
    or old.is_marketplace_visible is distinct from new.is_marketplace_visible
  )
  execute function supabase_functions.http_request(
    'https://kvhinnhnwgvdpzggdnxs.supabase.co/functions/v1/marketplace-sync',
    'POST',
    '{"Content-Type":"application/json","Authorization":"Bearer __MARKETPLACE_WEBHOOK_SECRET__"}',
    '{}',
    '15000'
  );

drop trigger if exists marketplace_sync_location_service on public.location_service;
create trigger marketplace_sync_location_service
  after insert or delete on public.location_service
  for each row
  execute function supabase_functions.http_request(
    'https://kvhinnhnwgvdpzggdnxs.supabase.co/functions/v1/marketplace-sync',
    'POST',
    '{"Content-Type":"application/json","Authorization":"Bearer __MARKETPLACE_WEBHOOK_SECRET__"}',
    '{}',
    '15000'
  );

drop trigger if exists marketplace_sync_service_category on public.service_marketplace_category;
create trigger marketplace_sync_service_category
  after insert or delete on public.service_marketplace_category
  for each row
  execute function supabase_functions.http_request(
    'https://kvhinnhnwgvdpzggdnxs.supabase.co/functions/v1/marketplace-sync',
    'POST',
    '{"Content-Type":"application/json","Authorization":"Bearer __MARKETPLACE_WEBHOOK_SECRET__"}',
    '{}',
    '15000'
  );

-- ---------------------------------------------------------------------------
-- 2) Daily jobs. 03:15 UTC recounts likes. 03:45 UTC drift-rebuilds listed
--    locations. Both POST with the webhook bearer, not the service_role key.
--    Unschedule first so a re-apply after the secret substitution replaces
--    the placeholder job instead of leaving both.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from cron.job where jobname = 'marketplace-refresh-like-counts') then
    perform cron.unschedule('marketplace-refresh-like-counts');
  end if;
  if exists (select 1 from cron.job where jobname = 'marketplace-drift-check') then
    perform cron.unschedule('marketplace-drift-check');
  end if;
end
$$;

select cron.schedule(
  'marketplace-refresh-like-counts',
  '15 3 * * *',
  $cron$
  select net.http_post(
    url := 'https://kvhinnhnwgvdpzggdnxs.supabase.co/functions/v1/marketplace-refresh-like-counts',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer __MARKETPLACE_WEBHOOK_SECRET__"}'::jsonb,
    body := '{"source":"cron"}'::jsonb,
    timeout_milliseconds := 15000
  );
  $cron$
);

select cron.schedule(
  'marketplace-drift-check',
  '45 3 * * *',
  $cron$
  select net.http_post(
    url := 'https://kvhinnhnwgvdpzggdnxs.supabase.co/functions/v1/marketplace-drift-check',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer __MARKETPLACE_WEBHOOK_SECRET__"}'::jsonb,
    body := '{"source":"cron"}'::jsonb,
    timeout_milliseconds := 60000
  );
  $cron$
);
