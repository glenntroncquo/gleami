import { clientFacingBounds, layoutAppointmentSegments } from '@/lib/api/appointment-layout';
import type { AppointmentRow } from '@/lib/api/calendar';
import type { CartItem } from '@/lib/appointment-draft';
import { formatSalonWallClockTimestamp, minutesBetweenWallClock } from '@/components/calendar/date-utils';
import { parsePhaseType } from '@/lib/api/services';
import { supabase } from '@/lib/supabase';

export type UpdateAppointmentInput = {
  appointmentId: string;
  companyId: string;
  locationId: string;
  clientId: string;
  email: string;
  start: Date;
  notes: string;
  staffNotes: string | null;
  segments: CartItem[];
};

export function cartFromAppointment(row: AppointmentRow): CartItem[] {
  return [...(row.appointment_segment ?? [])]
    .sort((a, b) => a.sequence - b.sequence)
    .flatMap((segment) => {
      if (!segment.service || !segment.service_variant) return [];
      const phases = [...(segment.appointment_segment_phase ?? [])]
        .sort((a, b) => a.sequence - b.sequence)
        .map((phase) => ({
          sequence: phase.sequence,
          phase_type: parsePhaseType(phase.phase_type),
          duration_minutes: Math.max(1, minutesBetweenWallClock(phase.starts_at, phase.ends_at)),
        }));
      const clientMinutes = phases
        .filter((phase) => phase.phase_type === 'busy' || phase.phase_type === 'free')
        .reduce((sum, phase) => sum + phase.duration_minutes, 0);
      const span = Math.max(1, minutesBetweenWallClock(segment.starts_at, segment.ends_at));
      return [
        {
          serviceId: segment.service.id,
          serviceVariantId: segment.service_variant.id,
          serviceName: segment.service.name,
          color: segment.service.color,
          variantName: segment.service_variant.name,
          price: Number(segment.price ?? segment.service_variant.price ?? 0),
          durationMinutes: clientMinutes || span,
          staffId: segment.staff_id,
          phases,
        },
      ];
    });
}

/** Update an existing visit the same way salon-web saves it, with wall-clock timestamps. */
export async function updateAppointment(input: UpdateAppointmentInput): Promise<void> {
  if (input.segments.length === 0) {
    throw new Error('At least one service is required');
  }

  const laidOut = layoutAppointmentSegments(input.start, input.segments);
  const bounds = clientFacingBounds(laidOut);
  const totalPrice = laidOut.reduce((sum, segment) => sum + Number(segment.price || 0), 0);
  const primaryStaffId = laidOut[0].staffId;

  const { error: updateError } = await supabase
    .from('appointment')
    .update({
      start: formatSalonWallClockTimestamp(bounds.start),
      end: formatSalonWallClockTimestamp(bounds.end),
      staff_id: primaryStaffId,
      client_id: input.clientId,
      client_email: input.email.trim() || null,
      price: totalPrice,
      notes: input.notes,
      staff_notes: input.staffNotes,
      location_id: input.locationId,
      allow_overlap: true,
      is_canceled: false,
      status: 'scheduled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.appointmentId);

  if (updateError) throw updateError;

  const { data: existingSegments, error: existingError } = await supabase
    .from('appointment_segment')
    .select('id')
    .eq('appointment_id', input.appointmentId);
  if (existingError) throw existingError;

  const existingIds = (existingSegments ?? []).map((row) => row.id);
  if (existingIds.length > 0) {
    const { error: phaseDeleteError } = await supabase
      .from('appointment_segment_phase')
      .delete()
      .in('appointment_segment_id', existingIds);
    if (phaseDeleteError) throw phaseDeleteError;
  }

  const { error: deleteError } = await supabase
    .from('appointment_segment')
    .delete()
    .eq('appointment_id', input.appointmentId);
  if (deleteError) throw deleteError;

  const { data: insertedSegments, error: segmentError } = await supabase
    .from('appointment_segment')
    .insert(
      laidOut.map((segment) => ({
        company_id: input.companyId,
        location_id: input.locationId,
        appointment_id: input.appointmentId,
        service_id: segment.serviceId,
        service_variant_id: segment.serviceVariantId,
        staff_id: segment.staffId,
        sequence: segment.sequence,
        starts_at: formatSalonWallClockTimestamp(segment.startsAt),
        ends_at: formatSalonWallClockTimestamp(segment.endsAt),
        price: segment.price,
        allow_overlap: true,
      }))
    )
    .select('id, sequence');

  if (segmentError || !insertedSegments) {
    throw segmentError ?? new Error('Failed to save appointment segments');
  }

  const segmentIdBySequence = new Map(insertedSegments.map((row) => [row.sequence, row.id]));
  const phaseRows = laidOut.flatMap((segment) => {
    const segmentId = segmentIdBySequence.get(segment.sequence);
    if (!segmentId) return [];
    return segment.phases.map((phase) => ({
      company_id: input.companyId,
      appointment_segment_id: segmentId,
      staff_id: segment.staffId,
      sequence: phase.sequence,
      phase_type: phase.phase_type,
      starts_at: formatSalonWallClockTimestamp(phase.startsAt),
      ends_at: formatSalonWallClockTimestamp(phase.endsAt),
      allow_overlap: true,
    }));
  });

  if (phaseRows.length === 0) return;

  const { error: phaseError } = await supabase.from('appointment_segment_phase').insert(phaseRows);
  if (phaseError) throw phaseError;
}
