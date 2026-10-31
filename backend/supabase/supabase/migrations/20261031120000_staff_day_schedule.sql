-- One shop's calendar day for the signed-in staff member.
-- appointment.start and appointment.end are timestamp without time zone and
-- store the shop wall clock. "Today" is the date in location.timezone.

create or replace function public.staff_day_schedule(
  p_location_id uuid default null,
  p_date date default null,
  p_staff_id uuid default null,
  p_include_canceled boolean default false
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_location_id uuid;
  v_location_name text;
  v_tz text;
  v_date date;
  v_count integer;
  v_locations jsonb;
  v_visits jsonb;
  v_truncated boolean := false;
begin
  if auth.uid() is null then
    return jsonb_build_object('error', 'UNAUTHENTICATED');
  end if;

  if p_location_id is null then
    select count(*)::integer into v_count from public.my_location_ids();
    if v_count = 0 then
      return jsonb_build_object('error', 'NO_LOCATIONS');
    end if;
    if v_count > 1 then
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', l.id,
            'name', l.name,
            'timezone', l.timezone
          )
          order by l.name
        ),
        '[]'::jsonb
      )
      into v_locations
      from public.location l
      where l.id in (select my_location_ids from public.my_location_ids());
      return jsonb_build_object('needs_location', true, 'locations', v_locations);
    end if;
    select my_location_ids into v_location_id from public.my_location_ids() limit 1;
  else
    if not exists (
      select 1
      from public.my_location_ids() as allowed(id)
      where allowed.id = p_location_id
    ) then
      return jsonb_build_object('error', 'FORBIDDEN');
    end if;
    v_location_id := p_location_id;
  end if;

  select
    l.name,
    coalesce(nullif(l.timezone, ''), 'Europe/Brussels')
  into v_location_name, v_tz
  from public.location l
  where l.id = v_location_id;

  if v_location_name is null then
    return jsonb_build_object('error', 'FORBIDDEN');
  end if;

  v_date := coalesce(p_date, (now() at time zone v_tz)::date);

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', v.id,
        'start', v.start_time,
        'end', v.end_time,
        'client_name', v.client_name,
        'client_id', v.client_id,
        'is_canceled', v.is_canceled,
        'services', v.services
      )
      order by v.ord
    ),
    '[]'::jsonb
  )
  into v_visits
  from (
    select
      a.id,
      to_char(a.start, 'HH24:MI') as start_time,
      to_char(a."end", 'HH24:MI') as end_time,
      a.start as ord,
      coalesce(
        nullif(trim(both ' ' from concat_ws(' ', c.first_name, c.last_name)), ''),
        'Walk-in'
      ) as client_name,
      c.id as client_id,
      a.is_canceled,
      (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'name', s.name,
              'variant', sv.name,
              'staff_name', nullif(trim(both ' ' from concat_ws(' ', st.first_name, st.last_name)), ''),
              'staff_id', seg.staff_id
            )
            order by seg.sequence
          ),
          '[]'::jsonb
        )
        from public.appointment_segment seg
        left join public.service s on s.id = seg.service_id
        left join public.service_variant sv on sv.id = seg.service_variant_id
        left join public.staff st on st.id = seg.staff_id
        where seg.appointment_id = a.id
      ) as services
    from public.appointment a
    left join public.client c on c.id = a.client_id
    where a.location_id = v_location_id
      and a.start >= v_date::timestamp
      and a.start < (v_date + 1)::timestamp
      and (p_include_canceled or a.is_canceled = false)
      and (
        p_staff_id is null
        or exists (
          select 1
          from public.appointment_segment seg
          where seg.appointment_id = a.id
            and seg.staff_id = p_staff_id
        )
      )
    order by a.start
    limit 101
  ) v;

  if jsonb_array_length(v_visits) > 100 then
    v_truncated := true;
    select coalesce(jsonb_agg(elem order by ord), '[]'::jsonb)
    into v_visits
    from jsonb_array_elements(v_visits) with ordinality as listed(elem, ord)
    where ord <= 100;
  end if;

  return jsonb_build_object(
    'location_id', v_location_id,
    'location_name', v_location_name,
    'timezone', v_tz,
    'date', to_char(v_date, 'YYYY-MM-DD'),
    'truncated', v_truncated,
    'visits', v_visits
  );
end;
$$;

comment on function public.staff_day_schedule(uuid, date, uuid, boolean) is
  'Shop-local calendar day for the signed-in user. Times are wall-clock HH:MM in location.timezone.';

revoke all on function public.staff_day_schedule(uuid, date, uuid, boolean) from public;
revoke all on function public.staff_day_schedule(uuid, date, uuid, boolean) from anon;
revoke all on function public.staff_day_schedule(uuid, date, uuid, boolean) from service_role;
grant execute on function public.staff_day_schedule(uuid, date, uuid, boolean) to authenticated;
