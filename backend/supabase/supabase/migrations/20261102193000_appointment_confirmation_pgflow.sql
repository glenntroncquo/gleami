-- Replace the appointment-insert HTTP webhook with a pgflow job in the
-- same transaction as the insert. The flow must already be compiled by
-- starting appointment-created-worker once. start_flow raises
-- if it is missing, and that rolls the booking back.
--
-- confirmation_sent goes with the webhook. pgflow records that sendEmails
-- finished, and the worker does not update appointment (that write used to
-- re-enter the update webhook).

do $$
begin
  if not exists (
    select 1
    from pgflow.flows
    where flow_slug = 'appointment_created'
  ) then
    raise exception
      'appointment_created is not compiled. Start appointment-created-worker once before applying this migration.';
  end if;
end
$$;

create or replace function public.enqueue_appointment_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public, pgflow, pg_temp
as $$
begin
  perform pgflow.start_flow(
    flow_slug => 'appointment_created',
    input => jsonb_build_object('appointmentId', new_appointments.id)
  )
  from new_appointments;

  return null;
end;
$$;

revoke all on function public.enqueue_appointment_confirmation() from public, anon, authenticated;
grant execute on function public.enqueue_appointment_confirmation() to service_role;

drop trigger if exists appointment_insert_email on public.appointment;
drop trigger if exists appointment_created on public.appointment;

create trigger appointment_confirmation_enqueue
  after insert on public.appointment
  referencing new table as new_appointments
  for each statement
  execute function public.enqueue_appointment_confirmation();

alter table public.appointment
  drop column if exists confirmation_sent;
