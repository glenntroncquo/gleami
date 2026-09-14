CREATE OR REPLACE FUNCTION public.search_clients_by_company(search_term text, p_company_id uuid DEFAULT NULL)
 RETURNS TABLE(id uuid, first_name text, last_name text, email text, rank real)
 LANGUAGE plpgsql
AS $function$BEGIN
 DECLARE
  query tsquery;
 BEGIN
  query := to_tsquery('simple', search_term || ':*');

  RETURN QUERY
  SELECT
   c.id,
   c.first_name,
   c.last_name,
   c.email,
   ts_rank_cd(c.search_vector, query)::REAL AS rank
  FROM client c
  WHERE c.search_vector @@ query
    AND (
      p_company_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM client_location cl
        JOIN location loc ON loc.id = cl.location_id
        WHERE cl.client_id = c.id
          AND loc.company_id = p_company_id
      )
    )
  ORDER BY rank DESC
  LIMIT 50;
 END;
EXCEPTION WHEN OTHERS THEN
 RETURN;
END;$function$
