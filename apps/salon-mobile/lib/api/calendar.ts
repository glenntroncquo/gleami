import { isAppointmentCanceled } from '@/lib/api/appointment-status';
import { parsePhaseType, type PhaseType } from '@/lib/api/services';
import { supabase } from '@/lib/supabase';

export type AppointmentSegmentPhaseRow = {
  id: string;
  sequence: number;
  phase_type: PhaseType;
  starts_at: string;
  ends_at: string;
  staff_id: string;
};

export type AppointmentSegmentRow = {
  id: string;
  sequence: number;
  price: number | null;
  staff_id: string;
  starts_at: string;
  ends_at: string;
  service: {
    id: string;
    name: string;
    color: string | null;
  } | null;
  service_variant: {
    id: string;
    name: string;
    price: number;
    vat_rate: number | null;
  } | null;
  staff: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    image_path: string | null;
  } | null;
  appointment_segment_phase: AppointmentSegmentPhaseRow[];
};

export type AppointmentRow = {
  id: string;
  start: string;
  end: string;
  notes: string | null;
  staff_notes: string | null;
  status: string | null;
  is_canceled: boolean;
  client_id: string | null;
  company_id: string | null;
  location_id: string | null;
  client: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
  staff: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    image_path: string | null;
  } | null;
  appointment_segment: AppointmentSegmentRow[];
};

export type StaffMember = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  image_path: string | null;
};

const APPOINTMENT_SELECT = `
  id,
  start,
  end,
  notes,
  staff_notes,
  status,
  is_canceled,
  client_id,
  company_id,
  location_id,
  client:client_id ( id, first_name, last_name, email ),
  staff:staff_id ( id, first_name, last_name, image_path ),
  appointment_segment (
    id, sequence, price, staff_id, starts_at, ends_at,
    service: service_id ( id, name, color ),
    service_variant: service_variant_id ( id, name, price, vat_rate ),
    staff: staff_id ( id, first_name, last_name, image_path ),
    appointment_segment_phase ( id, sequence, phase_type, starts_at, ends_at, staff_id )
  )
`;

function sortPhases(phases: AppointmentSegmentPhaseRow[] | null | undefined): AppointmentSegmentPhaseRow[] {
  return [...(phases ?? [])]
    .map((phase) => ({
      ...phase,
      phase_type: parsePhaseType(phase.phase_type),
    }))
    .sort((a, b) => a.sequence - b.sequence);
}

function sortSegments(appointments: AppointmentRow[]): AppointmentRow[] {
  return appointments.map((appointment) => ({
    ...appointment,
    appointment_segment: [...(appointment.appointment_segment ?? [])]
      .sort((a, b) => a.sequence - b.sequence)
      .map((segment) => ({
        ...segment,
        appointment_segment_phase: sortPhases(segment.appointment_segment_phase),
      })),
  }));
}

function excludeCanceled(appointments: AppointmentRow[]): AppointmentRow[] {
  return appointments.filter((appointment) => !isAppointmentCanceled(appointment));
}

/**
 * Fetches appointments starting within a single calendar month (local time).
 * Called once per month rather than once for the whole company, so browsing
 * further into the calendar (month, week, or list view) fetches lazily
 * instead of loading the company's entire appointment history up front.
 */
export async function fetchAppointmentsForMonth(
  companyId: string,
  locationId: string,
  year: number,
  monthIndex: number
): Promise<AppointmentRow[]> {
  const monthStart = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const monthEnd = new Date(year, monthIndex + 1, 1, 0, 0, 0, 0);

  const { data, error } = await supabase
    .from('appointment')
    .select(APPOINTMENT_SELECT)
    .eq('company_id', companyId)
    .eq('location_id', locationId)
    .gte('start', monthStart.toISOString())
    .lt('start', monthEnd.toISOString());

  if (error) throw error;
  return excludeCanceled(sortSegments((data as unknown as AppointmentRow[]) ?? []));
}

export async function fetchAppointmentById(appointmentId: string): Promise<AppointmentRow | null> {
  const { data, error } = await supabase.from('appointment').select(APPOINTMENT_SELECT).eq('id', appointmentId).single();

  if (error) throw error;
  const row = data as unknown as AppointmentRow | null;
  return row ? sortSegments([row])[0] : null;
}

export async function fetchStaff(companyId: string, locationId?: string): Promise<StaffMember[]> {
  if (locationId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const live = supabase as any;
    const { data: memberships, error: membershipError } = await live
      .from('location_membership')
      .select('staff:staff_id ( id, first_name, last_name, image_path )')
      .eq('location_id', locationId)
      .eq('is_active', true);
    if (membershipError) throw membershipError;

    const fromMembership = ((memberships as unknown as { staff: StaffMember | StaffMember[] | null }[]) ?? [])
      .flatMap((row) => (Array.isArray(row.staff) ? row.staff : row.staff ? [row.staff] : []))
      .filter((member) => Boolean(member.id));
    const unique = new Map(fromMembership.map((member) => [member.id, member]));
    if (unique.size > 0) {
      return [...unique.values()].sort((a, b) => (a.first_name ?? '').localeCompare(b.first_name ?? ''));
    }
  }

  const { data, error } = await supabase
    .from('staff')
    .select('id, first_name, last_name, image_path')
    .eq('company_id', companyId)
    .order('first_name', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/** Appointment history for a single client, newest first (for the client detail screen). */
export async function fetchClientAppointments(
  clientId: string,
  companyId: string,
  locationId?: string | null
): Promise<AppointmentRow[]> {
  if (!locationId) return [];

  const { data, error } = await supabase
    .from('appointment')
    .select(APPOINTMENT_SELECT)
    .eq('company_id', companyId)
    .eq('location_id', locationId)
    .eq('client_id', clientId)
    .order('start', { ascending: false });

  if (error) throw error;
  return excludeCanceled(sortSegments((data as unknown as AppointmentRow[]) ?? []));
}

/**
 * A single staff member's segments within a date range (staff schedule/roster).
 * Filters on appointment_segment.staff_id — not the vestigial appointment.staff_id.
 */
export async function fetchStaffAppointments(
  staffId: string,
  companyId: string,
  rangeStart: Date,
  rangeEndExclusive: Date,
  locationId?: string
): Promise<AppointmentRow[]> {
  let query = supabase
    .from('appointment_segment')
    .select(
      `
      id, sequence, price, staff_id, starts_at, ends_at,
      service: service_id ( id, name, color ),
      service_variant: service_variant_id ( id, name, price, vat_rate ),
      staff: staff_id ( id, first_name, last_name, image_path ),
      appointment_segment_phase ( id, sequence, phase_type, starts_at, ends_at, staff_id ),
      appointment: appointment_id!inner (
        id, start, end, notes, staff_notes, status, is_canceled, client_id, company_id, location_id,
        client: client_id ( id, first_name, last_name, email ),
        staff: staff_id ( id, first_name, last_name, image_path )
      )
    `
    )
    .eq('company_id', companyId)
    .eq('staff_id', staffId)
    .gte('starts_at', rangeStart.toISOString())
    .lt('starts_at', rangeEndExclusive.toISOString());

  if (locationId) {
    query = query.eq('appointment.location_id', locationId);
  }

  const { data, error } = await query;

  if (error) throw error;

  const byAppointment = new Map<string, AppointmentRow>();
  for (const row of (data as unknown as StaffSegmentQueryRow[]) ?? []) {
    const appointment = row.appointment;
    if (!appointment || isAppointmentCanceled(appointment)) continue;

    const segment: AppointmentSegmentRow = {
      id: row.id,
      sequence: row.sequence,
      price: row.price,
      staff_id: row.staff_id,
      starts_at: row.starts_at,
      ends_at: row.ends_at,
      service: row.service,
      service_variant: row.service_variant,
      staff: row.staff,
      appointment_segment_phase: sortPhases(row.appointment_segment_phase),
    };

    const existing = byAppointment.get(appointment.id);
    if (existing) {
      existing.appointment_segment.push(segment);
    } else {
      byAppointment.set(appointment.id, {
        id: appointment.id,
        start: appointment.start,
        end: appointment.end,
        notes: appointment.notes,
        staff_notes: appointment.staff_notes,
        status: appointment.status,
        is_canceled: appointment.is_canceled,
        client_id: appointment.client_id,
        company_id: appointment.company_id ?? null,
        location_id: appointment.location_id ?? null,
        client: appointment.client,
        staff: appointment.staff,
        appointment_segment: [segment],
      });
    }
  }

  return sortSegments([...byAppointment.values()]);
}

type StaffSegmentQueryRow = AppointmentSegmentRow & {
  appointment: {
    id: string;
    start: string;
    end: string;
    notes: string | null;
    staff_notes: string | null;
    status: string | null;
    is_canceled: boolean;
    client_id: string | null;
    company_id?: string | null;
    location_id?: string | null;
    client: AppointmentRow['client'];
    staff: AppointmentRow['staff'];
  } | null;
};
