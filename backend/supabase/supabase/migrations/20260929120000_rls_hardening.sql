-- RLS hardening (audit follow-ups):
--   * company:            ALL-for-membership split into SELECT (membership) +
--                         UPDATE (settings:manage). Members can no longer
--                         modify or delete the company itself.
--   * subscriptions:      ALL-for-membership -> SELECT-only for members.
--                         Mutations come from Stripe/backend (service role).
--   * company_integrations: SELECT tightened from any membership to
--                         settings:manage — the table holds integration
--                         secrets (api_key, api_password, config).
--   * client_notes:       SELECT tightened from any membership to
--                         clients:read.
--   * order/order_item:   INSERT/UPDATE now require pos:manage (was pos:read).
--   * payment:            INSERT/UPDATE now require pos:manage or pos:refund
--                         (was pos:read).
--   * staff/stylist system roles are granted pos:manage so the POS checkout
--                 (which writes payment/order rows directly from the app)
--                 keeps working for the people who run the register.
--   * service_marketplace_category: public SELECT restricted to services
--                         flagged is_marketplace_visible (was unconditional).
--
-- M1 (anon location reads include unlisted salons) is deliberately NOT
-- applied: the public booking widget depends on anon location reads for
-- direct/embedded booking links, and 4 of 6 live locations are unlisted.
-- Product decision 2026-09-29: is_listed governs marketplace visibility,
-- not the salon's own booking surface.

-- ---------------------------------------------------------------------------
-- company
-- ---------------------------------------------------------------------------
drop policy if exists "company all (membership)" on public.company;

create policy "company select (membership)"
  on public.company for select
  to authenticated
  using (id in (select private.company_ids_for_user()));

create policy "company update (settings:manage)"
  on public.company for update
  to authenticated
  using (private.has_permission_for_company('settings:manage', id))
  with check (private.has_permission_for_company('settings:manage', id));

-- No INSERT/DELETE policies for authenticated: companies are created by the
-- registration edge function and deleted by backend operations (service role).

-- ---------------------------------------------------------------------------
-- subscriptions
-- ---------------------------------------------------------------------------
drop policy if exists "subscriptions all (membership)" on public.subscriptions;

create policy "subscriptions select (membership)"
  on public.subscriptions for select
  to authenticated
  using (company_id in (select private.company_ids_for_user()));

-- No write policies for authenticated: billing state changes come from
-- Stripe webhooks / backend flows acting as the service role.

-- ---------------------------------------------------------------------------
-- company_integrations (holds integration secrets)
-- ---------------------------------------------------------------------------
drop policy if exists "company_integrations select (membership)" on public.company_integrations;

create policy "company_integrations select (settings:manage)"
  on public.company_integrations for select
  to authenticated
  using (private.has_permission_for_company('settings:manage', company_id));

-- ---------------------------------------------------------------------------
-- client_notes
-- ---------------------------------------------------------------------------
drop policy if exists "client_notes select (membership)" on public.client_notes;

create policy "client_notes select (clients:read)"
  on public.client_notes for select
  to authenticated
  using (private.has_permission_for_company('clients:read', company_id));

-- ---------------------------------------------------------------------------
-- POS: pos:read becomes read-only
-- ---------------------------------------------------------------------------
drop policy if exists "order insert (permission)" on public."order";
create policy "order insert (permission)"
  on public."order" for insert
  to authenticated
  with check (private.has_permission('pos:manage', location_id));

drop policy if exists "order update (permission)" on public."order";
create policy "order update (permission)"
  on public."order" for update
  to authenticated
  using (private.has_permission('pos:manage', location_id))
  with check (private.has_permission('pos:manage', location_id));

drop policy if exists "order_item insert (permission)" on public.order_item;
create policy "order_item insert (permission)"
  on public.order_item for insert
  to authenticated
  with check (private.has_permission('pos:manage', location_id));

drop policy if exists "order_item update (permission)" on public.order_item;
create policy "order_item update (permission)"
  on public.order_item for update
  to authenticated
  using (private.has_permission('pos:manage', location_id))
  with check (private.has_permission('pos:manage', location_id));

drop policy if exists "payment insert (permission)" on public.payment;
create policy "payment insert (permission)"
  on public.payment for insert
  to authenticated
  with check (
    private.has_permission('pos:manage', location_id)
    or private.has_permission('pos:refund', location_id)
  );

drop policy if exists "payment update (permission)" on public.payment;
create policy "payment update (permission)"
  on public.payment for update
  to authenticated
  using (
    private.has_permission('pos:manage', location_id)
    or private.has_permission('pos:refund', location_id)
  )
  with check (
    private.has_permission('pos:manage', location_id)
    or private.has_permission('pos:refund', location_id)
  );

-- Staff and stylists run the register; give their system roles pos:manage so
-- the direct-write POS checkout keeps working under the tightened policies.
insert into public.role_permission (role_id, permission_key)
select r.id, 'pos:manage'
from public.role r
where r.is_system and r.name in ('staff', 'stylist')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- service_marketplace_category: no more unconditional public read
-- ---------------------------------------------------------------------------
drop policy if exists "service_marketplace_category select (public)" on public.service_marketplace_category;

create policy "service_marketplace_category select (marketplace visible)"
  on public.service_marketplace_category for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.service s
      where s.id = service_marketplace_category.service_id
        and s.is_marketplace_visible = true
    )
  );

-- ---------------------------------------------------------------------------
-- Apply-time verification
-- ---------------------------------------------------------------------------
do $$
begin
  -- company / subscriptions: no ALL policies left
  if exists (
    select 1 from pg_policy p join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname in ('company', 'subscriptions')
      and p.polcmd = '*'
  ) then
    raise exception 'rls hardening: ALL policy still present on company/subscriptions';
  end if;

  -- pos:read must no longer appear in any write predicate on the POS tables
  if exists (
    select 1 from pg_policy p join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname in ('order', 'order_item', 'payment')
      and p.polcmd in ('a', 'w')
      and (
        coalesce(pg_get_expr(p.polqual, p.polrelid), '') like '%pos:read%'
        or coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') like '%pos:read%'
      )
  ) then
    raise exception 'rls hardening: pos:read still grants writes';
  end if;

  -- staff/stylist must hold pos:manage so POS checkout keeps working
  if exists (
    select 1 from public.role r
    where r.is_system and r.name in ('staff', 'stylist')
      and not exists (
        select 1 from public.role_permission rp
        where rp.role_id = r.id and rp.permission_key = 'pos:manage'
      )
  ) then
    raise exception 'rls hardening: staff/stylist missing pos:manage grant';
  end if;

  -- secret-bearing table must require settings:manage for reads
  if not exists (
    select 1 from pg_policy p join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'company_integrations'
      and p.polcmd = 'r'
      and coalesce(pg_get_expr(p.polqual, p.polrelid), '') like '%settings:manage%'
  ) then
    raise exception 'rls hardening: company_integrations select policy missing';
  end if;
end $$;
