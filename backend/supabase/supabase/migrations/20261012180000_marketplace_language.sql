-- Marketplace language. Category names stay Dutch on marketplace_category.
-- Translations feed search and the visitor's language. Service and option
-- translations are optional and written by whoever can edit the catalog
-- (treatments:manage, the screen key that replaced catalog:manage).

-- ---------------------------------------------------------------------------
-- 1) Category translations. Public read of active categories. No client writes.
-- ---------------------------------------------------------------------------
create table public.marketplace_category_translation (
  marketplace_category_id uuid not null
    references public.marketplace_category (id) on delete cascade,
  locale text not null,
  name text not null,
  primary key (marketplace_category_id, locale),
  constraint marketplace_category_translation_locale_check
    check (locale in ('nl', 'fr', 'de', 'en', 'pt')),
  constraint marketplace_category_translation_name_check
    check (btrim(name) <> '')
);

comment on table public.marketplace_category_translation is
  'Display names for marketplace categories. Dutch on marketplace_category.name '
  'stays the fallback. Clients may read rows whose category is active.';

create index marketplace_category_translation_name_trgm_idx
  on public.marketplace_category_translation
  using gin (lower(name) extensions.gin_trgm_ops);

alter table public.marketplace_category_translation enable row level security;

create policy "marketplace_category_translation select (active)"
  on public.marketplace_category_translation
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.marketplace_category c
      where c.id = marketplace_category_id
        and c.is_active
    )
  );

grant select on table public.marketplace_category_translation to anon, authenticated;
grant all on table public.marketplace_category_translation to service_role;

-- Seed after the table exists and before any sync trigger. One row per
-- category per language. Dutch matches marketplace_category.name.
insert into public.marketplace_category_translation (marketplace_category_id, locale, name)
select c.id, v.locale, v.name
from public.marketplace_category c
join (
  values
    ('herenkapper', 'nl', 'Herenkapper'),
    ('herenkapper', 'fr', 'Coiffeur homme'),
    ('herenkapper', 'de', 'Herrenfriseur'),
    ('herenkapper', 'en', 'Men''s barber'),
    ('herenkapper', 'pt', 'Barbeiro'),
    ('vrouwenkapper', 'nl', 'Vrouwenkapper'),
    ('vrouwenkapper', 'fr', 'Coiffeur femme'),
    ('vrouwenkapper', 'de', 'Damenfriseur'),
    ('vrouwenkapper', 'en', 'Women''s hairdresser'),
    ('vrouwenkapper', 'pt', 'Cabeleireiro feminino'),
    ('haar-en-styling', 'nl', 'Haar en styling'),
    ('haar-en-styling', 'fr', 'Cheveux et coiffage'),
    ('haar-en-styling', 'de', 'Haar und Styling'),
    ('haar-en-styling', 'en', 'Hair and styling'),
    ('haar-en-styling', 'pt', 'Cabelo e styling'),
    ('keratine', 'nl', 'Keratine'),
    ('keratine', 'fr', 'Kératine'),
    ('keratine', 'de', 'Keratin'),
    ('keratine', 'en', 'Keratin'),
    ('keratine', 'pt', 'Queratina'),
    ('wenkbrauwen-en-wimpers', 'nl', 'Wenkbrauwen en wimpers'),
    ('wenkbrauwen-en-wimpers', 'fr', 'Sourcils et cils'),
    ('wenkbrauwen-en-wimpers', 'de', 'Augenbrauen und Wimpern'),
    ('wenkbrauwen-en-wimpers', 'en', 'Brows and lashes'),
    ('wenkbrauwen-en-wimpers', 'pt', 'Sobrancelhas e cílios'),
    ('massagesalon', 'nl', 'Massagesalon'),
    ('massagesalon', 'fr', 'Salon de massage'),
    ('massagesalon', 'de', 'Massagesalon'),
    ('massagesalon', 'en', 'Massage salon'),
    ('massagesalon', 'pt', 'Salão de massagem'),
    ('ontharing', 'nl', 'Ontharing'),
    ('ontharing', 'fr', 'Épilation'),
    ('ontharing', 'de', 'Haarentfernung'),
    ('ontharing', 'en', 'Hair removal'),
    ('ontharing', 'pt', 'Depilação'),
    ('nagels', 'nl', 'Nagels'),
    ('nagels', 'fr', 'Ongles'),
    ('nagels', 'de', 'Nägel'),
    ('nagels', 'en', 'Nails'),
    ('nagels', 'pt', 'Unhas'),
    ('gezichtsbehandeling', 'nl', 'Gezichtsbehandeling'),
    ('gezichtsbehandeling', 'fr', 'Soin du visage'),
    ('gezichtsbehandeling', 'de', 'Gesichtsbehandlung'),
    ('gezichtsbehandeling', 'en', 'Facial'),
    ('gezichtsbehandeling', 'pt', 'Tratamento facial'),
    ('make-up', 'nl', 'Make-up'),
    ('make-up', 'fr', 'Maquillage'),
    ('make-up', 'de', 'Make-up'),
    ('make-up', 'en', 'Makeup'),
    ('make-up', 'pt', 'Maquiagem'),
    ('tatoeages-en-piercings', 'nl', 'Tatoeages en piercings'),
    ('tatoeages-en-piercings', 'fr', 'Tatouages et piercings'),
    ('tatoeages-en-piercings', 'de', 'Tattoos und Piercings'),
    ('tatoeages-en-piercings', 'en', 'Tattoos and piercings'),
    ('tatoeages-en-piercings', 'pt', 'Tatuagens e piercings')
) as v(slug, locale, name) on v.slug = c.slug;

-- ---------------------------------------------------------------------------
-- 2) Optional service and option translations
-- ---------------------------------------------------------------------------
create table public.service_translation (
  service_id uuid not null references public.service (id) on delete cascade,
  locale text not null,
  name text not null,
  description text,
  primary key (service_id, locale),
  constraint service_translation_locale_check
    check (locale in ('nl', 'fr', 'de', 'en', 'pt')),
  constraint service_translation_name_check
    check (btrim(name) <> ''),
  constraint service_translation_description_check
    check (description is null or btrim(description) <> '')
);

comment on table public.service_translation is
  'Optional display names for a service. Blank names are not stored. '
  'The original service.name stays the salon''s own text.';

create table public.service_variant_translation (
  service_variant_id uuid not null references public.service_variant (id) on delete cascade,
  locale text not null,
  name text not null,
  primary key (service_variant_id, locale),
  constraint service_variant_translation_locale_check
    check (locale in ('nl', 'fr', 'de', 'en', 'pt')),
  constraint service_variant_translation_name_check
    check (btrim(name) <> '')
);

comment on table public.service_variant_translation is
  'Optional display name for a service option. Blank names are not stored.';

alter table public.service_translation enable row level security;
alter table public.service_variant_translation enable row level security;

create policy "service_translation select (membership)"
  on public.service_translation
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.service s
      where s.id = service_id
        and s.company_id in (select private.company_ids_for_user())
    )
  );

create policy "service_translation insert (treatments:manage)"
  on public.service_translation
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.service s
      where s.id = service_id
        and private.has_permission_for_company('treatments:manage', s.company_id)
    )
  );

create policy "service_translation update (treatments:manage)"
  on public.service_translation
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.service s
      where s.id = service_id
        and private.has_permission_for_company('treatments:manage', s.company_id)
    )
  )
  with check (
    exists (
      select 1
      from public.service s
      where s.id = service_id
        and private.has_permission_for_company('treatments:manage', s.company_id)
    )
  );

create policy "service_translation delete (treatments:manage)"
  on public.service_translation
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.service s
      where s.id = service_id
        and private.has_permission_for_company('treatments:manage', s.company_id)
    )
  );

create policy "service_variant_translation select (membership)"
  on public.service_variant_translation
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.service_variant v
      join public.service s on s.id = v.service_id
      where v.id = service_variant_id
        and s.company_id in (select private.company_ids_for_user())
    )
  );

create policy "service_variant_translation insert (treatments:manage)"
  on public.service_variant_translation
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.service_variant v
      join public.service s on s.id = v.service_id
      where v.id = service_variant_id
        and private.has_permission_for_company('treatments:manage', s.company_id)
    )
  );

create policy "service_variant_translation update (treatments:manage)"
  on public.service_variant_translation
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.service_variant v
      join public.service s on s.id = v.service_id
      where v.id = service_variant_id
        and private.has_permission_for_company('treatments:manage', s.company_id)
    )
  )
  with check (
    exists (
      select 1
      from public.service_variant v
      join public.service s on s.id = v.service_id
      where v.id = service_variant_id
        and private.has_permission_for_company('treatments:manage', s.company_id)
    )
  );

create policy "service_variant_translation delete (treatments:manage)"
  on public.service_variant_translation
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.service_variant v
      join public.service s on s.id = v.service_id
      where v.id = service_variant_id
        and private.has_permission_for_company('treatments:manage', s.company_id)
    )
  );

grant select, insert, update, delete on table public.service_translation to authenticated, service_role;
grant select, insert, update, delete on table public.service_variant_translation to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) Sync triggers after the seed, same marketplace-sync call as a service write.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regprocedure('supabase_functions.http_request()') is null then
    raise notice 'marketplace translation sync skipped: supabase_functions.http_request() is missing';
    return;
  end if;

  execute $trig$
    drop trigger if exists marketplace_sync_service_translation on public.service_translation;
    create trigger marketplace_sync_service_translation
      after insert or update or delete on public.service_translation
      for each row
      execute function supabase_functions.http_request(
        'https://kvhinnhnwgvdpzggdnxs.supabase.co/functions/v1/marketplace-sync',
        'POST',
        '{"Content-Type":"application/json","Authorization":"Bearer __MARKETPLACE_WEBHOOK_SECRET__"}',
        '{}',
        '15000'
      );

    drop trigger if exists marketplace_sync_service_variant_translation on public.service_variant_translation;
    create trigger marketplace_sync_service_variant_translation
      after insert or update or delete on public.service_variant_translation
      for each row
      execute function supabase_functions.http_request(
        'https://kvhinnhnwgvdpzggdnxs.supabase.co/functions/v1/marketplace-sync',
        'POST',
        '{"Content-Type":"application/json","Authorization":"Bearer __MARKETPLACE_WEBHOOK_SECRET__"}',
        '{}',
        '15000'
      );
  $trig$;
end
$$;

-- ---------------------------------------------------------------------------
-- 4) Apply-time verify
-- ---------------------------------------------------------------------------
do $$
declare
  translation_count integer;
begin
  select count(*) into translation_count from public.marketplace_category_translation;
  if translation_count <> 55 then
    raise exception 'marketplace_category_translation expected 55 rows, found %', translation_count;
  end if;

  if to_regprocedure('supabase_functions.http_request()') is not null
     and (
       not exists (
         select 1 from pg_trigger
         where tgname = 'marketplace_sync_service_translation' and not tgisinternal
       )
       or not exists (
         select 1 from pg_trigger
         where tgname = 'marketplace_sync_service_variant_translation' and not tgisinternal
       )
     )
  then
    raise exception 'marketplace translation sync trigger missing';
  end if;
end
$$;
