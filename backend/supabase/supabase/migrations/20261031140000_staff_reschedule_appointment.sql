-- Move one visit by shifting the header and every segment and phase
-- by the same interval. appointment.start/end stay shop wall clock.
-- Segment and phase bounds are timestamptz and move by that same interval.

create or replace function public.staff_reschedule_appointment(
  p_appointment_id uuid,
  p_start timestamp without time zone
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = public
as $$
declare
  v_location_id uuid;
  v_start timestamp;
  v_end timestamp;
  v_canceled boolean;
  v_delta interval;
  v_allowed boolean;
begin
  if auth.uid() is null then
    return jsonb_build_object('error', 'UNAUTHENTICATED');
  end if;
  if p_appointment_id is null or p_start is null then
    return jsonb_build_object('error', 'MISSING');
  end if;

  select a.location_id, a.start, a."end", a.is_canceled
  into v_location_id, v_start, v_end, v_canceled
  from public.appointment a
  where a.id = p_appointment_id;

  if v_location_id is null then
    return jsonb_build_object('error', 'NOT_FOUND');
  end if;
  if not exists (
    select 1
    from public.my_location_ids() as allowed(id)
    where allowed.id = v_location_id
  ) then
    return jsonb_build_object('error', 'FORBIDDEN');
  end if;

  select public.has_permission('calendar:manage', v_location_id) into v_allowed;
  if v_allowed is not true then
    return jsonb_build_object('error', 'FORBIDDEN');
  end if;
  if v_canceled then
    return jsonb_build_object('error', 'CANCELED');
  end if;

  v_delta := p_start - v_start;
  if v_delta = interval '0' then
    return jsonb_build_object(
      'id', p_appointment_id,
      'location_id', v_location_id,
      'date', to_char(v_start, 'YYYY-MM-DD'),
      'start', to_char(v_start, 'HH24:MI'),
      'end', to_char(v_end, 'HH24:MI')
    );
  end if;

  update public.appointment_segment_phase
  set starts_at = starts_at + v_delta,
      ends_at = ends_at + v_delta
  where appointment_segment_id in (
    select seg.id
    from public.appointment_segment seg
    where seg.appointment_id = p_appointment_id
  );

  update public.appointment_segment
  set starts_at = starts_at + v_delta,
      ends_at = ends_at + v_delta
  where appointment_id = p_appointment_id;

  update public.appointment
  set start = start + v_delta,
      "end" = "end" + v_delta
  where id = p_appointment_id;

  select a.start, a."end"
  into v_start, v_end
  from public.appointment a
  where a.id = p_appointment_id;

  return jsonb_build_object(
    'id', p_appointment_id,
    'location_id', v_location_id,
    'date', to_char(v_start, 'YYYY-MM-DD'),
    'start', to_char(v_start, 'HH24:MI'),
    'end', to_char(v_end, 'HH24:MI')
  );
exception
  when exclusion_violation then
    return jsonb_build_object('error', 'SLOT_TAKEN');
end;
$$;

comment on function public.staff_reschedule_appointment(uuid, timestamp) is
  'Shift one visit, every segment, and every phase by the same interval. Wall clock on the header.';

revoke all on function public.staff_reschedule_appointment(uuid, timestamp) from public;
revoke all on function public.staff_reschedule_appointment(uuid, timestamp) from anon;
revoke all on function public.staff_reschedule_appointment(uuid, timestamp) from service_role;
grant execute on function public.staff_reschedule_appointment(uuid, timestamp) to authenticated;
