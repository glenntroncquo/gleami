-- Staff invites are written only by the invitation-create / invitation-accept
-- edge functions (service role). Browser roles cannot insert or change a row,
-- and cannot read token_hash.

alter table public.invitation
  add column if not exists first_name text,
  add column if not exists last_name text;

alter table public.invitation
  alter column role_id set not null;

alter table public.invitation
  drop constraint if exists invitation_status_check;

alter table public.invitation
  add constraint invitation_status_check
  check (status = any (array['pending'::text, 'accepting'::text, 'accepted'::text, 'revoked'::text, 'expired'::text]));

create unique index if not exists invitation_token_hash_key
  on public.invitation (token_hash)
  where token_hash is not null;

create unique index if not exists invitation_pending_target_key
  on public.invitation (
    company_id,
    lower(email),
    coalesce(location_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where status = 'pending';

drop policy if exists "invitation insert (permission)" on public.invitation;
drop policy if exists "invitation update (permission)" on public.invitation;
drop policy if exists "invitation delete (permission)" on public.invitation;

revoke all on table public.invitation from anon, authenticated;

grant select (
  id,
  company_id,
  email,
  status,
  created_at,
  updated_at,
  location_id,
  role_id,
  invited_by,
  expires_at,
  accepted_at,
  email_sent_at,
  first_name,
  last_name
) on public.invitation to authenticated;
