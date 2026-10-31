-- Public marketplace search. Callers use the anon key. The function runs as
-- the caller, so the public read policies on the salon projection and media
-- still apply. One call is bounded by the argument caps and a 2 second
-- statement timeout. Repeat-call limiting is left for a later API gateway.

create or replace function public.marketplace_search(
  p_q text default null,
  p_category_ids uuid[] default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_km double precision default null,
  p_min_lng double precision default null,
  p_min_lat double precision default null,
  p_max_lng double precision default null,
  p_max_lat double precision default null,
  p_cursor_score double precision default null,
  p_cursor_location_id uuid default null,
  p_limit integer default 20
)
returns table (
  location_id uuid,
  company_id uuid,
  name text,
  slug text,
  image_url text,
  image_paths json,
  city text,
  address text,
  lat double precision,
  lng double precision,
  distance_km double precision,
  category_ids uuid[],
  treatments jsonb,
  rating numeric,
  review_count integer,
  like_count integer,
  score double precision
)
language plpgsql
stable
security invoker
set search_path = public, extensions
set statement_timeout = '2s'
as $$
declare
  v_q text := lower(regexp_replace(btrim(coalesce(p_q, '')), '\s+', ' ', 'g'));
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 50);
  v_has_q boolean := length(v_q) > 0;
  v_category_count integer := coalesce(cardinality(p_category_ids), 0);
  v_has_categories boolean := v_category_count > 0;
  v_has_center boolean := p_lat is not null or p_lng is not null;
  v_has_bbox boolean := p_min_lng is not null
    or p_min_lat is not null
    or p_max_lng is not null
    or p_max_lat is not null;
  v_radius_m double precision := coalesce(p_radius_km, 25) * 1000;
  v_pattern text;
begin
  if length(v_q) > 80 then
    raise exception 'q is too long' using errcode = '22023';
  end if;
  if v_category_count > 11 then
    raise exception 'too many categories' using errcode = '22023';
  end if;
  if p_radius_km is not null and (p_radius_km <= 0 or p_radius_km > 200) then
    raise exception 'radius is out of range' using errcode = '22023';
  end if;
  if v_has_center and (p_lat is null or p_lng is null) then
    raise exception 'center needs lat and lng' using errcode = '22023';
  end if;
  if v_has_center and (p_lat < -90 or p_lat > 90 or p_lng < -180 or p_lng > 180) then
    raise exception 'center is out of range' using errcode = '22023';
  end if;
  if v_has_bbox and (
    p_min_lng is null or p_min_lat is null or p_max_lng is null or p_max_lat is null
  ) then
    raise exception 'bbox needs four edges' using errcode = '22023';
  end if;
  if v_has_bbox and (
    p_min_lng < -180 or p_max_lng > 180 or p_min_lat < -90 or p_max_lat > 90
    or p_min_lng >= p_max_lng or p_min_lat >= p_max_lat
  ) then
    raise exception 'bbox is out of range' using errcode = '22023';
  end if;
  if (p_cursor_score is null) <> (p_cursor_location_id is null) then
    raise exception 'cursor is incomplete' using errcode = '22023';
  end if;
  if not v_has_q and not v_has_categories and not v_has_center and not v_has_bbox then
    raise exception 'provide bbox, center, category ids, or q' using errcode = '22023';
  end if;

  v_pattern := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';

  return query
  select
    page.location_id,
    page.company_id,
    page.name,
    page.slug,
    page.image_url,
    coalesce(media.paths, '[]'::json) as image_paths,
    page.city,
    page.address,
    page.lat,
    page.lng,
    page.distance_km,
    page.category_ids,
    page.treatments,
    page.rating,
    page.review_count,
    page.like_count,
    page.score
  from (
    select
      ranked.location_id,
      ranked.company_id,
      ranked.name,
      ranked.slug,
      ranked.image_url,
      ranked.city,
      ranked.address,
      ranked.lat,
      ranked.lng,
      ranked.distance_km,
      ranked.category_ids,
      ranked.treatments,
      ranked.rating,
      ranked.review_count,
      ranked.like_count,
      ranked.score
    from (
      select
        m.location_id,
        m.company_id,
        m.name,
        m.slug,
        m.image_url,
        m.city,
        m.address,
        st_y(m.coordinates::geometry)::float8 as lat,
        st_x(m.coordinates::geometry)::float8 as lng,
        case
          when v_has_center then st_distance(
            m.coordinates,
            st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
          ) / 1000.0
          else null
        end as distance_km,
        m.category_ids,
        m.treatments,
        m.rating,
        m.review_count,
        m.like_count,
        round((
          case
            when v_has_q then
              10::float8 * ts_rank_cd(m.search_vector, plainto_tsquery('simple', v_q))
              + 6::float8 * extensions.word_similarity(v_q, m.search_text)
            else 0::float8
          end
          + case
            when v_has_center then 3::float8 * (1.0 / (1.0 + (
              st_distance(
                m.coordinates,
                st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
              ) / 1000.0
            )))
            else 0::float8
          end
          + 2::float8 * (coalesce(m.rating, 0) / 5.0)
          + 0.25::float8 * ln(1 + m.review_count)
          + 0.35::float8 * ln(1 + m.like_count)
        )::numeric, 6)::float8 as score
      from public.marketplace_search_location m
      where (
          not v_has_bbox
          or v_has_q
          or st_intersects(
            m.coordinates,
            st_makeenvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat, 4326)::geography
          )
        )
        and (
          not v_has_center
          or v_has_q
          or st_dwithin(
            m.coordinates,
            st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
            v_radius_m
          )
        )
        and (not v_has_categories or m.category_ids && p_category_ids)
        and (
          not v_has_q
          or m.search_vector @@ plainto_tsquery('simple', v_q)
          or m.search_text ilike v_pattern escape '\'
        )
    ) ranked
    where p_cursor_score is null
      or ranked.score < p_cursor_score
      or (ranked.score = p_cursor_score and ranked.location_id > p_cursor_location_id)
    order by ranked.score desc, ranked.location_id asc
    limit v_limit + 1
  ) page
  left join lateral (
    select json_agg(picked.storage_path order by picked.sort_order, picked.id) as paths
    from (
      select mm.storage_path, mm.sort_order, mm.id
      from public.marketplace_media mm
      where mm.location_id = page.location_id
        and mm.type = 'IMAGE'
      order by mm.sort_order, mm.id
      limit 5
    ) picked
  ) media on true
  order by page.score desc, page.location_id asc;
end;
$$;

revoke all on function public.marketplace_search(
  text, uuid[], double precision, double precision, double precision,
  double precision, double precision, double precision, double precision,
  double precision, uuid, integer
) from public;

grant execute on function public.marketplace_search(
  text, uuid[], double precision, double precision, double precision,
  double precision, double precision, double precision, double precision,
  double precision, uuid, integer
) to anon, authenticated;
