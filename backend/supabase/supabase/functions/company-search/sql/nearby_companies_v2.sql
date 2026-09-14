CREATE OR REPLACE FUNCTION public.nearby_companies_v2(user_lat double precision, user_lon double precision, radius_m double precision, search_term text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, name text, street text, postal_code text, city text, latitude double precision, longitude double precision, distance_m double precision)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.street,
    c.postal_code,
    c.city,
    ST_Y(c.geo_location::geometry)::float AS latitude,
    ST_X(c.geo_location::geometry)::float AS longitude,
    ST_Distance(
      c.geo_location::geography,
      ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography
    )::float AS distance_m
  FROM company c
  WHERE ST_DWithin(
    c.geo_location::geography,
    ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography,
    radius_m
  )
  AND (
    search_term IS NULL
    OR LOWER(c.name) LIKE '%' || LOWER(search_term) || '%'
  )
  ORDER BY distance_m ASC;
END;
$function$
