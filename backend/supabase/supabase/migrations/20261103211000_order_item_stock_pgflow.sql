-- Replace the order_item HTTP webhook with a pgflow job in the same
-- transaction as the write. Each flow must already be compiled by starting
-- its worker once. start_flow raises if a flow is missing, and that rolls
-- the order item write back.
--
-- The snapshot is stored on the run because a deleted row cannot be read
-- later. syncStock runs once: repeating it would apply the stock delta again.

do $$
begin
  if not exists (
    select 1 from pgflow.flows where flow_slug = 'order_item_created'
  ) or not exists (
    select 1 from pgflow.flows where flow_slug = 'order_item_updated'
  ) or not exists (
    select 1 from pgflow.flows where flow_slug = 'order_item_deleted'
  ) then
    raise exception
      'order_item_created, order_item_updated, and order_item_deleted must be compiled. Start their workers once before applying this migration.';
  end if;
end
$$;

create or replace function public.enqueue_order_item_created()
returns trigger
language plpgsql
security definer
set search_path = public, pgflow, pg_temp
as $$
begin
  perform pgflow.start_flow(
    flow_slug => 'order_item_created',
    input => jsonb_build_object(
      'orderItemId', new_order_items.id,
      'orderId', new_order_items.order_id,
      'companyId', new_order_items.company_id,
      'productId', new_order_items.product_id,
      'quantity', new_order_items.quantity
    )
  )
  from new_order_items;

  return null;
end;
$$;

create or replace function public.enqueue_order_item_updated()
returns trigger
language plpgsql
security definer
set search_path = public, pgflow, pg_temp
as $$
begin
  perform pgflow.start_flow(
    flow_slug => 'order_item_updated',
    input => jsonb_build_object(
      'orderItemId', n.id,
      'orderId', n.order_id,
      'companyId', n.company_id,
      'oldProductId', o.product_id,
      'oldQuantity', o.quantity,
      'newProductId', n.product_id,
      'newQuantity', n.quantity
    )
  )
  from new_order_items n
  join old_order_items o on o.id = n.id;

  return null;
end;
$$;

create or replace function public.enqueue_order_item_deleted()
returns trigger
language plpgsql
security definer
set search_path = public, pgflow, pg_temp
as $$
begin
  perform pgflow.start_flow(
    flow_slug => 'order_item_deleted',
    input => jsonb_build_object(
      'orderItemId', old_order_items.id,
      'orderId', old_order_items.order_id,
      'companyId', old_order_items.company_id,
      'productId', old_order_items.product_id,
      'quantity', old_order_items.quantity
    )
  )
  from old_order_items;

  return null;
end;
$$;

revoke all on function public.enqueue_order_item_created() from public, anon, authenticated;
revoke all on function public.enqueue_order_item_updated() from public, anon, authenticated;
revoke all on function public.enqueue_order_item_deleted() from public, anon, authenticated;
grant execute on function public.enqueue_order_item_created() to service_role;
grant execute on function public.enqueue_order_item_updated() to service_role;
grant execute on function public.enqueue_order_item_deleted() to service_role;

drop trigger if exists "order-item-handler" on public.order_item;

create trigger order_item_created_enqueue
  after insert on public.order_item
  referencing new table as new_order_items
  for each statement
  execute function public.enqueue_order_item_created();

create trigger order_item_updated_enqueue
  after update on public.order_item
  referencing old table as old_order_items new table as new_order_items
  for each statement
  execute function public.enqueue_order_item_updated();

create trigger order_item_deleted_enqueue
  after delete on public.order_item
  referencing old table as old_order_items
  for each statement
  execute function public.enqueue_order_item_deleted();
