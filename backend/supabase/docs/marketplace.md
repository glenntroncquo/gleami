# Marketplace discovery

Consumer search for listed salon locations. Clients read categories and their own likes with `supabase.from()` and RLS. Search, suggest, the public profile, and “next available” are edge functions. The search projection is rebuilt in TypeScript, not in SQL functions.

Apply, in order, on SalonFlow (there is no staging). Do not apply from CI.

1. `supabase/migrations/20260924183000_marketplace_schema.sql`
2. `supabase/migrations/20260924184500_marketplace_suggest_name_gist.sql`
3. `supabase/migrations/20260924190000_marketplace_sync_schedule.sql`

In file 3, replace every `__MARKETPLACE_WEBHOOK_SECRET__` before apply. Set the same value as the edge secret `MARKETPLACE_WEBHOOK_SECRET`. Also set `SUPABASE_DB_URL` to the session connection string (direct port 5432 or the session pooler). The transaction pooler is a poor fit for these statements.

`marketplace-reindex` is not on the cron. Call it with the service-role JWT when you want a full rebuild (backfill).

## Deviations from the plan names

Live tables win. `service` is the treatment. `location_service` is the location offering. `location.is_listed` is the publish flag. `location.slug` is the public slug. `location.geo_location` is the point. The projection has no `is_published` column: if the row exists, the location is in the public index.

A location is indexed only when it is listed, active, has a non-blank slug, and has `geo_location`. Otherwise sync deletes the projection row.

## Filters (A3)

`marketplace-search` ANDs whichever of these the client sends. At least one of bbox, center, `categoryIds`, or `q` is required.

| Input | Predicate |
| --- | --- |
| `bbox` | `ST_Intersects(coordinates, envelope)` on the geography GiST index. Boundary is included. |
| `center` + `radiusKm` | `ST_DWithin`. Radius is kilometres, default **25** when `center` is set and radius is omitted, maximum **200**. |
| both bbox and center | both predicates (intersection) |
| `categoryIds` | `category_ids && ids` — the salon has **at least one** of the categories. Not “all of”. Empty array is ignored. |
| `q` | full-text `search_vector @@ plainto_tsquery('simple', q)` **or** trigram `search_text ILIKE '%' || q || '%'` (`gin_trgm_ops`). `search_text` is stored lowercased. |
| `cursor` | keyset on `(score DESC, location_id ASC)`. Opaque. Invalid cursor is 400. |
| `limit` | default 20, max 50. The query reads `limit + 1` to decide `nextCursor`. |

`distanceKm` is set only when `center` is sent. A bbox alone leaves it null.

## Ranking (A4)

Defined in `_shared/marketplace/ranking.ts` and interpolated into the one search statement.

Plan A4 names the factors and does not give coefficients: distance, text rank, rating, `review_count`, `like_count`. Text rank is the full-text term plus the trigram term. These are the coefficients this API ships:

```
score =
    10   * ts_rank_cd(search_vector, plainto_tsquery('simple', q))
  +  6   * word_similarity(q, search_text)
  +  3   * (1 / (1 + distance_km))
  +  2   * (coalesce(rating, 0) / 5)
  +  0.25 * ln(1 + review_count)
  +  0.35 * ln(1 + like_count)
```

No `q`: the text terms are 0. No `center`: the geo term is 0. `rating` null counts as 0. `review_count` stays 0 until a reviews table exists; the term is in the formula anyway. The score is rounded to 6 decimal places before the keyset comparison so the cursor round-trips. `search_vector` uses `simple` because the plan writes `to_tsvector('simple', search_text)`.

`ts_rank_cd` is often small, so the text weight is 10. `word_similarity` is 0..1 and is what makes a name hit beat a merely popular neighbour. Standing on the pin is worth 3. One hundred likes add about 1.6.

The plan document was not in the repo. These weights are the ones the API ships. Change them only in `ranking.ts`.

## Sync

`rebuildMarketplaceSearchLocation(locationId)` in `_shared/marketplace/rebuild.ts`:

1. Read the location, its `location_service` rows, services, variants, category ids, active category names, and `count(*)` of likes.
2. Build `category_ids`, `search_text`, and `treatments` in TypeScript. `treatments` is `[{serviceId, serviceVariantId, name}]`. `serviceVariantId` is the first active variant (lowest `display_order`, then lowest id). Services that are hidden, inactive, deleted, or have no active variant are omitted. Display only — search does not filter on it.
3. Delete the projection row when the location is not indexable. Otherwise upsert. `rating` / `review_count` are left null / 0 on insert and are not overwritten on update.
4. If the location is listed and `marketplace_published_at` is null, set it to `now()`. Later syncs do not move it, so the location UPDATE trigger does not loop.

Database webhooks (`supabase_functions.http_request`, no new function) on `location`, `service`, `location_service`, and `service_marketplace_category` POST to `marketplace-sync`. The function reads ids from the payload and then ignores every other field. For a service (or a category mapping) it loads location ids from `location_service`. `location_service.service_id` is `ON DELETE CASCADE`, so a service delete is also delivered by the `location_service` trigger while the link still exists.

There is **no** webhook on `marketplace_location_like`. `marketplace-refresh-like-counts` runs daily at 03:15 UTC and sets `like_count` with one `UPDATE ... FROM (SELECT location_id, count(*) ...)`, including zeros. It does not change `updated_at`.

`marketplace-drift-check` runs daily at 03:45 UTC. `location.updated_at` and `service.updated_at` are nullable and nothing in this repo stamps them on update, so a timestamp compare would miss edits. The job logs how many listed rows have a null `updated_at`, how many projections are older than `location.updated_at`, and how many indexable listed locations are missing, then rebuilds every listed active location. `service_variant` is not webhooked; this job is what refreshes a changed default variant.

`marketplace-reindex` is the admin backfill: service-role JWT, same full rebuild.

## API

All POST, JSON, CORS like the other functions. Success bodies are the objects below (not wrapped). Errors use the existing `{ success: false, error }` response.

JWT verification:

| Function | `verify_jwt` | Auth |
| --- | --- | --- |
| `marketplace-search` | true (default) | anon or user JWT |
| `marketplace-suggest` | true | anon or user JWT |
| `marketplace-location-get` | true | anon or user JWT |
| `marketplace-next-available` | true | anon or user JWT |
| `marketplace-reindex` | true | service_role JWT |
| `marketplace-sync` | false | `Authorization: Bearer <MARKETPLACE_WEBHOOK_SECRET>` |
| `marketplace-refresh-like-counts` | false | same secret |
| `marketplace-drift-check` | false | same secret |

`marketplace-search` body: `{ bbox?, center?, radiusKm?, categoryIds?, q?, cursor?, limit? }`

Response: `{ items: [{ locationId, companyId, name, slug, imageUrl, images, city, address, lat, lng, distanceKm, categoryIds, treatments, rating, reviewCount, likeCount, score }], nextCursor }`

`address` is the projection column: street and postal code joined by sync. `city` is separate. `imageUrl` stays `location.image_url`. `images` is up to 5 public URLs from `marketplace_media` where `type = 'IMAGE'`, ordered by `sort_order`, then `id`. When that list is empty, `images` is `[imageUrl]` if `imageUrl` is set, otherwise `[]`. There is no `viewerHasLiked`; the client merges its own likes.

`marketplace-suggest` body: `{ q, limit? }` (default 8, max 20)

Response: `{ items: [{ id, name, type: "category" \| "service" \| "location", slug?, locationId? }] }`

`slug` is required when `type` is `"location"` (the projection slug is not null). Category and service items omit it. A location hit without a slug is dropped.

Each of the three branches keeps its own `LIMIT`. The outer query keeps the best of those. Service names come only from services offered at a listed, active location. Location names are the nearest by trigram distance (`lower(name) OPERATOR(extensions.<->) q`) on `marketplace_search_location_name_trgm_gist`. That index replaces the GIN index from the schema migration: a `%` / `ILIKE` filter sequentially scanned the projection once a few percent of names matched. `<->` is schema-qualified because PostGIS defines the same operator.

`marketplace-location-get` body: `{ slug }`. 404 when the slug is missing or the location is not listed and active. Case-insensitive.

Response: `{ location: { locationId, companyId, name, slug, description, imageUrl, images, street, postalCode, city, country, lat, lng, timezone, likeCount }, categories: [{ id, name, slug }], services: [{ serviceId, name, description, variants: [{ serviceVariantId, name, price, currency, durationMinutes }] }] }`

`currency` is `"EUR"`. `service_variant` has no currency column.

`images` are public URLs for `marketplace_media` rows with `type = 'IMAGE'`, ordered by `sort_order`. The object name is `storage_path`. `likeCount` is a live `count(*)`, not the projection (search cards can be a day behind). `description` is `location.marketplace_description`. Variant `durationMinutes` is `client_duration_minutes`, same field `service-list` uses. The query is not `service-list` itself: it has to restrict to `location_service` and `is_marketplace_visible`.

`marketplace-next-available` body: `{ pairs: [{ locationId, serviceId, serviceVariantId }] }` (max 24)

Response: `{ results: { [locationId]: "today" \| "tomorrow" \| "this_week" \| "none_soon" } }`

Calls `getAvailabilityHandler` (the availability-list slot engine) with today 00:00 through today+6 23:59:59 in the location timezone. Several pairs for one location keep the soonest bucket. Unlisted, inactive, unknown, or `BookingLocationError` is `none_soon` and does not run the engine. Up to 6 calls run at once. Each request logs `{ msg, pairCount, locationCount, elapsedMs }`.

## Client tables

- `marketplace_category`: anon/authenticated read active rows. No client writes.
- `service_marketplace_category`: read is `true` (ids only; see the schema migration comment). Insert/delete requires `catalog:manage` on the service’s company.
- `marketplace_search_location`: `GRANT ALL` to anon and authenticated, and the only SELECT policy is `USING (true)` for both roles. Favorites are not a separate endpoint. An authenticated client reads its likes, then the projection:

```
supabase.from('marketplace_location_like').select('location_id')
supabase.from('marketplace_search_location')
  .select('location_id, company_id, name, slug, image_url, city, like_count')
  .in('location_id', ids)
```

Those columns are on the table grant. The client merges its own likes; responses do not include `viewerHasLiked`.

- `marketplace_location_like`: a user selects, inserts, and deletes only their own rows. Insert also requires the location to be listed and active.
- `marketplace_media`: anon and other users read rows for listed active locations. `locations:manage` or `settings:manage` can read and write their company’s rows, including before publish. `storage_path` must start with `{company_id}/`.
- Storage bucket `marketplace` is public. Writes use the same company permissions and the same path prefix.

`marketplace_internal.listed_location` is not an API table. Do not add that schema to the exposed API schemas.

## Local validation

Throwaway Postgres 16. Production is 15; the SQL stays within generated columns and `security_invoker` views. Not applied to SalonFlow.

`tests/marketplace/run-rls.sh` ended with `rls-check-ok`. Anon sees the listed projection row and not the unlisted one, can read listed media and the public storage objects, and cannot insert into any of the five tables. Authenticated updates and deletes of the projection and categories change 0 rows. A user likes only a listed location, and only their own row. The other company cannot write mappings or media. Storage writes require the `{company_id}/` prefix.

`tests/marketplace/run-explain.sh` seeds 10k then 100k projection rows. No sequential scan on `marketplace_search_location`.

| Query | 10k | 100k |
| --- | --- | --- |
| bbox | GiST index scan, 0 rows (the seeded grid for n ≤ 10000 misses this envelope), 0.13 ms | bitmap index scan on the geography GiST, 525 rows, 7.8 ms |
| bbox + category | GiST index scan, 0.02 ms | bitmap AND of geography GiST and `category_ids`, 5.5 ms |
| bbox + text | GiST index scan, 0.02 ms | bitmap AND of geography GiST with FTS GIN and `search_text` trigram GIN, 5.9 ms |
| center + radius + text | GiST index scan, 0.03 ms | same bitmap AND shape, 4.8 ms |
| suggest, location branch | GiST index scan on `marketplace_search_location_name_trgm_gist`, 8 rows | same index scan, 8 rows; whole statement 34 ms |

Suggest still sequentially scans `marketplace_category` (11 rows) and `location_service` (400 rows). At 100k the service branch sequentially scans the synthetic 10k-service catalog (about 17 ms) inside the listed-location semi join. `service_name_trgm_idx` is in place; the planner preferred the sequential scan for that shape. A real catalog is much smaller.

The schedule migration does not run `CREATE EXTENSION` and does not create a Postgres function. It requires `pg_net` (schema `net`) and `pg_cron` (schema `cron`) to already be installed, then creates six triggers on tables this role owns and two `cron.schedule` jobs. It stops on this machine because `supabase_functions.http_request()` is not here. With that function, `net.http_post`, and `cron.schedule` stubbed, the trigger and cron statements apply.
