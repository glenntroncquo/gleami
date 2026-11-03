-- Replace the appointment-update HTTP webhook with a pgflow job in the
-- same transaction as the update. The flow must already be compiled by
-- starting appointment-updated-worker once. start_flow raises if it is
-- missing, and that rolls the update back.
--
-- Only a cancellation, or a future change of start, end, staff, or location,
-- is enqueued. Setting reminder_sent does not. The worker does not update
-- appointment, so this trigger does not re-enter itself.

do $$
begin
  if not exists (
    select 1
    from pgflow.flows
    where flow_slug = 'appointment_updated'
  ) then
    raise exception
      'appointment_updated is not compiled. Start appointment-updated-worker once before applying this migration.';
  end if;
end
$$;

create or replace function public.enqueue_appointment_update()
returns trigger
language plpgsql
security definer
set search_path = public, pgflow, pg_temp
as $$
begin
  perform pgflow.start_flow(
    flow_slug => 'appointment_updated',
    input => jsonb_build_object(
      'appointmentId', n.id,
      'kind', case
        when o.is_canceled is not true and n.is_canceled is true then 'cancellation'
        else 'update'
      end
    )
  )
  from new_appointments n
  join old_appointments o on o.id = n.id
  where not (o.reminder_sent is not true and n.reminder_sent is true)
    and (
      (o.is_canceled is not true and n.is_canceled is true)
      or (
        n.is_canceled is not true
        and coalesce(n."end", n.start) >= now()
        and (
          o.start is distinct from n.start
          or o."end" is distinct from n."end"
          or o.staff_id is distinct from n.staff_id
          or o.location_id is distinct from n.location_id
        )
      )
    );

  return null;
end;
$$;

revoke all on function public.enqueue_appointment_update() from public, anon, authenticated;
grant execute on function public.enqueue_appointment_update() to service_role;

drop trigger if exists appointment_update_email on public.appointment;

create trigger appointment_update_enqueue
  after update on public.appointment
  referencing old table as old_appointments new table as new_appointments
  for each statement
  execute function public.enqueue_appointment_update();
