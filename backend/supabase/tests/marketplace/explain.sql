-- Search / suggest plans. Run after stub.sql and the schema migration.
-- Parameters are literals so the planner sees them the way a custom plan
-- (postgres.js prepare:false) does.

\set bbox_sql 'st_intersects(m.coordinates, st_makeenvelope(4.30, 51.15, 4.50, 51.35, 4326)::geography)'
\set category_sql 'm.category_ids && array[''01900000-0000-4000-8000-000000000001'']::uuid[]'
\set text_sql '(m.search_vector @@ plainto_tsquery(''simple'', ''keratin'') or m.search_text ilike ''%keratin%'' escape ''\\'')'
\set radius_sql 'st_dwithin(m.coordinates, st_setsrid(st_makepoint(4.40, 51.20), 4326)::geography, 8000)'

\echo '--- bbox only ---'
explain (analyze, buffers)
select m.location_id
from public.marketplace_search_location m
where st_intersects(m.coordinates, st_makeenvelope(4.30, 51.15, 4.50, 51.35, 4326)::geography)
order by (
  2::float8 * (coalesce(m.rating, 0) / 5.0)
  + 0.35::float8 * ln(1 + m.like_count)
) desc, m.location_id asc
limit 21;

\echo '--- bbox + category ---'
explain (analyze, buffers)
select m.location_id
from public.marketplace_search_location m
where st_intersects(m.coordinates, st_makeenvelope(4.30, 51.15, 4.50, 51.35, 4326)::geography)
  and m.category_ids && array['01900000-0000-4000-8000-000000000001']::uuid[]
order by m.location_id
limit 21;

\echo '--- bbox + text ---'
explain (analyze, buffers)
select m.location_id
from public.marketplace_search_location m
where st_intersects(m.coordinates, st_makeenvelope(4.30, 51.15, 4.50, 51.35, 4326)::geography)
  and (
    m.search_vector @@ plainto_tsquery('simple', 'keratin')
    or m.search_text ilike '%keratin%' escape '\'
  )
order by m.location_id
limit 21;

\echo '--- center + radius + text ---'
explain (analyze, buffers)
select m.location_id
from public.marketplace_search_location m
where st_dwithin(m.coordinates, st_setsrid(st_makepoint(4.40, 51.20), 4326)::geography, 8000)
  and (
    m.search_vector @@ plainto_tsquery('simple', 'keratin')
    or m.search_text ilike '%keratin%' escape '\'
  )
order by m.location_id
limit 21;

\echo '--- suggest ---'
explain (analyze, buffers)
select id, name, type
from (
  (
    select c.id::text as id, c.name, 'category'::text as type,
      greatest(extensions.similarity(lower(c.name), 'heren'), extensions.word_similarity('heren', lower(c.name))) as sim
    from public.marketplace_category c
    where c.is_active
      and (
        lower(c.name) operator(extensions.%) 'heren'
        or lower(c.name) ilike '%heren%' escape '\'
      )
    order by sim desc
    limit 8
  )
  union all
  (
    select min(s.id::text), min(s.name), 'service'::text,
      max(greatest(extensions.similarity(lower(s.name), 'keratin'), extensions.word_similarity('keratin', lower(s.name))))
    from public.service s
    where coalesce(s.is_deleted, false) = false
      and coalesce(s.is_active, true) = true
      and s.is_marketplace_visible
      and (
        lower(s.name) operator(extensions.%) 'keratin'
        or lower(s.name) ilike '%keratin%' escape '\'
      )
      and exists (
        select 1
        from public.location_service ls
        join public.location l on l.id = ls.location_id
        where ls.service_id = s.id
          and l.is_listed
          and l.is_active
      )
    group by lower(s.name)
    order by 4 desc
    limit 8
  )
  union all
  (
    select m.location_id::text, m.name, 'location'::text,
      (1 - (lower(m.name) operator(extensions.<->) 'keratin'))
    from public.marketplace_search_location m
    order by lower(m.name) operator(extensions.<->) 'keratin'
    limit 8
  )
) hits
order by sim desc, name asc
limit 8;
