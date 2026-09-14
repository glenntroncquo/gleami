import { supabaseAdmin } from "../infrastructure/supabase/client.ts";
import { RepositoryError } from "../infrastructure/errors.ts";
import {
  toAppointment,
  toCanceledAppointment,
  toAppointmentListItem,
  toStaffScheduleRule,
  toStaffScheduleException,
  toBusyPhaseWindow,
  type AppointmentListItemRow,
} from "./mapper.ts";
import type {
  Appointment,
  CanceledAppointment,
  AppointmentListItem,
  StaffScheduleRule,
  StaffScheduleException,
  BusyPhaseWindow,
  BookingSegmentInput,
} from "./entity.ts";

export interface CancelAppointmentParams {
  appointmentId: string;
  clientId: string;
  companyId: string;
  locationId?: string;
  canceledBy?: string;
}

export interface AvailabilityWindowQueryParams {
  companyId: string;
  staffIds: string[];
  rangeStart: Date;
  rangeEnd: Date;
  locationId?: string | null;
}

export interface FindUpcomingAppointmentsParams {
  clientId: string;
  companyId: string;
}

export interface CreateStaffAppointmentParams {
  companyId: string;
  staffId: string;
  clientId?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  segments: BookingSegmentInput[];
  price: number;
  notes: string;
  staffNotes: string | null;
  durationInMinutes: number;
  start: string;
  end: string;
  imagePath: string | null;
  locationId?: string | null;
}

export type CreateStaffAppointmentResult =
  | { success: true; id: string; clientId: string }
  | { success: false; error: string };

export interface CreateAppointmentWithReferralParams {
  companyId: string;
  staffId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  segments: BookingSegmentInput[];
  price: number;
  notes: string;
  durationInMinutes: number;
  start: string;
  end: string;
  imagePath: string | null;
  referralCode: string | null;
  locationId?: string | null;
}

export type CreateAppointmentWithReferralResult =
  | { success: true; id: string; clientId: string }
  | { success: false; error: string };

function toRpcSegments(segments: BookingSegmentInput[]) {
  return segments.map((segment) => ({
    service_id: segment.serviceId,
    service_variant_id: segment.serviceVariantId,
    staff_id: segment.staffId,
  }));
}

/**
 * Call v1 RPCs (create_appointment_staff / create_appointment_with_referral). Leftover *_v2 names are dropped.
 * Production signatures still take p_actual_start / p_actual_end / p_duration_in_minutes until a later SQL DROP.
 * Copy naive start/end (and client-facing duration) into those args — occupancy is appointment_segment_phase, not actual_*.
 */

export const appointmentRepository = {
  async findById(id: string): Promise<Appointment | null> {
    const { data, error } = await supabaseAdmin
      .from("appointment")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new RepositoryError("Failed to fetch appointment by id", { cause: error });
    }

    return data ? toAppointment(data) : null;
  },

  async findManyByCompanyId(companyId: string): Promise<Appointment[]> {
    const { data, error } = await supabaseAdmin
      .from("appointment")
      .select("*")
      .eq("company_id", companyId);

    if (error) {
      throw new RepositoryError("Failed to fetch appointments by company id", { cause: error });
    }

    return (data ?? []).map(toAppointment);
  },

  async cancel(params: CancelAppointmentParams): Promise<CanceledAppointment | null> {
    let query = supabaseAdmin
      .from("appointment")
      .update({
        is_canceled: true,
        ...(params.canceledBy ? { canceled_by: params.canceledBy } : {}),
      })
      .eq("id", params.appointmentId)
      .eq("client_id", params.clientId)
      .eq("company_id", params.companyId);

    if (params.locationId) {
      query = query.eq("location_id", params.locationId);
    }

    const { data, error } = await query
      .select("id, start, end, is_canceled")
      .maybeSingle();

    if (error) {
      throw new RepositoryError("Failed to cancel appointment", { cause: error });
    }

    if (!data) return null;

    const { data: segments, error: segmentError } = await supabaseAdmin
      .from("appointment_segment")
      .select("id")
      .eq("appointment_id", params.appointmentId);

    if (segmentError) {
      throw new RepositoryError("Failed to load segments for canceled appointment", {
        cause: segmentError,
      });
    }

    const segmentIds = (segments ?? []).map((segment) => segment.id);
    if (segmentIds.length > 0) {
      const { error: phaseError } = await supabaseAdmin
        .from("appointment_segment_phase")
        .update({ allow_overlap: true })
        .in("appointment_segment_id", segmentIds);

      if (phaseError) {
        throw new RepositoryError("Failed to release busy/buffer phases for canceled appointment", {
          cause: phaseError,
        });
      }
    }

    return toCanceledAppointment(data);
  },

  async findUpcomingByClientAndCompany(
    params: FindUpcomingAppointmentsParams,
  ): Promise<AppointmentListItem[]> {
    const { data, error } = await supabaseAdmin
      .from("appointment")
      .select(
        `
        id,
        start,
        end,
        notes,
        is_canceled,
        staff:staff_id (
          id,
          first_name,
          last_name
        ),
        appointment_segment (
          id,
          staff_id,
          sequence,
          starts_at,
          ends_at,
          service:service_id (
            id,
            name
          ),
          service_variant:service_variant_id (
            id,
            name
          )
        )
      `,
      )
      .eq("client_id", params.clientId)
      .eq("company_id", params.companyId)
      .eq("is_canceled", false)
      .gte("start", new Date().toISOString())
      .order("start", { ascending: true });

    if (error) {
      throw new RepositoryError("Failed to fetch appointments for client", { cause: error });
    }

    return ((data ?? []) as unknown as AppointmentListItemRow[]).map(toAppointmentListItem);
  },

  async createForStaff(params: CreateStaffAppointmentParams): Promise<CreateStaffAppointmentResult> {
    const { data, error } = await supabaseAdmin.rpc("create_appointment_staff", {
      p_company_id: params.companyId,
      p_staff_id: params.staffId,
      p_client_id: params.clientId ?? null,
      p_email: params.email ?? undefined,
      p_first_name: params.firstName ?? undefined,
      p_last_name: params.lastName ?? undefined,
      p_phone: params.phone ?? undefined,
      p_segments: toRpcSegments(params.segments),
      p_price: params.price,
      p_notes: params.notes,
      p_staff_notes: params.staffNotes,
      p_duration_in_minutes: params.durationInMinutes,
      p_start: params.start,
      p_end: params.end,
      p_actual_start: params.start,
      p_actual_end: params.end,
      p_image_path: params.imagePath as string,
      p_location_id: params.locationId ?? undefined,
    });

    if (error) {
      throw new RepositoryError("Failed to create staff appointment", { cause: error });
    }

    const result = data as
      | { success?: boolean; id?: string; client_id?: string; error?: string }
      | null;

    if (result?.error) {
      return { success: false, error: result.error };
    }

    if (!result?.success || !result.id) {
      return { success: false, error: "BOOKING_SLOT_TAKEN" };
    }

    return { success: true, id: result.id, clientId: result.client_id ?? "" };
  },

  async createWithReferral(
    params: CreateAppointmentWithReferralParams,
  ): Promise<CreateAppointmentWithReferralResult> {
    const { data, error } = await supabaseAdmin.rpc("create_appointment_with_referral", {
      p_company_id: params.companyId,
      p_staff_id: params.staffId,
      p_email: params.email,
      p_first_name: params.firstName,
      p_last_name: params.lastName,
      p_phone: params.phone,
      p_price: params.price,
      p_notes: params.notes,
      p_duration_in_minutes: params.durationInMinutes,
      p_start: params.start,
      p_end: params.end,
      p_actual_start: params.start,
      p_actual_end: params.end,
      p_image_path: params.imagePath as string,
      p_segments: toRpcSegments(params.segments),
      p_referral_code: params.referralCode ?? undefined,
      p_location_id: params.locationId ?? undefined,
    });

    if (error) {
      throw new RepositoryError("Failed to create appointment with referral", { cause: error });
    }

    const result = data as
      | { success?: boolean; id?: string; client_id?: string; error?: string }
      | null;

    if (result?.error) {
      return { success: false, error: result.error };
    }

    if (!result?.success || !result.id) {
      return { success: false, error: "BOOKING_SLOT_TAKEN" };
    }

    return { success: true, id: result.id, clientId: result.client_id ?? "" };
  },

  async findScheduleRulesForStaff(
    params: AvailabilityWindowQueryParams,
  ): Promise<StaffScheduleRule[]> {
    let query = supabaseAdmin
      .from("staff_schedule_rule")
      .select("staff_id, day_of_week, start_time, end_time, effective_from, effective_to, is_active")
      .eq("company_id", params.companyId)
      .in("staff_id", params.staffIds)
      .eq("is_active", true);

    if (params.locationId) {
      query = query.eq("location_id", params.locationId);
    }

    const { data, error } = await query;

    if (error) {
      throw new RepositoryError("Failed to fetch staff schedule rules", { cause: error });
    }

    return (data ?? []).map(toStaffScheduleRule);
  },

  async findScheduleExceptionsForStaff(
    params: AvailabilityWindowQueryParams,
  ): Promise<StaffScheduleException[]> {
    let query = supabaseAdmin
      .from("staff_schedule_exception")
      .select("staff_id, kind, starts_at, ends_at")
      .eq("company_id", params.companyId)
      .in("staff_id", params.staffIds)
      .lte("starts_at", params.rangeEnd.toISOString())
      .gte("ends_at", params.rangeStart.toISOString());

    if (params.locationId) {
      query = query.eq("location_id", params.locationId);
    }

    const { data, error } = await query;

    if (error) {
      throw new RepositoryError("Failed to fetch staff schedule exceptions", { cause: error });
    }

    return (data ?? []).map(toStaffScheduleException);
  },

  async findBusyPhasesForStaff(
    params: AvailabilityWindowQueryParams,
  ): Promise<BusyPhaseWindow[]> {
    let query = supabaseAdmin
      .from("appointment_segment_phase")
      .select(
        `
        staff_id,
        starts_at,
        ends_at,
        allow_overlap,
        phase_type,
        appointment_segment:appointment_segment_id (
          appointment:appointment_id (
            is_canceled
          )
        )
      `,
      )
      .eq("company_id", params.companyId)
      .in("staff_id", params.staffIds)
      .in("phase_type", ["busy", "buffer"])
      .eq("allow_overlap", false)
      .lte("starts_at", params.rangeEnd.toISOString())
      .gte("ends_at", params.rangeStart.toISOString());

    if (params.locationId) {
      query = query.eq("location_id", params.locationId);
    }

    const { data, error } = await query;

    if (error) {
      throw new RepositoryError("Failed to fetch busy phases for availability check", {
        cause: error,
      });
    }

    return (data ?? [])
      .filter((row) => {
        const nested = row.appointment_segment as
          | { appointment?: { is_canceled?: boolean } | { is_canceled?: boolean }[] }
          | { appointment?: { is_canceled?: boolean } | { is_canceled?: boolean }[] }[]
          | null;
        const segment = Array.isArray(nested) ? nested[0] : nested;
        const appointment = Array.isArray(segment?.appointment)
          ? segment?.appointment[0]
          : segment?.appointment;
        return appointment?.is_canceled !== true;
      })
      .map((row) =>
        toBusyPhaseWindow({
          staff_id: row.staff_id,
          starts_at: row.starts_at,
          ends_at: row.ends_at,
        }),
      );
  },
};
