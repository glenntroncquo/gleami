-- Public salon profile. The anon role can only read a few location columns,
-- and that grant covers every active shop. This function reads the listed
-- profile with its owner's rights and returns one salon. Callers still use
-- the anon key. One call stops after 2 seconds.

create or replace function public.marketplace_location(
  p_slug text,
  p_locale text default 'nl'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
set statement_timeout = '2s'
as $$
declare
  v_slug text := lower(btrim(coalesce(p_slug, '')));
  v_locale text := lower(left(btrim(coalesce(p_locale, 'nl')), 2));
  v_result jsonb;
begin
  if v_slug = '' or length(v_slug) > 80 then
    raise exception 'slug is invalid' using errcode = '22023';
  end if;
  if v_locale not in ('nl', 'fr', 'de', 'en', 'pt') then
    v_locale := 'nl';
  end if;

  select jsonb_build_object(
    'location', jsonb_build_object(
      'locationId', l.id,
      'companyId', l.company_id,
      'name', l.name,
      'slug', l.slug,
      'description', l.marketplace_description,
      'imageUrl', l.image_url,
      'images', coalesce((
        select jsonb_agg(m.storage_path order by m.sort_order, m.id)
        from public.marketplace_media m
        where m.location_id = l.id
          and m.type = 'IMAGE'
      ), '[]'::jsonb),
      'street', l.street,
      'postalCode', l.postal_code,
      'city', l.city,
      'country', l.country,
      'lat', case when l.geo_location is null then null else st_y(l.geo_location::geometry)::float8 end,
      'lng', case when l.geo_location is null then null else st_x(l.geo_location::geometry)::float8 end,
      'timezone', l.timezone,
      'likeCount', (
        select count(*)::int
        from public.marketplace_location_like k
        where k.location_id = l.id
      ),
      'phone', l.marketplace_phone,
      'website', l.marketplace_website,
      'instagram', l.marketplace_instagram,
      'openingHours', l.marketplace_opening_hours,
      'rating', s.rating,
      'reviewCount', coalesce(s.review_count, 0)
    ),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id,
        'name', coalesce((
          select nullif(btrim(t.name), '')
          from public.marketplace_category_translation t
          where t.marketplace_category_id = c.id
            and t.locale = v_locale
          limit 1
        ), c.name),
        'slug', c.slug
      ) order by c.sort_order)
      from public.marketplace_category c
      where c.is_active
        and c.id in (
          select lmc.marketplace_category_id
          from public.location_marketplace_category lmc
          where lmc.location_id = l.id
        )
    ), '[]'::jsonb),
    'services', coalesce((
      select jsonb_agg(jsonb_build_object(
        'serviceId', svc.id,
        'name', coalesce((
          select nullif(btrim(t.name), '')
          from public.service_translation t
          where t.service_id = svc.id
            and t.locale = v_locale
          limit 1
        ), svc.name),
        'description', coalesce((
          select nullif(btrim(t.description), '')
          from public.service_translation t
          where t.service_id = svc.id
            and t.locale = v_locale
          limit 1
        ), svc.description),
        'variants', coalesce((
          select jsonb_agg(jsonb_build_object(
            'serviceVariantId', v.id,
            'name', coalesce((
              select nullif(btrim(t.name), '')
              from public.service_variant_translation t
              where t.service_variant_id = v.id
                and t.locale = v_locale
              limit 1
            ), v.name),
            'price', v.price,
            'durationMinutes', v.client_duration_minutes
          ) order by v.display_order nulls last, v.id)
          from public.service_variant v
          where v.service_id = svc.id
            and coalesce(v.is_deleted, false) = false
            and coalesce(v.is_active, true) = true
        ), '[]'::jsonb)
      ) order by svc.display_order nulls last, svc.name)
      from public.location_service ls
      join public.service svc on svc.id = ls.service_id
      where ls.location_id = l.id
        and coalesce(svc.is_deleted, false) = false
        and coalesce(svc.is_active, true) = true
        and svc.is_marketplace_visible
    ), '[]'::jsonb)
  )
  into v_result
  from public.location l
  left join public.marketplace_search_location s on s.location_id = l.id
  where lower(l.slug) = v_slug
    and l.is_listed
    and l.is_active
  limit 1;

  return v_result;
end;
$$;

revoke all on function public.marketplace_location(text, text) from public;

grant execute on function public.marketplace_location(text, text) to anon, authenticated;
