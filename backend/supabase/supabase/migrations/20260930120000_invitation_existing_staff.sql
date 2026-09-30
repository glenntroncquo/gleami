-- Login invites point at an existing staff row. Accepting the invite
-- links that person's new user to the staff profile instead of creating
-- another employee.

alter table public.invitation
  add column if not exists staff_id uuid references public.staff(id) on delete cascade;

create index if not exists invitation_staff_id_idx
  on public.invitation (staff_id)
  where staff_id is not null;

grant select (staff_id) on table public.invitation to authenticated;
