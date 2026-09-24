-- Proves marketplace RLS on a stub where private.has_* read private.test_company_grant
-- and auth.uid() reads request.jwt.claim.sub. Stand-in grants below are NOT
-- part of the production migration. On SalonFlow, authenticated already has
-- SELECT on location/service through existing policies; this script grants
-- SELECT so the marketplace WITH CHECK subqueries can see the row and the
-- permission helper is what allows or denies the write.

create table if not exists private.test_company_grant (
  user_id uuid not null,
  company_id uuid not null,
  perm text not null,
  primary key (user_id, company_id, perm)
);

create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create or replace function private.has_company_permission(perm text, company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from private.test_company_grant g
    where g.user_id = auth.uid()
      and g.company_id = $2
      and g.perm = $1
  );
$$;

create or replace function private.has_permission_for_company(perm text, company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from private.test_company_grant g
    where g.user_id = auth.uid()
      and g.company_id = $2
      and g.perm = $1
  );
$$;

grant select on public.location to anon, authenticated;
grant select on public.service to anon, authenticated;

insert into public.company (id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');

insert into auth.users (id) values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222');

insert into private.test_company_grant (user_id, company_id, perm) values
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'locations:manage'),
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'catalog:manage'),
  ('22222222-2222-4222-8222-222222222222', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'locations:manage'),
  ('22222222-2222-4222-8222-222222222222', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'catalog:manage');

insert into public.location (id, company_id, name, slug, is_listed, is_active, geo_location) values
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'Listed',
    'listed-shop',
    true,
    true,
    st_setsrid(st_makepoint(4.4, 51.2), 4326)::public.geography
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'Hidden',
    'hidden-shop',
    false,
    true,
    st_setsrid(st_makepoint(4.4, 51.2), 4326)::public.geography
  );

insert into public.service (id, company_id, name, is_active, is_deleted) values
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Knippen', true, false);

insert into public.marketplace_search_location (
  location_id, company_id, name, slug, timezone, coordinates, search_text
) values (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'Listed',
  'listed-shop',
  'Europe/Brussels',
  st_setsrid(st_makepoint(4.4, 51.2), 4326)::public.geography,
  'listed antwerpen'
);

insert into public.marketplace_media (location_id, company_id, path) values
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/listed.jpg'
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/hidden.jpg'
  );

-- Anon sees the listed projection row and not a row for the unlisted location.
do $$
declare
  n int;
begin
  perform set_config('role', 'anon', true);
  select count(*) into n from public.marketplace_search_location;
  if n <> 1 then
    raise exception 'anon projection count %, expected 1', n;
  end if;
  select count(*) into n
  from public.marketplace_search_location
  where location_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  if n <> 0 then
    raise exception 'anon saw a projection row for the unlisted location';
  end if;

  select count(*) into n from public.marketplace_media;
  if n <> 1 then
    raise exception 'anon media count %, expected 1 listed image', n;
  end if;

  select count(*) into n from public.marketplace_category where is_active;
  if n <> 11 then
    raise exception 'anon category count %, expected 11', n;
  end if;

  select count(*) into n from public.marketplace_location_like;
  if n <> 0 then
    raise exception 'anon should see no likes';
  end if;
end
$$;

-- Anon cannot write any of the five tables.
do $$
begin
  perform set_config('role', 'anon', true);

  begin
    insert into public.marketplace_search_location (
      location_id, company_id, name, slug, timezone, coordinates
    ) values (
      'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'x', 'x', 'Europe/Brussels',
      st_setsrid(st_makepoint(4, 51), 4326)::public.geography
    );
    raise exception 'anon inserted a projection row';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.marketplace_category (id, name, slug, sort_order)
    values ('01900000-0000-4000-8000-0000000000ff', 'Extra', 'extra', 99);
    raise exception 'anon inserted a category';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.service_marketplace_category (service_id, marketplace_category_id)
    values (
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      '01900000-0000-4000-8000-000000000001'
    );
    raise exception 'anon inserted a category mapping';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.marketplace_media (location_id, company_id, path)
    values (
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/anon.jpg'
    );
    raise exception 'anon inserted media';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.marketplace_location_like (location_id, user_id)
    values (
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      '11111111-1111-4111-8111-111111111111'
    );
    raise exception 'anon inserted a like';
  exception when insufficient_privilege then null;
  end;
end
$$;

-- Authenticated cannot write the projection or categories.
-- UPDATE/DELETE with no matching policy changes 0 rows and does not raise.
do $$
declare
  n int;
begin
  perform set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
  perform set_config('role', 'authenticated', true);

  update public.marketplace_search_location set name = 'hacked';
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'authenticated updated % projection rows', n;
  end if;

  delete from public.marketplace_category where slug = 'nagels';
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'authenticated deleted % categories', n;
  end if;

  insert into public.marketplace_category (id, name, slug, sort_order)
  values ('01900000-0000-4000-8000-0000000000ff', 'Extra', 'extra', 99);
  raise exception 'authenticated inserted a category';
exception
  when insufficient_privilege then
    null;
end
$$;

-- Users only see and change their own likes. Insert requires a listed location.
do $$
declare
  n int;
begin
  perform set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
  perform set_config('role', 'authenticated', true);
  insert into public.marketplace_location_like (location_id, user_id)
  values (
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '11111111-1111-4111-8111-111111111111'
  );

  begin
    insert into public.marketplace_location_like (location_id, user_id)
    values (
      'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      '11111111-1111-4111-8111-111111111111'
    );
    raise exception 'like of unlisted location was allowed';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.marketplace_location_like (location_id, user_id)
    values (
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      '22222222-2222-4222-8222-222222222222'
    );
    raise exception 'user inserted a like for someone else';
  exception when insufficient_privilege then null;
  end;
end
$$;

do $$
declare
  n int;
begin
  perform set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
  perform set_config('role', 'authenticated', true);
  select count(*) into n from public.marketplace_location_like;
  if n <> 0 then
    raise exception 'user saw another user''s likes (%)', n;
  end if;

  delete from public.marketplace_location_like
  where user_id = '11111111-1111-4111-8111-111111111111';
end
$$;

do $$
declare
  n int;
begin
  select count(*) into n from public.marketplace_location_like;
  if n <> 1 then
    raise exception 'other user deleted a like they do not own (remaining %)', n;
  end if;
end
$$;

-- Owner can map their service and upload media. The other company cannot.
do $$
declare
  n int;
begin
  perform set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
  perform set_config('role', 'authenticated', true);

  insert into public.service_marketplace_category (service_id, marketplace_category_id)
  values (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    '01900000-0000-4000-8000-000000000001'
  );

  insert into public.marketplace_media (location_id, company_id, path, sort_order)
  values (
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/owner-hidden.jpg',
    1
  );

  select count(*) into n
  from public.marketplace_media
  where path like '%hidden%';
  if n < 1 then
    raise exception 'owner could not read unlisted media';
  end if;
end
$$;

do $$
begin
  perform set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
  perform set_config('role', 'authenticated', true);

  begin
    insert into public.service_marketplace_category (service_id, marketplace_category_id)
    values (
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      '01900000-0000-4000-8000-000000000002'
    );
    raise exception 'other company mapped a service it does not own';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.marketplace_media (location_id, company_id, path)
    values (
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/intruder.jpg'
    );
    raise exception 'other company inserted media';
  exception when insufficient_privilege then null;
  end;

  begin
    delete from public.marketplace_media
    where company_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  exception when insufficient_privilege then null;
  end;
end
$$;

do $$
declare
  n int;
begin
  select count(*) into n
  from public.marketplace_media
  where path like '%intruder%';
  if n <> 0 then
    raise exception 'intruder media row exists';
  end if;

  select count(*) into n
  from public.service_marketplace_category
  where service_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  if n <> 1 then
    raise exception 'expected 1 mapping, found %', n;
  end if;
end
$$;

-- Storage: anon can read, cannot write. Owner can write only under their prefix.
grant usage on schema storage to anon, authenticated, service_role;
grant select, insert, update, delete on storage.objects to anon, authenticated, service_role;

do $$
declare
  n int;
begin
  insert into storage.objects (bucket_id, name)
  values ('marketplace', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/photo.jpg');

  perform set_config('role', 'anon', true);
  select count(*) into n from storage.objects where bucket_id = 'marketplace';
  if n <> 1 then
    raise exception 'anon storage read count %', n;
  end if;

  begin
    insert into storage.objects (bucket_id, name)
    values ('marketplace', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/anon.jpg');
    raise exception 'anon uploaded to marketplace';
  exception when insufficient_privilege then null;
  end;
end
$$;

do $$
begin
  perform set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
  perform set_config('role', 'authenticated', true);
  begin
    insert into storage.objects (bucket_id, name)
    values ('marketplace', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/nope.jpg');
    raise exception 'other company wrote under a foreign prefix';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into storage.objects (bucket_id, name)
    values ('marketplace', 'not-a-uuid/nope.jpg');
    raise exception 'non-uuid prefix was accepted';
  exception when insufficient_privilege then null;
  end;
end
$$;

do $$
begin
  perform set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
  perform set_config('role', 'authenticated', true);
  insert into storage.objects (bucket_id, name)
  values ('marketplace', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/owner.jpg');
end
$$;

select 'rls-check-ok' as result;
