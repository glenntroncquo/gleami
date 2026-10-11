-- my_company_ids, my_location_ids, and my_memberships are security invoker.
-- company_setup has no privileges for authenticated, so reading it from those
-- RPCs fails with 42501. Established access is company.setup_status, which the
-- setup triggers keep in sync, and in-setup companies have no membership rows.

create or replace function public.my_company_ids()
returns setof uuid
language sql
stable
security invoker
set search_path = public
as $$
  select c.id
  from public.company c
  where c.setup_status = 'established'
    and c.id in (select private.company_ids_for_user());
$$;

create or replace function public.my_location_ids()
returns setof uuid
language sql
stable
security invoker
set search_path = public
as $$
  select l.id
  from public.location l
  join public.company c on c.id = l.company_id
  where c.setup_status = 'established'
    and l.id in (select private.location_ids_for_user());
$$;

create or replace function public.my_memberships()
returns table (
  source text,
  company_id uuid,
  location_id uuid,
  role_id uuid,
  role_name text,
  role_scope text,
  is_active boolean
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    'company'::text as source,
    cm.company_id,
    null::uuid as location_id,
    cm.role_id,
    r.name as role_name,
    r.scope as role_scope,
    true as is_active
  from company_membership cm
  join role r on r.id = cm.role_id
  join company c on c.id = cm.company_id
  where cm.user_id = (select auth.uid())
    and c.setup_status = 'established'
  union all
  select
    'location'::text,
    loc.company_id,
    lm.location_id,
    lm.role_id,
    r.name,
    r.scope,
    lm.is_active
  from location_membership lm
  join location loc on loc.id = lm.location_id
  join company c on c.id = loc.company_id
  join role r on r.id = lm.role_id
  where lm.user_id = (select auth.uid())
    and lm.is_active
    and c.setup_status = 'established';
$$;
