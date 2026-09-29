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
select id, name, type, detail
from (
  (
    select c.id::text as id, c.name, 'category'::text as type, null::text as detail,
      greatest(extensions.similarity(lower(c.name), 'keratine'), extensions.word_similarity('keratine', lower(c.name))) as sim,
      1 as kind
    from public.marketplace_category c
    where c.is_active
      and (
        lower(c.name) operator(extensions.%) 'keratine'
        or lower(c.name) ilike '%keratine%' escape '\'
      )
    order by sim desc
    limit 8
  )
  union all
  (
    select m.location_id::text, m.name, 'location'::text,
      (
        select elem->>'name'
        from jsonb_array_elements(coalesce(m.treatments, '[]'::jsonb)) elem
        where lower(coalesce(elem->>'name', '')) ilike '%keratine%' escape '\'
        order by extensions.word_similarity('keratine', lower(coalesce(elem->>'name', ''))) desc
        limit 1
      ),
      greatest(extensions.word_similarity('keratine', m.search_text), extensions.word_similarity('keratine', lower(m.name))),
      0
    from public.marketplace_search_location m
    where m.search_vector @@ plainto_tsquery('simple', 'keratine')
      or m.search_text ilike '%keratine%' escape '\'
    order by 5 desc
    limit 8
  )
) hits
order by kind asc, sim desc, name asc
limit 8;
