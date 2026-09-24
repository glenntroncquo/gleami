#!/usr/bin/env bash
# Throwaway Postgres: apply the marketplace schema and print EXPLAIN plans
# for 10k and 100k projection rows. Not pointed at SalonFlow.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DB="marketplace_explain_$$"
OUT="${1:-/tmp/marketplace-explain.txt}"

sudo -u postgres psql -v ON_ERROR_STOP=1 -c "drop database if exists ${DB};" >/dev/null
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "create database ${DB};" >/dev/null
sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$DB" -f "$ROOT/tests/marketplace/stub.sql" >/dev/null
sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$DB" -f "$ROOT/supabase/migrations/20260924183000_marketplace_schema.sql" >/dev/null
sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$DB" -f "$ROOT/supabase/migrations/20260924184500_marketplace_suggest_name_gist.sql" >/dev/null

seed() {
  local from="$1"
  local to="$2"
  sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$DB" <<SQL
insert into public.company (id)
values ('aaaaaaaa-0000-4000-8000-000000000001')
on conflict do nothing;

insert into public.location (
  id, company_id, name, slug, is_listed, is_active, geo_location, city
)
select
  ('10000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid,
  'aaaaaaaa-0000-4000-8000-000000000001',
  case when i % 40 = 0 then 'Keratin Studio ' || i else 'Salon ' || i end,
  'salon-' || i,
  true,
  true,
  st_setsrid(st_makepoint(
    3.0 + (i % 400) * 0.01,
    50.0 + ((i / 400) % 250) * 0.008
  ), 4326)::public.geography,
  'Antwerpen'
from generate_series(${from}, ${to}) as i;

insert into public.marketplace_search_location (
  location_id, company_id, name, slug, city, timezone, coordinates,
  category_ids, search_text, treatments, like_count, updated_at
)
select
  l.id,
  l.company_id,
  l.name,
  l.slug,
  l.city,
  l.timezone,
  l.geo_location,
  array[(array[
    '01900000-0000-4000-8000-000000000001'::uuid,
    '01900000-0000-4000-8000-000000000002'::uuid,
    '01900000-0000-4000-8000-000000000003'::uuid,
    '01900000-0000-4000-8000-000000000004'::uuid,
    '01900000-0000-4000-8000-000000000005'::uuid,
    '01900000-0000-4000-8000-000000000006'::uuid,
    '01900000-0000-4000-8000-000000000007'::uuid,
    '01900000-0000-4000-8000-000000000008'::uuid,
    '01900000-0000-4000-8000-000000000009'::uuid,
    '01900000-0000-4000-8000-00000000000a'::uuid,
    '01900000-0000-4000-8000-00000000000b'::uuid
  ])[1 + ((substring(l.slug from '[0-9]+$'))::int % 11)]],
  case
    when (substring(l.slug from '[0-9]+$'))::int % 50 = 0
      then 'keratin studio ' || l.slug
    else 'salon antwerpen ' || l.slug
  end,
  '[]'::jsonb,
  (substring(l.slug from '[0-9]+$'))::int % 30,
  now()
from public.location l
where (substring(l.slug from '[0-9]+$'))::int between ${from} and ${to};

insert into public.service (id, company_id, name, is_active, is_deleted, is_marketplace_visible)
select
  ('20000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid,
  'aaaaaaaa-0000-4000-8000-000000000001',
  case when i % 25 = 0 then 'Keratin behandeling ' || i else 'Knippen ' || i end,
  true,
  false,
  true
from generate_series(${from}, least(${to}, ${from} + 4999)) as i
on conflict do nothing;

insert into public.location_service (location_id, service_id)
select
  ('10000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid,
  ('20000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid
from generate_series(${from}, least(${to}, ${from} + 4999)) as i
where i % 25 = 0
on conflict do nothing;

analyze public.marketplace_search_location;
analyze public.service;
analyze public.location;
analyze public.location_service;
SQL
}

{
  echo "===== 10k projection rows ====="
  seed 1 10000
  sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$DB" -f "$ROOT/tests/marketplace/explain.sql"
  echo "===== 100k projection rows ====="
  seed 10001 100000
  sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$DB" -f "$ROOT/tests/marketplace/explain.sql"
} | tee "$OUT"

if grep -E 'Seq Scan on (public\.)?marketplace_search_location' "$OUT"; then
  echo "Sequential scan on marketplace_search_location" >&2
  exit 1
fi

sudo -u postgres psql -v ON_ERROR_STOP=1 -c "drop database ${DB};" >/dev/null
echo "Wrote ${OUT}"
