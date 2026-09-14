-- Connect Phase 1 cleanup — drop leftover test columns on company.
-- FILE ONLY — do not apply from CI or an agent. Architect applies after review.
--
-- Replaces unapplied #26 file 20260906093456_drop_company_stripe_legacy_columns.sql
-- (SKIP that file). Depends on 20260906111000_create_company_payment_account.
--
-- company.stripe_account_id and company.reader_id were nulled 4 Sep 2026;
-- nothing to migrate. Terminal reader registration is deferred.
-- payment-process-terminal / payment-simulate-terminal now take company_id
-- instead of looking up company.reader_id.

alter table public.company drop column if exists stripe_account_id;
alter table public.company drop column if exists reader_id;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'company'
      and column_name in ('stripe_account_id', 'reader_id')
  ) then
    raise exception 'company.stripe_account_id / reader_id still present';
  end if;

  if to_regclass('public.company_payment_account') is null then
    raise exception
      'drop company legacy payment columns only after company_payment_account exists';
  end if;
end;
$$;
