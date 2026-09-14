import { createSupabaseClient } from "@/shared/supabase";

export const SALON_TIMEZONE = "Europe/Brussels";
export const TIMETREE_INTEGRATION_TYPE = "timetree";
export const TIMETREE_BASE_URL = "https://timetreeapp.com/api/v1";

const TIMETREE_SESSION_ID = Deno.env.get("TIMETREE_SESSION_ID") ?? "";
const TIMETREE_CSRF_TOKEN = Deno.env.get("TIMETREE_CSRF_TOKEN") ?? "";

export type ServiceEntry = { service: string; serviceVariant: string | null };
export type TimetreeConfig = {
  calendar_id: string;
  alerts: number[];
};

export type AppointmentEventDetails = {
  appointmentId: string;
  calendarId: string;
  externalReferenceId: string | null;
  title: string;
  location: string;
  clientNotes: string;
  alerts: number[];
};

export function assertTimetreeAuth(): void {
  if (!TIMETREE_SESSION_ID || !TIMETREE_CSRF_TOKEN) {
    throw new Error("Missing TIMETREE_SESSION_ID or TIMETREE_CSRF_TOKEN");
  }
}

export function getTimetreeHeaders(): Record<string, string> {
  assertTimetreeAuth();
  return {
    "Content-Type": "application/json",
    "Accept": "*/*",
    "User-Agent": "Mozilla/5.0 (compatible; internal-service)",
    "Cookie": `_session_id=${TIMETREE_SESSION_ID}`,
    "x-csrf-token": TIMETREE_CSRF_TOKEN,
    "x-timetreea": "web/2.1.0/en",
    "Origin": "https://timetreeapp.com",
    "Referer": "https://timetreeapp.com/",
  };
}

function parseAlerts(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);
}

export function parseTimetreeConfig(config: unknown, logScope: string): TimetreeConfig {
  const raw = config as Record<string, unknown> | null;
  const rawCalendarId = raw?.calendar_id;
  const calendarId = rawCalendarId != null ? String(rawCalendarId).trim() : "";
  const alerts = parseAlerts(raw?.alerts);

  console.log(`[timetree-${logScope}] integration config`, {
    config,
    raw_calendar_id: rawCalendarId,
    parsed_calendar_id: calendarId || null,
    parsed_alerts: alerts,
  });

  if (!calendarId) {
    throw new Error("Invalid TimeTree config: calendar_id is required");
  }

  return { calendar_id: calendarId, alerts };
}

export async function fetchTimetreeIntegration(
  supabase: ReturnType<typeof createSupabaseClient>,
  companyId: string,
  logScope: string,
): Promise<TimetreeConfig> {
  console.log(`[timetree-${logScope}] fetching integration`, {
    company_id: companyId,
    integration_type: TIMETREE_INTEGRATION_TYPE,
  });

  const { data, error } = await supabase
    .from("company_integrations")
    .select("config, integration_type, active")
    .eq("company_id", companyId)
    .eq("integration_type", TIMETREE_INTEGRATION_TYPE)
    .eq("active", true)
    .maybeSingle();

  console.log(`[timetree-${logScope}] integration query result`, {
    company_id: companyId,
    found: Boolean(data),
    error: error?.message ?? null,
    integration_type: data?.integration_type ?? null,
    active: data?.active ?? null,
    config: data?.config ?? null,
  });

  if (error) {
    throw new Error(`Error fetching TimeTree integration: ${error.message}`);
  }
  if (!data) {
    throw new Error("No active TimeTree integration for this company");
  }

  return parseTimetreeConfig(data.config, logScope);
}

export function parseSalonLocalTime(raw: string): number {
  const naive = String(raw)
    .replace(/\.\d{3}Z$/, "")
    .replace(/Z$/, "")
    .replace(/\+00:00$/, "");

  const [datePart, timePart = "00:00:00"] = naive.includes("T")
    ? naive.split("T")
    : naive.split(" ");

  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, secondRaw = "0"] = timePart.split(":");
  const second = Number(secondRaw.split(".")[0]);

  return Temporal.ZonedDateTime.from({
    year,
    month,
    day,
    hour: Number(hour),
    minute: Number(minute),
    second,
    timeZone: SALON_TIMEZONE,
  }).epochMilliseconds;
}

export function buildEventTimes(startRaw: string, endRaw: string) {
  const startAt = parseSalonLocalTime(startRaw);
  const endAt = Math.max(parseSalonLocalTime(endRaw), startAt + 30 * 60 * 1000);
  return { startAt, endAt };
}

export function extractTimetreeEventId(responseText: string): string | null {
  try {
    const body = JSON.parse(responseText);
    const id = body?.id ?? body?.data?.id ?? body?.event?.id ??
      body?.data?.attributes?.id;
    return id != null ? String(id) : null;
  } catch {
    return null;
  }
}

function formatServicesList(services: ServiceEntry[]): string {
  return services
    .map((s) => (s.serviceVariant ? `${s.service} - ${s.serviceVariant}` : s.service))
    .join(", ");
}

function buildEventTitle(services: ServiceEntry[], clientName: string): string {
  const servicesPart = services.length > 0
    ? formatServicesList(services)
    : "Unknown service";
  return `${servicesPart} - ${clientName}`;
}

async function fetchAppointmentServices(
  supabase: ReturnType<typeof createSupabaseClient>,
  appointmentId: string,
): Promise<ServiceEntry[]> {
  const { data: segments, error: segmentError } = await supabase
    .from("appointment_segment")
    .select(`
      sequence,
      service:service_id (name),
      service_variant:service_variant_id (name)
    `)
    .eq("appointment_id", appointmentId)
    .order("sequence");

  if (segmentError) {
    throw new Error(`Error fetching appointment services: ${segmentError.message}`);
  }

  return (segments ?? []).map((row) => ({
    service: row.service?.name ?? "Unknown service",
    serviceVariant: row.service_variant?.name ?? null,
  }));
}

export async function fetchAppointmentEventDetails(
  appointmentId: string,
  logScope: string,
): Promise<AppointmentEventDetails> {
  const supabase = createSupabaseClient();

  const { data: appointment, error: appointmentError } = await supabase
    .from("appointment")
    .select("id, company_id, client_id, staff_id, notes, external_reference_id")
    .eq("id", appointmentId)
    .single();

  if (appointmentError || !appointment) {
    throw new Error(
      `Error fetching appointment: ${appointmentError?.message ?? "not found"}`,
    );
  }

  const [
    { data: client, error: clientError },
    { data: staff, error: staffError },
    services,
  ] = await Promise.all([
    supabase
      .from("client")
      .select("first_name, last_name")
      .eq("id", appointment.client_id)
      .single(),
    supabase
      .from("staff")
      .select("first_name, last_name")
      .eq("id", appointment.staff_id)
      .single(),
    fetchAppointmentServices(supabase, appointmentId),
  ]);

  if (clientError || !client) {
    throw new Error(`Error fetching client: ${clientError?.message ?? "not found"}`);
  }
  if (staffError || !staff) {
    throw new Error(`Error fetching staff: ${staffError?.message ?? "not found"}`);
  }

  const clientName = `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim() ||
    "Unknown Client";
  const staffName = `${staff.first_name ?? ""} ${staff.last_name ?? ""}`.trim() ||
    "Unknown Staff";

  const { calendar_id, alerts } = await fetchTimetreeIntegration(
    supabase,
    appointment.company_id,
    logScope,
  );

  console.log(`[timetree-${logScope}] calendar_id`, calendar_id);

  return {
    appointmentId: appointment.id,
    calendarId: calendar_id,
    externalReferenceId: appointment.external_reference_id,
    title: buildEventTitle(services, clientName),
    location: staffName,
    clientNotes: appointment.notes?.trim() ?? "",
    alerts,
  };
}

export function buildCreateEventBody(
  details: Pick<AppointmentEventDetails, "title" | "location" | "clientNotes" | "alerts">,
  startAt: number,
  endAt: number,
) {
  return {
    title: details.title,
    location: details.location,
    all_day: false,
    start_at: startAt,
    start_timezone: SALON_TIMEZONE,
    end_at: endAt,
    end_timezone: SALON_TIMEZONE,
    note: details.clientNotes,
    category: 1,
    ...(details.alerts.length > 0 ? { alerts: details.alerts } : {}),
  };
}

export function buildUpdateEventBody(
  startAt: number,
  endAt: number,
  alerts: number[] = [],
) {
  return {
    all_day: false,
    start_at: startAt,
    start_timezone: SALON_TIMEZONE,
    end_at: endAt,
    end_timezone: SALON_TIMEZONE,
    recurrences: [],
    ...(alerts.length > 0 ? { alerts } : {}),
  };
}

export async function timetreeRequest(
  logScope: string,
  options: {
    method: "POST" | "PUT" | "DELETE";
    calendarId: string;
    eventId?: string;
    body?: Record<string, unknown>;
  },
): Promise<{ ok: boolean; status: number; body: string }> {
  const url = options.eventId
    ? `${TIMETREE_BASE_URL}/calendar/${options.calendarId}/event/${options.eventId}`
    : `${TIMETREE_BASE_URL}/calendar/${options.calendarId}/event`;

  console.log(`[timetree-${logScope}] timetree request`, {
    method: options.method,
    url,
    body: options.body ?? null,
  });

  const res = await fetch(url, {
    method: options.method,
    headers: getTimetreeHeaders(),
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const body = await res.text();
  console.log(`[timetree-${logScope}] timetree response`, {
    status: res.status,
    body,
  });

  return { ok: res.ok, status: res.status, body };
}

export function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function errorResponse(err: unknown, logScope: string): Response {
  console.error(`[timetree-${logScope}] error`, {
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
  return jsonResponse({
    error: "Unhandled exception",
    details: err instanceof Error ? err.message : String(err),
  }, 500);
}
