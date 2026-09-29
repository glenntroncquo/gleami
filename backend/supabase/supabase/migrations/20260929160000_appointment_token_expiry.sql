-- Guest appointment-access tokens: add expiry.
--
-- appointment_access_token is already a good capability design (256-bit
-- random token, SHA-256 at rest, scoped to one appointment, service-role
-- only table). The remaining gap vs. best practice: tokens never expired.
-- A manage link mailed for an appointment stayed valid forever, so an old
-- leaked email could reveal appointment details years later.
--
-- Tokens now expire at appointment start + 1 day. That covers the entire
-- useful lifetime (cancel requires start > now anyway) plus a short grace
-- window for viewing details, then the link dies. Revocation stays manual:
-- deleting the row (service role only) kills the token instantly.

alter table public.appointment_access_token
  add column if not exists expires_at timestamptz;

-- Backfill existing rows from their appointment's start time. Tokens whose
-- appointment started more than a day ago expire immediately; they were
-- already useless for cancellation.
update public.appointment_access_token t
set expires_at = a.start + interval '1 day'
from public.appointment a
where a.id = t.appointment_id
  and t.expires_at is null;

-- Any orphan rows (no matching appointment) fail closed: expire them too.
update public.appointment_access_token
set expires_at = now()
where expires_at is null;

alter table public.appointment_access_token
  alter column expires_at set not null;

create index if not exists appointment_access_token_expiry_idx
  on public.appointment_access_token (expires_at);

do $$
declare
  v_nulls integer;
  v_notnull boolean;
begin
  select count(*) into v_nulls from public.appointment_access_token where expires_at is null;
  if v_nulls > 0 then
    raise exception 'TOKEN EXPIRY CHECK FAILED: % rows without expires_at', v_nulls;
  end if;
  select attnotnull into v_notnull from pg_attribute
  where attrelid = 'public.appointment_access_token'::regclass and attname = 'expires_at';
  if not v_notnull then
    raise exception 'TOKEN EXPIRY CHECK FAILED: expires_at is nullable';
  end if;
end $$;
