export type LayoutPhase = {
  sequence: number;
  phase_type: 'busy' | 'free' | 'buffer';
  duration_minutes: number;
};

export type LayoutSegmentInput = {
  serviceId: string;
  serviceVariantId: string;
  staffId: string;
  price: number;
  phases: LayoutPhase[];
  durationMinutes: number;
};

export type LaidOutPhase = LayoutPhase & {
  startsAt: Date;
  endsAt: Date;
};

export type LaidOutSegment = Omit<LayoutSegmentInput, 'phases'> & {
  sequence: number;
  startsAt: Date;
  endsAt: Date;
  phases: LaidOutPhase[];
};

function recipe(segment: LayoutSegmentInput): LayoutPhase[] {
  const phases = [...segment.phases].sort((a, b) => a.sequence - b.sequence);
  if (phases.length > 0) return phases;
  return [
    {
      sequence: 0,
      phase_type: 'busy',
      duration_minutes: Math.max(segment.durationMinutes, 1),
    },
  ];
}

/** Walk services forward from the salon wall-clock start. No timezone conversion. */
export function layoutAppointmentSegments(start: Date, segments: LayoutSegmentInput[]): LaidOutSegment[] {
  let cursor = start.getTime();

  return segments.map((segment, sequence) => {
    const phases: LaidOutPhase[] = [];
    for (const phase of recipe(segment)) {
      const durationMs = Math.max(Number(phase.duration_minutes) || 0, 1) * 60_000;
      const startsAt = new Date(cursor);
      const endsAt = new Date(cursor + durationMs);
      phases.push({ ...phase, startsAt, endsAt });
      cursor = endsAt.getTime();
    }

    return {
      ...segment,
      sequence,
      startsAt: phases[0]?.startsAt ?? new Date(cursor),
      endsAt: phases[phases.length - 1]?.endsAt ?? new Date(cursor),
      phases,
    };
  });
}

export function clientFacingBounds(laidOut: LaidOutSegment[]): { start: Date; end: Date } {
  const visible = laidOut.flatMap((segment) =>
    segment.phases.filter((phase) => phase.phase_type === 'busy' || phase.phase_type === 'free')
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
