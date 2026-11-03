-- Replace the payment HTTP webhook with a pgflow job in the same
-- transaction as the write. Each flow must already be compiled by starting
-- its worker once. start_flow raises if a flow is missing, and that rolls
-- the payment write back.
--
-- A payment with no order is skipped. The step rereads every payment on the
-- order, so a retry writes the same totals again. An update that moves a
-- payment to another order reconciles both orders.

do $$
begin
  if not exists (
    select 1 from pgflow.flows where flow_slug = 'payment_created'
  ) or not exists (
    select 1 from pgflow.flows where flow_slug = 'payment_updated'
  ) or not exists (
    select 1 from pgflow.flows where flow_slug = 'payment_deleted'
  ) then
    raise exception
      'payment_created, payment_updated, and payment_deleted must be compiled. Start their workers once before applying this migration.';
  end if;
end
$$;

create or replace function public.enqueue_payment_created()
returns trigger
language plpgsql
security definer
set search_path = public, pgflow, pg_temp
as $$
begin
  perform pgflow.start_flow(
    flow_slug => 'payment_created',
    input => jsonb_build_object(
      'orderId', new_payments.order_id,
      'companyId', new_payments.company_id
    )
  )
  from new_payments
  where new_payments.order_id is not null;

  return null;
end;
$$;

create or replace function public.enqueue_payment_updated()
returns trigger
language plpgsql
security definer
set search_path = public, pgflow, pg_temp
as $$
begin
  perform pgflow.start_flow(
    flow_slug => 'payment_updated',
    input => jsonb_build_object(
      'orderId', changed.order_id,
      'companyId', changed.company_id
    )
  )
  from (
    select n.order_id, n.company_id
    from new_payments n
    where n.order_id is not null
    union
    select o.order_id, o.company_id
    from old_payments o
    join new_payments n on n.id = o.id
    where o.order_id is not null
      and o.order_id is distinct from n.order_id
  ) changed;

  return null;
end;
$$;

create or replace function public.enqueue_payment_deleted()
returns trigger
language plpgsql
security definer
set search_path = public, pgflow, pg_temp
as $$
begin
  perform pgflow.start_flow(
    flow_slug => 'payment_deleted',
    input => jsonb_build_object(
      'orderId', old_payments.order_id,
      'companyId', old_payments.company_id
    )
  )
  from old_payments
  where old_payments.order_id is not null;

  return null;
end;
$$;

revoke all on function public.enqueue_payment_created() from public, anon, authenticated;
revoke all on function public.enqueue_payment_updated() from public, anon, authenticated;
revoke all on function public.enqueue_payment_deleted() from public, anon, authenticated;
grant execute on function public.enqueue_payment_created() to service_role;
grant execute on function public.enqueue_payment_updated() to service_role;
grant execute on function public.enqueue_payment_deleted() to service_role;

drop trigger if exists "payment-handler" on public.payment;

create trigger payment_created_enqueue
  after insert on public.payment
  referencing new table as new_payments
  for each statement
  execute function public.enqueue_payment_created();

create trigger payment_updated_enqueue
  after update on public.payment
  referencing old table as old_payments new table as new_payments
  for each statement
  execute function public.enqueue_payment_updated();

create trigger payment_deleted_enqueue
  after delete on public.payment
  referencing old table as old_payments
  for each statement
  execute function public.enqueue_payment_deleted();
