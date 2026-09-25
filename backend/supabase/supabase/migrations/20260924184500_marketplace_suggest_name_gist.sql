-- Suggest nearest-neighbour index.
-- FILE ONLY — do not apply from CI or an agent. Glenn applies after
-- 20260924183000_marketplace_schema.sql and before the sync schedule.
--
-- The schema migration's GIN index on lower(name) supports % and ILIKE.
-- At 100k rows a query that matches a few percent of names was cheaper as a
-- sequential scan than that bitmap, so marketplace-suggest did not use it.
-- pg_trgm GiST can order by the <-> distance and stop after LIMIT.
-- PostGIS also defines <->, so the query must use OPERATOR(extensions.<->).

drop index if exists public.marketplace_search_location_name_trgm_idx;

create index marketplace_search_location_name_trgm_gist
  on public.marketplace_search_location
  using gist (lower(name) extensions.gist_trgm_ops);
