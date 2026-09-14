/** busy + free = client duration. busy + buffer = staff duration. */
export type PhaseType = "busy" | "free" | "buffer";

export type CatalogPhase = {
  sequence: number;
  phase_type: PhaseType;
  duration_minutes: number;
  label?: string | null;
};

export type LaidOutPhase = CatalogPhase & {
  startsAt: Date;
  endsAt: Date;
};

export type SegmentInput = {
  serviceId: string;
  serviceVariantId: string;
  staffId: string;
  price: number;
  priceNet?: number | null;
  clientDurationMinutes: number;
  staffDurationMinutes?: number | null;
  phases?: CatalogPhase[];
};

export type LaidOutSegment = Omit<SegmentInput, "phases"> & {
  sequence: number;
  startsAt: Date;
  endsAt: Date;
  phases: LaidOutPhase[];
};

/** Format a local wall-clock timestamp for appointment.start/end (timestamp without time zone). */
export function formatLocalTimestamp(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${d}T${hh}:${mm}:${ss}`;
}

export function parseTimeOfDay(value: string): { hours: number; minutes: number } {
  const [hours = "0", minutes = "0"] = value.split(":");
  return {
    hours: Number.parseInt(hours, 10) || 0,
    minutes: Number.parseInt(minutes, 10) || 0,
  };
}

export function applyTimeOnDate(day: Date, time: string): Date {
  const { hours, minutes } = parseTimeOfDay(time);
  const next = new Date(day);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

export const PHASE_MINUTE_STEP = 5;
export const PHASE_MINUTE_MIN = 5;
export const PHASE_MINUTE_MAX = 480;

export function snapPhaseMinutes(value: number): number {
  const snapped =
    Math.round(Number(value) / PHASE_MINUTE_STEP) * PHASE_MINUTE_STEP;
  return Math.min(
    PHASE_MINUTE_MAX,
    Math.max(PHASE_MINUTE_MIN, Number.isFinite(snapped) ? snapped : PHASE_MINUTE_MIN),
  );
}

export function parsePhaseType(value: string | null | undefined): PhaseType {
  // Keep all three live types. Never fold buffer into busy.
  if (value === "busy" || value === "free" || value === "buffer") {
    return value;
  }
  return "busy";
}

export function isClientVisiblePhase(type: PhaseType | string): boolean {
  const parsed = parsePhaseType(type);
  return parsed === "busy" || parsed === "free";
}

export function isStaffLockedPhase(type: PhaseType | string): boolean {
  const parsed = parsePhaseType(type);
  return parsed === "busy" || parsed === "buffer";
}

export function resequencePhases(
  phases: Array<{
    phase_type: PhaseType | string;
    duration_minutes: number;
    label?: string | null;
  }>,
): CatalogPhase[] {
  return phases.map((phase, sequence) => ({
    sequence,
    phase_type: parsePhaseType(phase.phase_type),
    duration_minutes: Math.max(1, Number(phase.duration_minutes) || PHASE_MINUTE_MIN),
    label: phase.label,
  }));
}

export function phaseTotals(
  phases: Array<{ phase_type: PhaseType | string; duration_minutes: number }>,
): { clientMinutes: number; staffMinutes: number; clockMinutes: number } {
  return phases.reduce(
    (totals, phase) => {
      const minutes = Number(phase.duration_minutes) || 0;
      const type = parsePhaseType(phase.phase_type);
      totals.clockMinutes += minutes;
      if (isClientVisiblePhase(type)) totals.clientMinutes += minutes;
      if (isStaffLockedPhase(type)) totals.staffMinutes += minutes;
      return totals;
    },
    { clientMinutes: 0, staffMinutes: 0, clockMinutes: 0 },
  );
}

export function defaultVariantPhases(): CatalogPhase[] {
  return [{ sequence: 0, phase_type: "busy", duration_minutes: 30 }];
}

export function phasesFromStored(
  stored:
    | Array<{
        sequence?: number | null;
        phase_type?: string | null;
        duration_minutes?: number | null;
      }>
    | null
    | undefined,
  fallbackClientMinutes?: number,
  fallbackStaffMinutes?: number | null,
): CatalogPhase[] {
  const rows = [...(stored || [])]
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
    .filter((row) => Number(row.duration_minutes) > 0)
    .map((row, sequence) => ({
      sequence,
      phase_type: parsePhaseType(row.phase_type),
      duration_minutes: Number(row.duration_minutes),
    }));
  if (rows.length > 0) return rows;
  if (fallbackClientMinutes && fallbackClientMinutes > 0) {
    return recipeFromDurations(fallbackClientMinutes, fallbackStaffMinutes);
  }
  return defaultVariantPhases();
}

export function recipeFromDurations(
  clientDurationMinutes: number,
  staffDurationMinutes?: number | null,
): CatalogPhase[] {
  const client = Math.max(Number(clientDurationMinutes) || 0, 1);
  const staffRaw = Number(staffDurationMinutes);
  const busy = Number.isFinite(staffRaw) && staffRaw > 0
    ? Math.min(staffRaw, client)
    : client;
  const free = client - busy;
  const phases: CatalogPhase[] = [
    { sequence: 0, phase_type: "busy", duration_minutes: busy },
  ];
  if (free > 0) {
    phases.push({
      sequence: 1,
      phase_type: "free",
      duration_minutes: free,
      label: "Processing",
    });
  }
  return phases;
}

export function layoutSegments(
  start: Date,
  items: SegmentInput[],
): LaidOutSegment[] {
  let cursor = start.getTime();

  return items.map((item, sequence) => {
    const recipe = (item.phases && item.phases.length > 0
      ? [...item.phases]
      : recipeFromDurations(
          item.clientDurationMinutes,
          item.staffDurationMinutes,
        )
    ).sort((a, b) => a.sequence - b.sequence);

    const phases: LaidOutPhase[] = [];
    let t = cursor;
    for (const phase of recipe) {
      const durationMs = Math.max(Number(phase.duration_minutes) || 0, 1) * 60_000;
      const startsAt = new Date(t);
      const endsAt = new Date(t + durationMs);
      phases.push({
        ...phase,
        phase_type: parsePhaseType(phase.phase_type),
        startsAt,
        endsAt,
      });
      t = endsAt.getTime();
    }

    const startsAt = phases[0]?.startsAt ?? new Date(cursor);
    const endsAt = phases[phases.length - 1]?.endsAt ?? new Date(cursor);
    cursor = endsAt.getTime();

    return {
      ...item,
      sequence,
      startsAt,
      endsAt,
      phases,
    };
  });
}
