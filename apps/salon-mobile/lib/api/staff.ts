import { supabase } from '@/lib/supabase';

/** Live tables/RPCs exist; generated types in this repo predate memberships. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const live = supabase as any;

/**
 * System `role` rows (scope=location). Live `role` has RLS and no SELECT policy,
 * so the client cannot look these up — these IDs are the catalog rows from
 * `kvhinnhnwgvdpzggdnxs` (never mutate system roles).
 */
const SYSTEM_LOCATION_ROLE_STYLIST = '09ea05b0-3ec1-4481-a6b8-21bc4bfa2a44';
const SYSTEM_LOCATION_ROLE_STAFF = '7a2a1bc5-5cce-4a9e-94d1-2ec39e4d78c6';

export type Staff = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  specialization: string | null;
  status: string | null;
  image_path: string | null;
  user_id?: string | null;
};

export type StaffFields = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialization: string;
  status: string;
};

const STAFF_SELECT = 'id, first_name, last_name, email, phone, specialization, status, image_path, user_id';

export function requireLocationId(locationId: string | null | undefined): string {
  if (!locationId) {
    throw new Error('locationId is required');
  }
  return locationId;
}

async function resolveNewStaffRoleId(): Promise<string> {
  const { data } = await live
    .from('role')
    .select('id, name')
    .eq('is_system', true)
    .eq('scope', 'location')
    .in('name', ['stylist', 'staff']);

  const rows = (Array.isArray(data) ? data : []) as { id?: string; name?: string }[];
  const stylist = rows.find((row) => row.name === 'stylist' && typeof row.id === 'string');
  if (stylist?.id) return stylist.id;
  const staff = rows.find((row) => row.name === 'staff' && typeof row.id === 'string');
  if (staff?.id) return staff.id;
  return SYSTEM_LOCATION_ROLE_STYLIST;
}

function isMissingMembershipUserIdError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const record = error as { code?: string; message?: string };
  const message = (record.message ?? '').toLowerCase();
  return (
    record.code === '23502' ||
    (message.includes('user_id') && (message.includes('null') || message.includes('not-null') || message.includes('not null')))
  );
}

async function insertLocationMembershipForStaff(
  staffId: string,
  locationId: string,
  userId: string | null | undefined
): Promise<void> {
  const roleId = await resolveNewStaffRoleId();
  const row: Record<string, unknown> = {
    location_id: locationId,
    role_id: roleId,
    is_active: true,
    staff_id: staffId,
  };
  if (userId) {
    row.user_id = userId;
  }

  const { error } = await live.from('location_membership').insert(row);
  if (!error) return;
  if (isMissingMembershipUserIdError(error)) throw error;

  // Retry with the staff catalog role if the stylist id is stale.
  if (roleId === SYSTEM_LOCATION_ROLE_STYLIST) {
    const retry = await live.from('location_membership').insert({
      ...row,
      role_id: SYSTEM_LOCATION_ROLE_STAFF,
    });
    if (!retry.error) return;
    throw retry.error;
  }
  throw error;
}

export async function fetchAllStaff(companyId: string): Promise<Staff[]> {
  const { data, error } = await supabase
    .from('staff')
    .select(STAFF_SELECT)
    .eq('company_id', companyId)
    .order('first_name', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function fetchStaffMember(staffId: string): Promise<Staff | null> {
  const { data, error } = await supabase.from('staff').select(STAFF_SELECT).eq('id', staffId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createStaff(companyId: string, fields: StaffFields, locationId: string): Promise<Staff> {
  const shopId = requireLocationId(locationId);
  const { data, error } = await supabase
    .from('staff')
    .insert({
      company_id: companyId,
      first_name: fields.firstName || null,
      last_name: fields.lastName || null,
      email: fields.email,
      phone: fields.phone || null,
      specialization: fields.specialization || null,
      status: fields.status || null,
    })
    .select(STAFF_SELECT)
    .single();

  if (error) throw error;

  try {
    await insertLocationMembershipForStaff(data.id, shopId, data.user_id);
  } catch (membershipError) {
    // Live location_membership.user_id is NOT NULL + FK to auth.users.
    // Bookable staff created from this screen usually have no login yet —
    // keep the staff row so the company directory still works.
    if (!data.user_id && isMissingMembershipUserIdError(membershipError)) {
      return data;
    }
    await supabase.from('staff').delete().eq('id', data.id);
    throw membershipError;
  }

  return data;
}

export async function updateStaff(staffId: string, fields: Partial<StaffFields>): Promise<void> {
  const patch: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string;
    phone?: string | null;
    specialization?: string | null;
    status?: string | null;
  } = {};
  if (fields.firstName !== undefined) patch.first_name = fields.firstName || null;
  if (fields.lastName !== undefined) patch.last_name = fields.lastName || null;
  if (fields.email !== undefined) patch.email = fields.email;
  if (fields.phone !== undefined) patch.phone = fields.phone || null;
  if (fields.specialization !== undefined) patch.specialization = fields.specialization || null;
  if (fields.status !== undefined) patch.status = fields.status || null;

  const { error } = await supabase.from('staff').update(patch).eq('id', staffId);
  if (error) throw error;
}

export async function updateStaffImagePath(staffId: string, companyId: string, imagePath: string): Promise<void> {
  const { error } = await supabase.from('staff').update({ image_path: imagePath }).eq('id', staffId).eq('company_id', companyId).select('id').single();
  if (error) throw error;
}

export type ScheduleRule = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

function padTime(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatTimeOfDay(hours: number, minutes: number): string {
  return `${padTime(hours)}:${padTime(minutes)}:00`;
}

export function parseTimeOfDay(value: string): { hours: number; minutes: number } {
  const timePart = value.includes('T') ? (value.split('T')[1] ?? '00:00:00') : value;
  const [hh, mm] = timePart.split(':');
  return { hours: Number(hh) || 0, minutes: Number(mm) || 0 };
}

export async function fetchScheduleRules(staffId: string, companyId: string, locationId?: string): Promise<ScheduleRule[]> {
  let query = supabase
    .from('staff_schedule_rule')
    .select('id, day_of_week, start_time, end_time')
    .eq('staff_id', staffId)
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('day_of_week', { ascending: true });
  if (locationId) query = query.eq('location_id', locationId);
  const { data, error } = await query;

  if (error) throw error;
  return (data as ScheduleRule[]) ?? [];
}

export async function createScheduleRule(
  staffId: string,
  companyId: string,
  dayOfWeek: number,
  startHours: number,
  startMinutes: number,
  endHours: number,
  endMinutes: number,
  locationId: string
): Promise<void> {
  const shopId = requireLocationId(locationId);
  const { error } = await supabase.from('staff_schedule_rule').insert({
    staff_id: staffId,
    company_id: companyId,
    location_id: shopId,
    day_of_week: dayOfWeek,
    start_time: formatTimeOfDay(startHours, startMinutes),
    end_time: formatTimeOfDay(endHours, endMinutes),
    is_active: true,
  });
  if (error) throw error;
}

export async function updateScheduleRule(
  id: string,
  startHours: number,
  startMinutes: number,
  endHours: number,
  endMinutes: number
): Promise<void> {
  const { error } = await supabase
    .from('staff_schedule_rule')
    .update({
      start_time: formatTimeOfDay(startHours, startMinutes),
      end_time: formatTimeOfDay(endHours, endMinutes),
    })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteScheduleRule(id: string): Promise<void> {
  const { error } = await supabase.from('staff_schedule_rule').delete().eq('id', id);
  if (error) throw error;
}

export type ScheduleException = {
  id: string;
  starts_at: string;
  ends_at: string;
  kind: 'unavailable' | 'available_addition';
};

export async function fetchTimeOff(staffId: string, companyId: string, locationId?: string): Promise<ScheduleException[]> {
  let query = supabase
    .from('staff_schedule_exception')
    .select('id, starts_at, ends_at, kind')
    .eq('staff_id', staffId)
    .eq('company_id', companyId)
    .eq('kind', 'unavailable')
    .order('starts_at', { ascending: false });
  if (locationId) query = query.eq('location_id', locationId);
  const { data, error } = await query;

  if (error) throw error;
  return (data as ScheduleException[]) ?? [];
}

/** Single calendar day only — the web dialog itself has no multi-day range picker. */
export async function createTimeOff(
  staffId: string,
  companyId: string,
  date: Date,
  startHours: number,
  startMinutes: number,
  endHours: number,
  endMinutes: number,
  locationId: string
): Promise<void> {
  const shopId = requireLocationId(locationId);
  const start = new Date(date);
  start.setHours(startHours, startMinutes, 0, 0);
  const end = new Date(date);
  const isEndOfDay = endHours === 23 && endMinutes === 59;
  end.setHours(endHours, endMinutes, isEndOfDay ? 59 : 0, 0);

  const { error } = await supabase.from('staff_schedule_exception').insert({
    staff_id: staffId,
    company_id: companyId,
    location_id: shopId,
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
    kind: 'unavailable',
  });
  if (error) throw error;
}

export async function deleteTimeOff(id: string): Promise<void> {
  const { error } = await supabase.from('staff_schedule_exception').delete().eq('id', id);
  if (error) throw error;
}
