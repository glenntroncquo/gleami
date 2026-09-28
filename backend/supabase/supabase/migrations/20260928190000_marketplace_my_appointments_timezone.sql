-- Marketplace customer appointments: add the salon timezone.
-- FILE ONLY — do not apply from CI or an agent. Glenn applies after review.
--
-- appointment.start/end are naive UTC wall time. The marketplace app must
-- render them in the salon's timezone (location.timezone), not the device's,
-- so the customer history RPC now returns it. Changing a function's return
-- type needs a drop + recreate; grants are re-applied below and stay
-- authenticated-only.

drop function if exists public.marketplace_my_appointments(integer, timestamp without time zone);

create function public.marketplace_my_appointments(
  p_limit integer default 50,
  p_before timestamp default null
)
returns table (
  id uuid,
  starts_at timestamp,
  ends_at timestamp,
  status text,
  is_canceled boolean,
  price numeric,
  location_id uuid,
  location_name text,
  location_slug text,
  location_city text,
  location_image_url text,
  location_timezone text,
  services text[]
)
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select
    a.id,
    a.start,
    a."end",
    a.status,
    a.is_canceled,
    a.price,
    a.location_id,
    loc.name,
    loc.slug,
    loc.city,
    loc.image_url,
    loc.timezone,
    coalesce(
      (
        select array_agg(s.name order by seg.sequence)
        from appointment_segment seg
        join service s on s.id = seg.service_id
        where seg.appointment_id = a.id
      ),
      '{}'::text[]
    )
  from appointment a
  join location loc on loc.id = a.location_id
  where a.client_id in (select private.client_ids_for_user())
    and (p_before is null or a.start < p_before)
  order by a.start desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
$$;

revoke all on function public.marketplace_my_appointments(integer, timestamp) from public, anon;
grant execute on function public.marketplace_my_appointments(integer, timestamp) to authenticated;
