-- Connect Phase 1 — company-level payment account (provider-neutral).
-- FILE ONLY — do not apply from CI or an agent. Architect applies after review.
--
-- Replaces unapplied #26 file 20260906093454_create_company_stripe_account.sql
-- (SKIP that file). Live apply uses this table only.
--
-- One connected account per company (not per location). Flags are synced from
-- the provider webhook (Stripe `account.updated` today); do not treat
-- onboarding redirect as source of truth.
--
-- Do NOT: destination charges / application_fee_amount, Terminal reader
-- registration, deposits, marketplace, new public RPCs.

-- ---------------------------------------------------------------------------
-- 1) company_payment_account
-- ---------------------------------------------------------------------------
create table public.company_payment_account (
  company_id uuid primary key references public.company(id) on delete cascade,
  provider text not null default 'stripe',
  provider_account_id text not null,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  details_submitted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_payment_account_provider_account_id_key unique (provider_account_id),
  constraint company_payment_account_provider_check check (provider in ('stripe', 'mollie'))
);

comment on table public.company_payment_account is
  'Connected payment account, company-level. provider is stripe today '
  '(mollie later). charges_enabled is the single gate for card PaymentIntents.';

comment on column public.company_payment_account.company_id is
  'One connected account per company. Payouts stay company-level after multi-location.';

comment on column public.company_payment_account.provider is
  'Payment provider key: stripe now, mollie later.';

comment on column public.company_payment_account.provider_account_id is
  'Provider-native account id (Stripe acct_..., later Mollie).';

comment on column public.company_payment_account.charges_enabled is
  'Mirrored from the provider account. Card payments require true.';

comment on column public.company_payment_account.payouts_enabled is
  'Mirrored from the provider account.';

comment on column public.company_payment_account.details_submitted is
  'Mirrored from the provider account. Not sufficient to take cards.';

create or replace function private.touch_company_payment_account_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.touch_company_payment_account_updated_at() from public;
revoke all on function private.touch_company_payment_account_updated_at() from anon, authenticated;

create trigger touch_company_payment_account_updated_at
  before update on public.company_payment_account
  for each row
  execute function private.touch_company_payment_account_updated_at();

-- ---------------------------------------------------------------------------
-- 2) RLS — membership SELECT; billing:manage writes
-- ---------------------------------------------------------------------------
-- SELECT: any company member (POS must read charges_enabled).
-- INSERT/UPDATE/DELETE: billing:manage (owner). Edges/webhooks use
-- service_role and bypass RLS after their own billing:manage check.
alter table public.company_payment_account enable row level security;

create policy "company_payment_account select (membership)"
  on public.company_payment_account
  for select
  to authenticated
  using (
    company_id is not null
    and company_id in (select private.company_ids_for_user())
  );

create policy "company_payment_account insert (billing:manage)"
  on public.company_payment_account
  for insert
  to authenticated
  with check (
    private.has_company_permission('billing:manage', company_id)
  );

create policy "company_payment_account update (billing:manage)"
  on public.company_payment_account
  for update
  to authenticated
  using (
    private.has_company_permission('billing:manage', company_id)
  )
  with check (
    private.has_company_permission('billing:manage', company_id)
  );

create policy "company_payment_account delete (billing:manage)"
  on public.company_payment_account
  for delete
  to authenticated
  using (
    private.has_company_permission('billing:manage', company_id)
  );

grant all on table public.company_payment_account to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) Apply-time verify
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.company_stripe_account') is not null then
    raise exception
      'company_stripe_account exists — skip the #26 stripe-named files and apply this replacement set on a DB that never received them';
  end if;

  if to_regclass('public.company_payment_account') is null then
    raise exception 'company_payment_account table missing';
  end if;

  if to_regprocedure('private.company_ids_for_user()') is null
     or to_regprocedure('private.has_company_permission(text,uuid)') is null
  then
    raise exception 'membership helpers missing — apply multi-location Phase 2 first';
  end if;

  if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'company_payment_account'
          and policyname = 'company_payment_account select (membership)'
      )
     or not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'company_payment_account'
          and policyname = 'company_payment_account insert (billing:manage)'
      )
  then
    raise exception 'company_payment_account RLS policies missing';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'company_payment_account'
      and column_name = 'provider'
  ) then
    raise exception 'company_payment_account.provider missing';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.company_payment_account'::regclass
      and contype = 'u'
      and conname = 'company_payment_account_provider_account_id_key'
  ) then
    raise exception 'company_payment_account.provider_account_id must be unique';
  end if;
end;
$$;
