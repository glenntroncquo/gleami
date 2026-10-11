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
