import { isClientVisiblePhase } from "@/lib/api/calendar/layout-segments";

export type CalendarDisplayPhase = {
  phase_type: string;
  starts_at: string;
  ends_at: string;
};

export type CalendarDisplayBoundsInput = {
  phases: CalendarDisplayPhase[] | null | undefined;
  segmentStartsAt: string;
  segmentEndsAt: string;
  appointmentStart?: string | null;
  appointmentEnd?: string | null;
  isSingleSegment: boolean;
};

export type CalendarSegmentLayoutInput = {
  phases: CalendarDisplayPhase[] | null | undefined;
  startsAt: string;
  endsAt: string;
};

export type CalendarBounds = {
  start: Date;
  end: Date;
};

/**
 * Parse appointment.start/end (timestamp without time zone) or timestamptz.
 * Naive values are local wall clock; values with Z / offset are absolute.
 */
export function parseCalendarTimestamp(value: string): Date {
  const trimmed = value.trim();
  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(trimmed)) {
    return new Date(trimmed);
  }
  const normalized = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
  return new Date(normalized);
}

export function clientVisibleSegmentBounds(input: {
  phases: CalendarDisplayPhase[] | null | undefined;
  segmentStartsAt: string;
  segmentEndsAt: string;
}): CalendarBounds {
  const clientPhases = (input.phases || []).filter((phase) =>
    isClientVisiblePhase(phase.phase_type),
  );

  if (clientPhases.length > 0) {
    return {
      start: new Date(
        Math.min(
          ...clientPhases.map((phase) =>
            parseCalendarTimestamp(phase.starts_at).getTime(),
          ),
        ),
      ),
      end: new Date(
        Math.max(
          ...clientPhases.map((phase) =>
            parseCalendarTimestamp(phase.ends_at).getTime(),
          ),
        ),
      ),
    };
  }

  return {
    start: parseCalendarTimestamp(input.segmentStartsAt),
    end: parseCalendarTimestamp(input.segmentEndsAt),
  };
}

export function appointmentHeaderBounds(
  start: string | null | undefined,
  end: string | null | undefined,
): CalendarBounds | null {
  if (!start || !end) return null;
  const headerStart = parseCalendarTimestamp(start);
  const headerEnd = parseCalendarTimestamp(end);
  if (
    Number.isNaN(headerStart.getTime()) ||
    Number.isNaN(headerEnd.getTime()) ||
    headerEnd.getTime() <= headerStart.getTime()
  ) {
    return null;
  }

  return { start: headerStart, end: headerEnd };
}

function unionBounds(segments: CalendarBounds[]): CalendarBounds | null {
  if (segments.length === 0) return null;
  return {
    start: new Date(Math.min(...segments.map((segment) => segment.start.getTime()))),
    end: new Date(Math.max(...segments.map((segment) => segment.end.getTime()))),
  };
}

/**
 * Client-facing visit window for the whole appointment: union of busy+free
 * (or segment windows), stretched to the appointment header when that header
 * is longer. Matches email / Klanthistorie when the header is the booked slot.
 */
export function appointmentVisitBounds(input: {
  segmentBounds: CalendarBounds[];
  appointmentStart?: string | null;
  appointmentEnd?: string | null;
}): CalendarBounds | null {
  const union = unionBounds(input.segmentBounds);
  const header = appointmentHeaderBounds(
    input.appointmentStart,
    input.appointmentEnd,
  );
  if (!union) return header;
  if (!header) return union;

  const unionMs = union.end.getTime() - union.start.getTime();
  const headerMs = header.end.getTime() - header.start.getTime();
  return headerMs > unionMs ? header : union;
}

function mapBoundsOntoVisit(
  segment: CalendarBounds,
  union: CalendarBounds,
  visit: CalendarBounds,
): CalendarBounds {
  const unionMs = union.end.getTime() - union.start.getTime();
  const visitMs = visit.end.getTime() - visit.start.getTime();
  if (unionMs <= 0 || visitMs <= unionMs) return segment;

  const scale = visitMs / unionMs;
  const mapTime = (value: Date) =>
    new Date(
      visit.start.getTime() + (value.getTime() - union.start.getTime()) * scale,
    );
  return { start: mapTime(segment.start), end: mapTime(segment.end) };
}

/**
 * Layout every segment of an appointment for the calendar.
 *
 * Raw block = union of that segment's busy + free (buffer stays off the block).
 * When the appointment header is longer than the written busy+free union
 * (short folded phases, historical keratin squeeze), map each segment
 * proportionally onto the header so the visit still reads as one contiguous
 * client window without stacking every segment on the full header.
 */
export function layoutCalendarSegmentBounds(input: {
  segments: CalendarSegmentLayoutInput[];
  appointmentStart?: string | null;
  appointmentEnd?: string | null;
}): { visit: CalendarBounds | null; segments: CalendarBounds[] } {
  const raw = input.segments.map((segment) =>
    clientVisibleSegmentBounds({
      phases: segment.phases,
      segmentStartsAt: segment.startsAt,
      segmentEndsAt: segment.endsAt,
    }),
  );
  const union = unionBounds(raw);
  const visit = appointmentVisitBounds({
    segmentBounds: raw,
    appointmentStart: input.appointmentStart,
    appointmentEnd: input.appointmentEnd,
  });

  if (!union || !visit) {
    return { visit, segments: raw };
  }

  return {
    visit,
    segments: raw.map((segment) => mapBoundsOntoVisit(segment, union, visit)),
  };
}

/**
 * Client-facing calendar block for one appointment_segment.
 * Prefer {@link layoutCalendarSegmentBounds} when every sibling is available
 * so multi-segment visits can scale onto the appointment header together.
 */
export function calendarDisplayBounds(input: CalendarDisplayBoundsInput): CalendarBounds {
  const raw = clientVisibleSegmentBounds({
    phases: input.phases,
    segmentStartsAt: input.segmentStartsAt,
    segmentEndsAt: input.segmentEndsAt,
  });

  if (!input.isSingleSegment) {
    return raw;
  }

  const laidOut = layoutCalendarSegmentBounds({
    segments: [
      {
        phases: input.phases,
        startsAt: input.segmentStartsAt,
        endsAt: input.segmentEndsAt,
      },
    ],
    appointmentStart: input.appointmentStart,
    appointmentEnd: input.appointmentEnd,
  });

  return laidOut.segments[0] ?? raw;
}
