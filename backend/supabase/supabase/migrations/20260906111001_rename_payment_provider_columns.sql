-- Connect Phase 1 — neutralize payment provider id columns.
-- FILE ONLY — do not apply from CI or an agent. Architect applies after review.
--
-- Replaces unapplied #26 file 20260906093455_rename_payment_stripe_refund_id.sql
-- (SKIP that file — it would have landed stripe_refund_id).
--
-- Live payment columns today:
--   stripe_payment_intent_id, stripe_charge_id, stripe_refund_it (typo)
-- Target (no stripe_ prefix):
--   provider_payment_intent_id, provider_charge_id, provider_refund_id
-- payment.payment_provider is already neutral and is left as-is.

do $$
begin
  -- Intent
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'payment'
      and column_name = 'stripe_payment_intent_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'payment'
      and column_name = 'provider_payment_intent_id'
  ) then
    alter table public.payment
      rename column stripe_payment_intent_id to provider_payment_intent_id;
  end if;

  -- Charge
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'payment'
      and column_name = 'stripe_charge_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'payment'
      and column_name = 'provider_charge_id'
  ) then
    alter table public.payment
      rename column stripe_charge_id to provider_charge_id;
  end if;

  -- Refund: typo column on live, or stripe_refund_id if the skipped #26 file
  -- was applied somewhere else. Never leave stripe_refund_id in place.
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'payment'
      and column_name = 'stripe_refund_it'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'payment'
      and column_name = 'provider_refund_id'
  ) then
    alter table public.payment
      rename column stripe_refund_it to provider_refund_id;
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'payment'
      and column_name = 'stripe_refund_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'payment'
      and column_name = 'provider_refund_id'
  ) then
    alter table public.payment
      rename column stripe_refund_id to provider_refund_id;
  end if;
end;
$$;

comment on column public.payment.provider_payment_intent_id is
  'Provider payment intent id (Stripe pi_... today). Renamed from stripe_payment_intent_id.';

comment on column public.payment.provider_charge_id is
  'Provider charge id (Stripe ch_... today). Renamed from stripe_charge_id.';

comment on column public.payment.provider_refund_id is
  'Provider refund id (Stripe re_... today). Renamed from stripe_refund_it.';

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'payment'
      and column_name in (
        'stripe_payment_intent_id',
        'stripe_charge_id',
        'stripe_refund_it',
        'stripe_refund_id'
      )
  ) then
    raise exception
      'payment still has stripe_* intent/charge/refund columns after rename';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'payment'
      and column_name = 'provider_payment_intent_id'
  ) then
    raise exception 'payment.provider_payment_intent_id missing after rename';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'payment'
      and column_name = 'provider_charge_id'
  ) then
    raise exception 'payment.provider_charge_id missing after rename';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'payment'
      and column_name = 'provider_refund_id'
  ) then
    raise exception 'payment.provider_refund_id missing after rename';
  end if;
end;
$$;
