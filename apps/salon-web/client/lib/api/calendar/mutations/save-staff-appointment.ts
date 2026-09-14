import { createClient } from "@/lib/supabase/client";
import {
  asLocationClient,
  resolveWriteLocationId,
  withOptionalLocationFields,
} from "@/lib/location";
import {
  formatLocalTimestamp,
  isClientVisiblePhase,
  layoutSegments,
  parsePhaseType,
  recipeFromDurations,
  type CatalogPhase,
  type LaidOutSegment,
  type SegmentInput,
} from "@/lib/api/calendar/layout-segments";

export type SaveStaffAppointmentInput = {
  appointmentId?: string;
  companyId: string;
  locationId?: string | null;
  client: {
    id?: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
  start: Date;
  notes: string;
  staffNotes: string;
  staffImagePath?: string | null;
  segments: SegmentInput[];
};

export type SaveStaffAppointmentResult = {
  id: string;
  clientId: string;
  start: string;
  end: string;
};

export async function saveStaffAppointment(
  input: SaveStaffAppointmentInput,
): Promise<{ data: SaveStaffAppointmentResult | null; error: string | null }> {
  if (!input.appointmentId) {
    return {
      data: null,
      error: "Create appointments with appointment-create-staff",
    };
  }
  if (input.segments.length === 0) {
    return { data: null, error: "At least one service is required" };
  }
  if (input.segments.some((segment) => !segment.staffId)) {
    return { data: null, error: "Each service needs a staff member" };
  }

  const supabase = createClient();
  const clientId = input.client.id?.trim() || "";

  const variantIds = [...new Set(input.segments.map((s) => s.serviceVariantId))];
  const { data: phaseRows, error: phaseError } = await supabase
    .from("service_variant_phase")
    .select("service_variant_id, sequence, phase_type, duration_minutes, label")
    .in("service_variant_id", variantIds)
    .order("sequence", { ascending: true });

  if (phaseError) {
    return { data: null, error: phaseError.message };
  }

  const phasesByVariant = new Map<string, CatalogPhase[]>();
  for (const row of phaseRows || []) {
    const list = phasesByVariant.get(row.service_variant_id) || [];
    list.push({
      sequence: row.sequence,
      phase_type: parsePhaseType(row.phase_type),
      duration_minutes: Number(row.duration_minutes),
      label: row.label,
    });
    phasesByVariant.set(row.service_variant_id, list);
  }

  const laidOut = layoutSegments(
    input.start,
    input.segments.map((segment) => ({
      ...segment,
      phases:
        phasesByVariant.get(segment.serviceVariantId) ||
        recipeFromDurations(
          segment.clientDurationMinutes,
          segment.staffDurationMinutes,
        ),
    })),
  );

  const { start: appointmentStart, end: appointmentEnd } =
    clientFacingBounds(laidOut);
  const totalPrice = laidOut.reduce((sum, segment) => sum + (segment.price || 0), 0);
  const primaryStaffId = laidOut[0].staffId;
  const startLocal = formatLocalTimestamp(appointmentStart);
  const endLocal = formatLocalTimestamp(appointmentEnd);

  const appointmentId = input.appointmentId;

  const { data: existingRow } = await asLocationClient(supabase)
    .from("appointment")
    .select("location_id")
    .eq("id", appointmentId)
    .maybeSingle();
  const locationId = resolveWriteLocationId(
    input.locationId,
    (existingRow as { location_id?: string | null } | null)?.location_id,
  );

  const { error: updateError } = await supabase
    .from("appointment")
    .update(
      withOptionalLocationFields(
        {
          start: startLocal,
          end: endLocal,
          staff_id: primaryStaffId,
          ...(clientId
            ? {
                client_id: clientId,
                client_email: input.client.email.trim() || null,
              }
            : {}),
          price: totalPrice,
          notes: input.notes,
          staff_notes: input.staffNotes,
          staff_image_path: input.staffImagePath ?? null,
          allow_overlap: true,
          is_canceled: false,
          status: "scheduled",
          updated_at: new Date().toISOString(),
        },
        locationId,
      ) as never,
    )
    .eq("id", appointmentId);

  if (updateError) {
    return { data: null, error: updateError.message };
  }

  const { error: deleteError } = await supabase
    .from("appointment_segment")
    .delete()
    .eq("appointment_id", appointmentId);

  if (deleteError) {
    return { data: null, error: deleteError.message };
  }

  const { data: insertedSegments, error: segmentError } = await supabase
    .from("appointment_segment")
    .insert(
      laidOut.map((segment) => ({
        company_id: input.companyId,
        ...(locationId ? { location_id: locationId } : {}),
        appointment_id: appointmentId!,
        service_id: segment.serviceId,
        service_variant_id: segment.serviceVariantId,
        staff_id: segment.staffId,
        sequence: segment.sequence,
        starts_at: segment.startsAt.toISOString(),
        ends_at: segment.endsAt.toISOString(),
        price: segment.price,
        price_net: segment.priceNet ?? null,
        allow_overlap: true,
      })) as never,
    )
    .select("id, sequence");

  if (segmentError || !insertedSegments) {
    return {
      data: null,
      error: segmentError?.message || "Failed to save appointment segments",
    };
  }

  const segmentIdBySequence = new Map(
    insertedSegments.map((row) => [row.sequence, row.id]),
  );

  const phaseRowsToInsert = laidOut.flatMap((segment) => {
    const segmentId = segmentIdBySequence.get(segment.sequence);
    if (!segmentId) return [];
    return segment.phases.map((phase) => ({
      company_id: input.companyId,
      ...(locationId ? { location_id: locationId } : {}),
      appointment_segment_id: segmentId,
      staff_id: segment.staffId,
      sequence: phase.sequence,
      phase_type: phase.phase_type,
      starts_at: phase.startsAt.toISOString(),
      ends_at: phase.endsAt.toISOString(),
      allow_overlap: true,
    }));
  });

  if (phaseRowsToInsert.length > 0) {
    const { error: insertPhaseError } = await supabase
      .from("appointment_segment_phase")
      .insert(phaseRowsToInsert as never);

    if (insertPhaseError) {
      return { data: null, error: insertPhaseError.message };
    }
  }

  return {
    data: {
      id: appointmentId!,
      clientId,
      start: startLocal,
      end: endLocal,
    },
    error: null,
  };
}

export async function syncServiceVariantPhases(input: {
  companyId: string;
  serviceVariantId: string;
  phases: CatalogPhase[];
}): Promise<{ error: string | null }> {
  const phases = input.phases
    .filter((phase) => Number(phase.duration_minutes) > 0)
    .map((phase, sequence) => ({
      sequence,
      phase_type: parsePhaseType(phase.phase_type),
      duration_minutes: Number(phase.duration_minutes),
      label: phase.label ?? null,
    }));

  if (phases.length === 0 || !phases.some((phase) => phase.phase_type === "busy")) {
    return { error: "At least one busy phase is required" };
  }

  const supabase = createClient();

  const { error: deleteError } = await supabase
    .from("service_variant_phase")
    .delete()
    .eq("service_variant_id", input.serviceVariantId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  const { error: insertError } = await supabase
    .from("service_variant_phase")
    .insert(
      phases.map((phase) => ({
        company_id: input.companyId,
        service_variant_id: input.serviceVariantId,
        sequence: phase.sequence,
        phase_type: phase.phase_type,
        duration_minutes: phase.duration_minutes,
        label: phase.label,
      })),
    );

  return { error: insertError?.message ?? null };
}

function clientFacingBounds(laidOut: LaidOutSegment[]): {
  start: Date;
  end: Date;
} {
  const visible = laidOut.flatMap((segment) =>
    segment.phases.filter((phase) => isClientVisiblePhase(phase.phase_type)),
  );
  if (visible.length === 0) {
    return {
      start: laidOut[0].startsAt,
      end: laidOut[laidOut.length - 1].endsAt,
    };
  }
  return {
    start: visible[0].startsAt,
    end: visible[visible.length - 1].endsAt,
  };
}
