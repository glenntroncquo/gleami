-- One permission per screen. locations:manage is folded into settings:manage.
-- The system location role "staff" is removed; those memberships become stylist.

insert into public.permission (key) values
  ('dashboard:read'),
  ('calendar:manage'),
  ('treatments:manage'),
  ('orders:manage'),
  ('products:manage'),
  ('marketing:manage')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Storage and location helpers
-- ---------------------------------------------------------------------------
create or replace function private.company_storage_write_allowed(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with parsed as (
    select
      case
        when split_part(object_name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then split_part(object_name, '/', 1)::uuid
        else null::uuid
      end as company_id,
      split_part(object_name, '/', 2) as scope
  )
  select case
    when (select company_id from parsed) is null then false
    when (select scope from parsed) = 'profile' then
      private.has_permission_for_company('staff:manage', (select company_id from parsed))
      or private.has_permission_for_company('calendar:manage', (select company_id from parsed))
    when (select scope from parsed) = 'appointments' then
      private.has_permission_for_company('calendar:manage', (select company_id from parsed))
    when (select scope from parsed) = 'treatment_images' then
      private.has_permission_for_company('treatments:manage', (select company_id from parsed))
    when (select scope from parsed) in ('branding', 'illustrations') then
      private.has_permission_for_company('settings:manage', (select company_id from parsed))
    else false
  end
$$;

revoke all on function private.company_storage_write_allowed(text) from public, anon;
grant execute on function private.company_storage_write_allowed(text) to authenticated;

create or replace function private.can_manage_locations(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.has_company_permission('settings:manage', p_company_id);
$$;

-- ---------------------------------------------------------------------------
-- RLS: settings owns locations and marketplace; POS and orders share writes
-- ---------------------------------------------------------------------------
drop policy if exists "location insert (permission)" on public.location;
drop policy if exists "location update (permission)" on public.location;
drop policy if exists "location delete (permission)" on public.location;

create policy "location insert (permission)"
  on public.location
  for insert
  to authenticated
  with check (private.has_company_permission('settings:manage', company_id));

create policy "location update (permission)"
  on public.location
  for update
  to authenticated
  using (private.has_company_permission('settings:manage', company_id))
  with check (private.has_company_permission('settings:manage', company_id));

create policy "location delete (permission)"
  on public.location
  for delete
  to authenticated
  using (private.has_company_permission('settings:manage', company_id));

drop policy if exists "client_notes select (clients:read)" on public.client_notes;
drop policy if exists "client_notes select (clients:manage)" on public.client_notes;
create policy "client_notes select (clients:manage)"
  on public.client_notes for select
  to authenticated
  using (private.has_permission_for_company('clients:manage', company_id));

drop policy if exists "order insert (permission)" on public."order";
create policy "order insert (permission)"
  on public."order" for insert
  to authenticated
  with check (
    private.has_permission('pos:manage', location_id)
    or private.has_permission('orders:manage', location_id)
  );

drop policy if exists "order update (permission)" on public."order";
create policy "order update (permission)"
  on public."order" for update
  to authenticated
  using (
    private.has_permission('pos:manage', location_id)
    or private.has_permission('orders:manage', location_id)
  )
  with check (
    private.has_permission('pos:manage', location_id)
    or private.has_permission('orders:manage', location_id)
  );

drop policy if exists "order_item insert (permission)" on public.order_item;
create policy "order_item insert (permission)"
  on public.order_item for insert
  to authenticated
  with check (
    private.has_permission('pos:manage', location_id)
    or private.has_permission('orders:manage', location_id)
  );

drop policy if exists "order_item update (permission)" on public.order_item;
create policy "order_item update (permission)"
  on public.order_item for update
  to authenticated
  using (
    private.has_permission('pos:manage', location_id)
    or private.has_permission('orders:manage', location_id)
  )
  with check (
    private.has_permission('pos:manage', location_id)
    or private.has_permission('orders:manage', location_id)
  );

drop policy if exists "payment insert (permission)" on public.payment;
create policy "payment insert (permission)"
  on public.payment for insert
  to authenticated
  with check (
    private.has_permission('pos:manage', location_id)
    or private.has_permission('orders:manage', location_id)
  );

drop policy if exists "payment update (permission)" on public.payment;
create policy "payment update (permission)"
  on public.payment for update
  to authenticated
  using (
    private.has_permission('pos:manage', location_id)
    or private.has_permission('orders:manage', location_id)
  )
  with check (
    private.has_permission('pos:manage', location_id)
    or private.has_permission('orders:manage', location_id)
  );

drop policy if exists "marketplace_media select (owner)" on public.marketplace_media;
create policy "marketplace_media select (owner)"
  on public.marketplace_media for select
  to authenticated
  using (private.has_company_permission('settings:manage', company_id));

drop policy if exists "marketplace_media insert (owner)" on public.marketplace_media;
create policy "marketplace_media insert (owner)"
  on public.marketplace_media for insert
  to authenticated
  with check (
    private.has_company_permission('settings:manage', company_id)
    and exists (
      select 1
      from public.location l
      where l.id = location_id
        and l.company_id = marketplace_media.company_id
    )
  );

drop policy if exists "marketplace_media update (owner)" on public.marketplace_media;
create policy "marketplace_media update (owner)"
  on public.marketplace_media for update
  to authenticated
  using (private.has_company_permission('settings:manage', company_id))
  with check (
    private.has_company_permission('settings:manage', company_id)
    and exists (
      select 1
      from public.location l
      where l.id = location_id
        and l.company_id = marketplace_media.company_id
    )
  );

drop policy if exists "marketplace_media delete (owner)" on public.marketplace_media;
create policy "marketplace_media delete (owner)"
  on public.marketplace_media for delete
  to authenticated
  using (private.has_company_permission('settings:manage', company_id));

drop policy if exists "marketplace objects insert (company prefix)" on storage.objects;
create policy "marketplace objects insert (company prefix)"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'marketplace'
    and private.has_company_permission(
      'settings:manage',
      case
        when split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then split_part(name, '/', 1)::uuid
        else null
      end
    )
  );

drop policy if exists "marketplace objects update (company prefix)" on storage.objects;
create policy "marketplace objects update (company prefix)"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'marketplace'
    and private.has_company_permission(
      'settings:manage',
      case
        when split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then split_part(name, '/', 1)::uuid
        else null
      end
    )
  )
  with check (
    bucket_id = 'marketplace'
    and private.has_company_permission(
      'settings:manage',
      case
        when split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then split_part(name, '/', 1)::uuid
        else null
      end
    )
  );

drop policy if exists "marketplace objects delete (company prefix)" on storage.objects;
create policy "marketplace objects delete (company prefix)"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'marketplace'
    and private.has_company_permission(
      'settings:manage',
      case
        when split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then split_part(name, '/', 1)::uuid
        else null
      end
    )
  );

do $$
begin
  if to_regclass('public.service_marketplace_category') is not null then
    execute 'drop policy if exists "service_marketplace_category insert (catalog:manage)" on public.service_marketplace_category';
    execute 'drop policy if exists "service_marketplace_category insert (treatments:manage)" on public.service_marketplace_category';
    execute $pol$
      create policy "service_marketplace_category insert (treatments:manage)"
        on public.service_marketplace_category for insert
        to authenticated
        with check (
          exists (
            select 1
            from public.service s
            where s.id = service_id
              and private.has_permission_for_company('treatments:manage', s.company_id)
          )
        )
    $pol$;
    execute 'drop policy if exists "service_marketplace_category delete (catalog:manage)" on public.service_marketplace_category';
    execute 'drop policy if exists "service_marketplace_category delete (treatments:manage)" on public.service_marketplace_category';
    execute $pol$
      create policy "service_marketplace_category delete (treatments:manage)"
        on public.service_marketplace_category for delete
        to authenticated
        using (
          exists (
            select 1
            from public.service s
            where s.id = service_id
              and private.has_permission_for_company('treatments:manage', s.company_id)
          )
        )
    $pol$;
  end if;

  if to_regclass('public.location_marketplace_category') is not null then
    execute 'drop policy if exists "location_marketplace_category insert (listing)" on public.location_marketplace_category';
    execute $pol$
      create policy "location_marketplace_category insert (listing)"
        on public.location_marketplace_category for insert
        to authenticated
        with check (
          exists (
            select 1
            from public.location l
            where l.id = location_id
              and private.has_permission_for_company('settings:manage', l.company_id)
          )
        )
    $pol$;
    execute 'drop policy if exists "location_marketplace_category delete (listing)" on public.location_marketplace_category';
    execute $pol$
      create policy "location_marketplace_category delete (listing)"
        on public.location_marketplace_category for delete
        to authenticated
        using (
          exists (
            select 1
            from public.location l
            where l.id = location_id
              and private.has_permission_for_company('settings:manage', l.company_id)
          )
        )
    $pol$;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Move staff-role memberships onto stylist, then replace system grants
-- ---------------------------------------------------------------------------
update public.location_membership lm
set role_id = stylist.id
from public.role staff
join public.role stylist
  on stylist.is_system and stylist.name = 'stylist'
where staff.is_system
  and staff.name = 'staff'
  and lm.role_id = staff.id;

update public.invitation i
set role_id = stylist.id
from public.role staff
join public.role stylist
  on stylist.is_system and stylist.name = 'stylist'
where staff.is_system
  and staff.name = 'staff'
  and i.role_id = staff.id;

delete from public.role
where is_system and name = 'staff';

delete from public.role_permission rp
using public.role r
where rp.role_id = r.id
  and r.is_system
  and r.name in ('owner', 'admin', 'manager', 'stylist', 'freelancer');

insert into public.role_permission (role_id, permission_key)
select r.id, p.key
from public.role r
cross join public.permission p
where r.is_system
  and r.name = 'owner'
  and p.key in (
    'dashboard:read',
    'calendar:manage',
    'staff:manage',
    'clients:manage',
    'treatments:manage',
    'pos:manage',
    'orders:manage',
    'products:manage',
    'billing:manage',
    'marketing:manage',
    'settings:manage'
  );

insert into public.role_permission (role_id, permission_key)
select r.id, p.key
from public.role r
cross join public.permission p
where r.is_system
  and r.name = 'admin'
  and p.key in (
    'dashboard:read',
    'calendar:manage',
    'staff:manage',
    'clients:manage',
    'treatments:manage',
    'pos:manage',
    'orders:manage',
    'products:manage',
    'marketing:manage',
    'settings:manage'
  );

insert into public.role_permission (role_id, permission_key)
select r.id, p.key
from public.role r
cross join public.permission p
where r.is_system
  and r.name = 'manager'
  and p.key in (
    'dashboard:read',
    'calendar:manage',
    'staff:manage',
    'clients:manage',
    'treatments:manage',
    'pos:manage',
    'orders:manage',
    'products:manage',
    'marketing:manage'
  );

insert into public.role_permission (role_id, permission_key)
select r.id, p.key
from public.role r
cross join public.permission p
where r.is_system
  and r.name = 'stylist'
  and p.key in (
    'calendar:manage',
    'staff:manage',
    'clients:manage',
    'treatments:manage',
    'pos:manage',
    'products:manage',
    'marketing:manage'
  );

insert into public.role_permission (role_id, permission_key)
select r.id, p.key
from public.role r
cross join public.permission p
where r.is_system
  and r.name = 'freelancer'
  and p.key in (
    'calendar:manage',
    'staff:manage',
    'pos:manage',
    'products:manage'
  );

delete from public.permission
where key in (
  'calendar:read',
  'calendar:write',
  'catalog:manage',
  'clients:read',
  'invites:manage',
  'locations:read',
  'locations:manage',
  'pos:read',
  'pos:refund',
  'schedule:manage'
);

-- ---------------------------------------------------------------------------
-- Policies the first pass left on retired keys. The check below rejects
-- the migration while any of these names remain.
-- calendar:write -> calendar:manage
-- catalog:manage on the treatment catalog -> treatments:manage
-- catalog:manage on products -> products:manage
-- schedule:manage and invites:manage -> staff:manage
-- locations:manage on location read -> settings:manage
-- ---------------------------------------------------------------------------
drop policy if exists "appointment insert (permission)" on public.appointment;
create policy "appointment insert (permission)"
  on public.appointment for insert to authenticated
  with check (private.has_permission('calendar:manage', location_id));

drop policy if exists "appointment update (permission)" on public.appointment;
create policy "appointment update (permission)"
  on public.appointment for update to authenticated
  using (private.has_permission('calendar:manage', location_id))
  with check (private.has_permission('calendar:manage', location_id));

drop policy if exists "appointment delete (permission)" on public.appointment;
create policy "appointment delete (permission)"
  on public.appointment for delete to authenticated
  using (private.has_permission('calendar:manage', location_id));

drop policy if exists "appointment_segment insert (permission)" on public.appointment_segment;
create policy "appointment_segment insert (permission)"
  on public.appointment_segment for insert to authenticated
  with check (private.has_permission('calendar:manage', location_id));

drop policy if exists "appointment_segment update (permission)" on public.appointment_segment;
create policy "appointment_segment update (permission)"
  on public.appointment_segment for update to authenticated
  using (private.has_permission('calendar:manage', location_id))
  with check (private.has_permission('calendar:manage', location_id));

drop policy if exists "appointment_segment delete (permission)" on public.appointment_segment;
create policy "appointment_segment delete (permission)"
  on public.appointment_segment for delete to authenticated
  using (private.has_permission('calendar:manage', location_id));

drop policy if exists "appointment_segment_phase insert (permission)" on public.appointment_segment_phase;
create policy "appointment_segment_phase insert (permission)"
  on public.appointment_segment_phase for insert to authenticated
  with check (private.has_permission('calendar:manage', location_id));

drop policy if exists "appointment_segment_phase update (permission)" on public.appointment_segment_phase;
create policy "appointment_segment_phase update (permission)"
  on public.appointment_segment_phase for update to authenticated
  using (private.has_permission('calendar:manage', location_id))
  with check (private.has_permission('calendar:manage', location_id));

drop policy if exists "appointment_segment_phase delete (permission)" on public.appointment_segment_phase;
create policy "appointment_segment_phase delete (permission)"
  on public.appointment_segment_phase for delete to authenticated
  using (private.has_permission('calendar:manage', location_id));

drop policy if exists "company_membership insert (permission)" on public.company_membership;
create policy "company_membership insert (permission)"
  on public.company_membership for insert to authenticated
  with check (private.has_permission_for_company('staff:manage', company_id));

drop policy if exists "company_membership update (permission)" on public.company_membership;
create policy "company_membership update (permission)"
  on public.company_membership for update to authenticated
  using (private.has_permission_for_company('staff:manage', company_id))
  with check (private.has_permission_for_company('staff:manage', company_id));

drop policy if exists "company_membership delete (permission)" on public.company_membership;
create policy "company_membership delete (permission)"
  on public.company_membership for delete to authenticated
  using (private.has_permission_for_company('staff:manage', company_id));

drop policy if exists "location_membership insert (permission)" on public.location_membership;
create policy "location_membership insert (permission)"
  on public.location_membership for insert to authenticated
  with check (
    private.has_permission('staff:manage', location_id)
    or private.has_permission_for_company('staff:manage', (
      select loc.company_id from public.location loc where loc.id = location_id
    ))
  );

drop policy if exists "location_membership update (permission)" on public.location_membership;
create policy "location_membership update (permission)"
  on public.location_membership for update to authenticated
  using (
    private.has_permission('staff:manage', location_id)
    or private.has_permission_for_company('staff:manage', (
      select loc.company_id from public.location loc where loc.id = location_id
    ))
  )
  with check (
    private.has_permission('staff:manage', location_id)
    or private.has_permission_for_company('staff:manage', (
      select loc.company_id from public.location loc where loc.id = location_id
    ))
  );

drop policy if exists "location_membership delete (permission)" on public.location_membership;
create policy "location_membership delete (permission)"
  on public.location_membership for delete to authenticated
  using (
    private.has_permission('staff:manage', location_id)
    or private.has_permission_for_company('staff:manage', (
      select loc.company_id from public.location loc where loc.id = location_id
    ))
  );

drop policy if exists "location select (membership)" on public.location;
create policy "location select (membership)"
  on public.location for select to authenticated
  using (
    id in (select private.location_ids_for_user())
    or private.has_company_permission('settings:manage', company_id)
  );

drop policy if exists "deposit_policy insert (permission)" on public.deposit_policy;
create policy "deposit_policy insert (permission)"
  on public.deposit_policy for insert to authenticated
  with check (private.has_permission_for_company('treatments:manage', company_id));

drop policy if exists "deposit_policy update (permission)" on public.deposit_policy;
create policy "deposit_policy update (permission)"
  on public.deposit_policy for update to authenticated
  using (private.has_permission_for_company('treatments:manage', company_id))
  with check (private.has_permission_for_company('treatments:manage', company_id));

drop policy if exists "deposit_policy delete (permission)" on public.deposit_policy;
create policy "deposit_policy delete (permission)"
  on public.deposit_policy for delete to authenticated
  using (private.has_permission_for_company('treatments:manage', company_id));

drop policy if exists "service insert (permission)" on public.service;
create policy "service insert (permission)"
  on public.service for insert to authenticated
  with check (private.has_permission_for_company('treatments:manage', company_id));

drop policy if exists "service update (permission)" on public.service;
create policy "service update (permission)"
  on public.service for update to authenticated
  using (private.has_permission_for_company('treatments:manage', company_id))
  with check (private.has_permission_for_company('treatments:manage', company_id));

drop policy if exists "service delete (permission)" on public.service;
create policy "service delete (permission)"
  on public.service for delete to authenticated
  using (private.has_permission_for_company('treatments:manage', company_id));

drop policy if exists "service_variant insert (permission)" on public.service_variant;
create policy "service_variant insert (permission)"
  on public.service_variant for insert to authenticated
  with check (private.has_permission_for_company('treatments:manage', company_id));

drop policy if exists "service_variant update (permission)" on public.service_variant;
create policy "service_variant update (permission)"
  on public.service_variant for update to authenticated
  using (private.has_permission_for_company('treatments:manage', company_id))
  with check (private.has_permission_for_company('treatments:manage', company_id));

drop policy if exists "service_variant delete (permission)" on public.service_variant;
create policy "service_variant delete (permission)"
  on public.service_variant for delete to authenticated
  using (private.has_permission_for_company('treatments:manage', company_id));

drop policy if exists "service_variant_phase insert (permission)" on public.service_variant_phase;
create policy "service_variant_phase insert (permission)"
  on public.service_variant_phase for insert to authenticated
  with check (private.has_permission_for_company('treatments:manage', company_id));

drop policy if exists "service_variant_phase update (permission)" on public.service_variant_phase;
create policy "service_variant_phase update (permission)"
  on public.service_variant_phase for update to authenticated
  using (private.has_permission_for_company('treatments:manage', company_id))
  with check (private.has_permission_for_company('treatments:manage', company_id));

drop policy if exists "service_variant_phase delete (permission)" on public.service_variant_phase;
create policy "service_variant_phase delete (permission)"
  on public.service_variant_phase for delete to authenticated
  using (private.has_permission_for_company('treatments:manage', company_id));

drop policy if exists "location_service insert (permission)" on public.location_service;
create policy "location_service insert (permission)"
  on public.location_service for insert to authenticated
  with check (private.has_permission('treatments:manage', location_id));

drop policy if exists "location_service update (permission)" on public.location_service;
create policy "location_service update (permission)"
  on public.location_service for update to authenticated
  using (private.has_permission('treatments:manage', location_id))
  with check (private.has_permission('treatments:manage', location_id));

drop policy if exists "location_service delete (permission)" on public.location_service;
create policy "location_service delete (permission)"
  on public.location_service for delete to authenticated
  using (private.has_permission('treatments:manage', location_id));

drop policy if exists "staff_service insert (permission)" on public.staff_service;
create policy "staff_service insert (permission)"
  on public.staff_service for insert to authenticated
  with check (private.has_permission('treatments:manage', location_id));

drop policy if exists "staff_service update (permission)" on public.staff_service;
create policy "staff_service update (permission)"
  on public.staff_service for update to authenticated
  using (private.has_permission('treatments:manage', location_id))
  with check (private.has_permission('treatments:manage', location_id));

drop policy if exists "staff_service delete (permission)" on public.staff_service;
create policy "staff_service delete (permission)"
  on public.staff_service for delete to authenticated
  using (private.has_permission('treatments:manage', location_id));

drop policy if exists "staff_service_variant insert (permission)" on public.staff_service_variant;
create policy "staff_service_variant insert (permission)"
  on public.staff_service_variant for insert to authenticated
  with check (private.has_permission('treatments:manage', location_id));

drop policy if exists "staff_service_variant update (permission)" on public.staff_service_variant;
create policy "staff_service_variant update (permission)"
  on public.staff_service_variant for update to authenticated
  using (private.has_permission('treatments:manage', location_id))
  with check (private.has_permission('treatments:manage', location_id));

drop policy if exists "staff_service_variant delete (permission)" on public.staff_service_variant;
create policy "staff_service_variant delete (permission)"
  on public.staff_service_variant for delete to authenticated
  using (private.has_permission('treatments:manage', location_id));

drop policy if exists "product insert (permission)" on public.product;
create policy "product insert (permission)"
  on public.product for insert to authenticated
  with check (private.has_permission_for_company('products:manage', company_id));

drop policy if exists "product update (permission)" on public.product;
create policy "product update (permission)"
  on public.product for update to authenticated
  using (private.has_permission_for_company('products:manage', company_id))
  with check (private.has_permission_for_company('products:manage', company_id));

drop policy if exists "product delete (permission)" on public.product;
create policy "product delete (permission)"
  on public.product for delete to authenticated
  using (private.has_permission_for_company('products:manage', company_id));

drop policy if exists "product_category insert (permission)" on public.product_category;
create policy "product_category insert (permission)"
  on public.product_category for insert to authenticated
  with check (private.has_permission_for_company('products:manage', company_id));

drop policy if exists "product_category update (permission)" on public.product_category;
create policy "product_category update (permission)"
  on public.product_category for update to authenticated
  using (private.has_permission_for_company('products:manage', company_id))
  with check (private.has_permission_for_company('products:manage', company_id));

drop policy if exists "product_category delete (permission)" on public.product_category;
create policy "product_category delete (permission)"
  on public.product_category for delete to authenticated
  using (private.has_permission_for_company('products:manage', company_id));

drop policy if exists "product_line insert (permission)" on public.product_line;
create policy "product_line insert (permission)"
  on public.product_line for insert to authenticated
  with check (private.has_permission_for_company('products:manage', company_id));

drop policy if exists "product_line update (permission)" on public.product_line;
create policy "product_line update (permission)"
  on public.product_line for update to authenticated
  using (private.has_permission_for_company('products:manage', company_id))
  with check (private.has_permission_for_company('products:manage', company_id));

drop policy if exists "product_line delete (permission)" on public.product_line;
create policy "product_line delete (permission)"
  on public.product_line for delete to authenticated
  using (private.has_permission_for_company('products:manage', company_id));

drop policy if exists "staff_schedule_rule insert (permission)" on public.staff_schedule_rule;
create policy "staff_schedule_rule insert (permission)"
  on public.staff_schedule_rule for insert to authenticated
  with check (private.has_permission('staff:manage', location_id));

drop policy if exists "staff_schedule_rule update (permission)" on public.staff_schedule_rule;
create policy "staff_schedule_rule update (permission)"
  on public.staff_schedule_rule for update to authenticated
  using (private.has_permission('staff:manage', location_id))
  with check (private.has_permission('staff:manage', location_id));

drop policy if exists "staff_schedule_rule delete (permission)" on public.staff_schedule_rule;
create policy "staff_schedule_rule delete (permission)"
  on public.staff_schedule_rule for delete to authenticated
  using (private.has_permission('staff:manage', location_id));

drop policy if exists "staff_schedule_exception insert (permission)" on public.staff_schedule_exception;
create policy "staff_schedule_exception insert (permission)"
  on public.staff_schedule_exception for insert to authenticated
  with check (private.has_permission('staff:manage', location_id));

drop policy if exists "staff_schedule_exception update (permission)" on public.staff_schedule_exception;
create policy "staff_schedule_exception update (permission)"
  on public.staff_schedule_exception for update to authenticated
  using (private.has_permission('staff:manage', location_id))
  with check (private.has_permission('staff:manage', location_id));

drop policy if exists "staff_schedule_exception delete (permission)" on public.staff_schedule_exception;
create policy "staff_schedule_exception delete (permission)"
  on public.staff_schedule_exception for delete to authenticated
  using (private.has_permission('staff:manage', location_id));

-- ---------------------------------------------------------------------------
-- Apply-time verification
-- ---------------------------------------------------------------------------
do $$
declare
  stale text;
begin
  if exists (
    select 1 from public.role
    where is_system and name = 'staff'
  ) then
    raise exception 'screen permissions: staff role still present';
  end if;

  if exists (
    select 1 from public.permission
    where key in (
      'calendar:read', 'calendar:write', 'catalog:manage', 'clients:read',
      'invites:manage', 'locations:read', 'locations:manage', 'pos:read',
      'pos:refund', 'schedule:manage'
    )
  ) then
    raise exception 'screen permissions: retired permission key still present';
  end if;

  if (
    select count(*)
    from public.role_permission rp
    join public.role r on r.id = rp.role_id
    where r.is_system and r.name = 'stylist'
  ) <> 7 then
    raise exception 'screen permissions: stylist grant count';
  end if;

  if (
    select count(*)
    from public.role_permission rp
    join public.role r on r.id = rp.role_id
    where r.is_system and r.name = 'freelancer'
  ) <> 4 then
    raise exception 'screen permissions: freelancer grant count';
  end if;

  if exists (
    select 1
    from public.role r
    join public.role_permission rp on rp.role_id = r.id
    where r.is_system and r.name = 'admin' and rp.permission_key = 'billing:manage'
  ) then
    raise exception 'screen permissions: admin must not hold billing:manage';
  end if;

  select string_agg(c.relname || '.' || p.polname, ', ')
    into stale
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  where coalesce(pg_get_expr(p.polqual, p.polrelid), '') ~ 'locations:manage|catalog:manage|calendar:write|clients:read|pos:refund|pos:read|invites:manage|schedule:manage|calendar:read|locations:read'
     or coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') ~ 'locations:manage|catalog:manage|calendar:write|clients:read|pos:refund|pos:read|invites:manage|schedule:manage|calendar:read|locations:read';

  if stale is not null then
    raise exception 'screen permissions: policy still names a retired key: %', stale;
  end if;
end $$;
