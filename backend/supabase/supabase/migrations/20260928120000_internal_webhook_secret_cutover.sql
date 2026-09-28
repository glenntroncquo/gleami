-- ---------------------------------------------------------------------------
-- Internal caller boundary: stop presenting the service_role key from the DB.
--
-- Security audit findings C2, C5, C6, C7, H5, M5, M11.
--
-- Before this migration, seven triggers and two cron jobs invoked edge
-- functions with the project's service_role JWT as a plaintext bearer, stored
-- in pg_trigger and cron.job. That is a permanent, non-expiring, highest-
-- privilege credential sitting in database metadata, and rotating it meant
-- editing nine objects by hand. None of those objects existed in a migration,
-- so a restore from schema would silently lose appointment emails, TimeTree
-- sync, stock sync and payment-state sync.
--
-- The functions themselves performed no caller check at all, and verify_jwt
-- only proves the caller holds the public anon key, so every one of these
-- endpoints was effectively open.
--
-- Now: Authorization carries the public anon key (satisfies the gateway's
-- verify_jwt) and a dedicated `x-internal-secret` header carries a rotatable
-- secret that only our own triggers and cron know. Edge functions verify it
-- with a constant-time comparison (assertInternalSecret).
--
-- The internal-secret placeholder below is substituted at apply time, matching
-- the convention already used by 20260924190000_marketplace_sync_schedule.sql.
-- The same value must be set as the INTERNAL_WEBHOOK_SECRET function secret.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1) Appointment notification emails (C5, C6)
-- ---------------------------------------------------------------------------
drop trigger if exists appointment_insert_email on public.appointment;
create trigger appointment_insert_email
  after insert on public.appointment
  for each row
  execute function supabase_functions.http_request(
    'https://kvhinnhnwgvdpzggdnxs.supabase.co/functions/v1/appointment-notify-confirmation-email',
    'POST',
    '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2aGlubmhud2d2ZHB6Z2dkbnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE2MjcwNjAsImV4cCI6MjA1NzIwMzA2MH0.0sWCffCfBL9k7QtWXJgR3RDe7Mw_MssJPSkarIL3gS4","x-internal-secret":"__INTERNAL_WEBHOOK_SECRET__"}',
    '{}',
    '5000'
  );

drop trigger if exists appointment_update_email on public.appointment;
create trigger appointment_update_email
  after update on public.appointment
  for each row
  execute function supabase_functions.http_request(
    'https://kvhinnhnwgvdpzggdnxs.supabase.co/functions/v1/appointment-notify-update-email',
    'POST',
    '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2aGlubmhud2d2ZHB6Z2dkbnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE2MjcwNjAsImV4cCI6MjA1NzIwMzA2MH0.0sWCffCfBL9k7QtWXJgR3RDe7Mw_MssJPSkarIL3gS4","x-internal-secret":"__INTERNAL_WEBHOOK_SECRET__"}',
    '{}',
    '5000'
  );

-- ---------------------------------------------------------------------------
-- 2) TimeTree calendar sync (C7)
-- ---------------------------------------------------------------------------
drop trigger if exists appointment_insert_sync_timetree_create on public.appointment;
create trigger appointment_insert_sync_timetree_create
  after insert on public.appointment
  for each row
  execute function supabase_functions.http_request(
    'https://kvhinnhnwgvdpzggdnxs.supabase.co/functions/v1/timetree-sync-create',
    'POST',
    '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2aGlubmhud2d2ZHB6Z2dkbnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE2MjcwNjAsImV4cCI6MjA1NzIwMzA2MH0.0sWCffCfBL9k7QtWXJgR3RDe7Mw_MssJPSkarIL3gS4","x-internal-secret":"__INTERNAL_WEBHOOK_SECRET__"}',
    '{}',
    '5000'
  );

drop trigger if exists appointment_update_sync_timetree_update on public.appointment;
create trigger appointment_update_sync_timetree_update
  after update on public.appointment
  for each row
  execute function supabase_functions.http_request(
    'https://kvhinnhnwgvdpzggdnxs.supabase.co/functions/v1/timetree-sync-update',
    'POST',
    '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2aGlubmhud2d2ZHB6Z2dkbnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE2MjcwNjAsImV4cCI6MjA1NzIwMzA2MH0.0sWCffCfBL9k7QtWXJgR3RDe7Mw_MssJPSkarIL3gS4","x-internal-secret":"__INTERNAL_WEBHOOK_SECRET__"}',
    '{}',
    '5000'
  );

drop trigger if exists appointment_update_sync_timetree_cancel on public.appointment;
create trigger appointment_update_sync_timetree_cancel
  after update on public.appointment
  for each row
  execute function supabase_functions.http_request(
    'https://kvhinnhnwgvdpzggdnxs.supabase.co/functions/v1/timetree-sync-delete',
    'POST',
    '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2aGlubmhud2d2ZHB6Z2dkbnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE2MjcwNjAsImV4cCI6MjA1NzIwMzA2MH0.0sWCffCfBL9k7QtWXJgR3RDe7Mw_MssJPSkarIL3gS4","x-internal-secret":"__INTERNAL_WEBHOOK_SECRET__"}',
    '{}',
    '5000'
  );

-- ---------------------------------------------------------------------------
-- 3) POS stock and payment-state sync. These two already refused non
--    service_role callers, so they move to the same secret rather than keep
--    the service_role key alive purely for them.
-- ---------------------------------------------------------------------------
drop trigger if exists "order-item-handler" on public.order_item;
create trigger "order-item-handler"
  after insert or delete or update on public.order_item
  for each row
  execute function supabase_functions.http_request(
    'https://kvhinnhnwgvdpzggdnxs.supabase.co/functions/v1/sync-order-items-stock',
    'POST',
    '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2aGlubmhud2d2ZHB6Z2dkbnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE2MjcwNjAsImV4cCI6MjA1NzIwMzA2MH0.0sWCffCfBL9k7QtWXJgR3RDe7Mw_MssJPSkarIL3gS4","x-internal-secret":"__INTERNAL_WEBHOOK_SECRET__"}',
    '{}',
    '5000'
  );

drop trigger if exists "payment-handler" on public.payment;
create trigger "payment-handler"
  after insert or delete or update on public.payment
  for each row
  execute function supabase_functions.http_request(
    'https://kvhinnhnwgvdpzggdnxs.supabase.co/functions/v1/sync-order-payment-state',
    'POST',
    '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2aGlubmhud2d2ZHB6Z2dkbnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE2MjcwNjAsImV4cCI6MjA1NzIwMzA2MH0.0sWCffCfBL9k7QtWXJgR3RDe7Mw_MssJPSkarIL3gS4","x-internal-secret":"__INTERNAL_WEBHOOK_SECRET__"}',
    '{}',
    '5000'
  );

-- ---------------------------------------------------------------------------
-- 4) Hourly appointment reminders (C2, H5).
--    Job 3 ("Appointment reminder v2") is an inactive duplicate of job 4 that
--    still carried a live service_role JWT; it is removed rather than left
--    dormant with a working credential in it.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from cron.job where jobname = 'Appointment reminder v2') then
    perform cron.unschedule('Appointment reminder v2');
  end if;
  if exists (select 1 from cron.job where jobname = 'appointment-notify-reminder-email') then
    perform cron.unschedule('appointment-notify-reminder-email');
  end if;
end
$$;

select cron.schedule(
  'appointment-notify-reminder-email',
  '0 * * * *',
  $cron$
  select net.http_post(
    url := 'https://kvhinnhnwgvdpzggdnxs.supabase.co/functions/v1/appointment-notify-reminder-email',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2aGlubmhud2d2ZHB6Z2dkbnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE2MjcwNjAsImV4cCI6MjA1NzIwMzA2MH0.0sWCffCfBL9k7QtWXJgR3RDe7Mw_MssJPSkarIL3gS4","x-internal-secret":"__INTERNAL_WEBHOOK_SECRET__"}'::jsonb,
    body := '{"source":"cron"}'::jsonb,
    timeout_milliseconds := 30000
  );
  $cron$
);

-- ---------------------------------------------------------------------------
-- 5) Apply-time verification. The old service_role JWT never appears as plain
--    text inside a trigger definition (its payload is base64url), so the leak
--    check matches the base64 fragment that encodes "role":"service_role".
-- ---------------------------------------------------------------------------
do $$
declare
  leaked_triggers int;
  leaked_jobs int;
  wired_triggers int;
  wired_jobs int;
begin
  select count(*) into leaked_triggers
  from pg_trigger t
  where not t.tgisinternal
    and pg_get_triggerdef(t.oid) like '%InNlcnZpY2Vfcm9sZS%';

  select count(*) into leaked_jobs
  from cron.job
  where command like '%InNlcnZpY2Vfcm9sZS%';

  select count(*) into wired_triggers
  from pg_trigger t
  where not t.tgisinternal
    and pg_get_triggerdef(t.oid) like '%x-internal-secret%';

  select count(*) into wired_jobs
  from cron.job
  where command like '%x-internal-secret%';

  if leaked_triggers > 0 then
    raise exception 'service_role credential still present in % trigger definition(s)', leaked_triggers;
  end if;
  if leaked_jobs > 0 then
    raise exception 'service_role credential still present in % cron job(s)', leaked_jobs;
  end if;
  if wired_triggers <> 7 then
    raise exception 'expected 7 triggers wired with x-internal-secret, found %', wired_triggers;
  end if;
  if wired_jobs <> 1 then
    raise exception 'expected 1 cron job wired with x-internal-secret, found %', wired_jobs;
  end if;
end
$$;
