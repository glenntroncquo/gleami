import {
  clientFacingMinutes,
  isStaffLockingPhase,
  type PhaseType,
} from "../../phases.ts";

export type { PhaseType };

export interface PhaseRecipeStep {
  staffId: string;
  phaseType: PhaseType;
  durationMinutes: number;
}

export interface TimeWindow {
  staffId: string;
  start: Date;
  end: Date;
}

export interface AvailableSlot {
  staffId: string;
  availableStart: string;
  availableEnd: string;
}

export function clientDurationMinutes(recipe: PhaseRecipeStep[]): number {
  return clientFacingMinutes(recipe);
}

function isCoveredByWindows(windows: TimeWindow[], staffId: string, start: Date, end: Date): boolean {
  return windows.some(
    (window) =>
      window.staffId === staffId &&
      window.start.getTime() <= start.getTime() &&
      window.end.getTime() >= end.getTime(),
  );
}

function overlapsWindows(windows: TimeWindow[], staffId: string, start: Date, end: Date): boolean {
  return windows.some(
    (window) =>
      window.staffId === staffId &&
      window.start.getTime() < end.getTime() &&
      window.end.getTime() > start.getTime(),
  );
}

export function recipeFitsAt(
  start: Date,
  recipe: PhaseRecipeStep[],
  workingWindows: TimeWindow[],
  busyConflicts: TimeWindow[],
): boolean {
  let cursor = start.getTime();
  for (const step of recipe) {
    const phaseStart = new Date(cursor);
    const phaseEnd = new Date(cursor + step.durationMinutes * 60_000);
    if (isStaffLockingPhase(step.phaseType)) {
      if (!isCoveredByWindows(workingWindows, step.staffId, phaseStart, phaseEnd)) {
        return false;
      }
      if (overlapsWindows(busyConflicts, step.staffId, phaseStart, phaseEnd)) {
        return false;
      }
    }
    cursor = phaseEnd.getTime();
  }
  return true;
}

/**
 * Busy and buffer lock staff (must sit in a working window and must not overlap
 * existing busy/buffer phases). Free phases do not block staff and are
 * offerable: another booking's busy/buffer may land in this recipe's free time.
 * Slot end is client-facing (busy + free only); trailing buffer is excluded.
 */
export function calculateAvailableSlots(
  workingWindows: TimeWindow[],
  busyConflicts: TimeWindow[],
  recipe: PhaseRecipeStep[],
  intervalDuration: number,
  rangeStart: Date,
  rangeEnd: Date,
  now: Date,
): AvailableSlot[] {
  if (recipe.length === 0 || intervalDuration <= 0) return [];

  const slots: AvailableSlot[] = [];
  const totalClientMs = clientDurationMinutes(recipe) * 60_000;
  const intervalMs = intervalDuration * 60_000;
  const firstStaffId = recipe[0]!.staffId;
  const seen = new Set<string>();

  const candidateWindows = workingWindows.filter((window) => window.staffId === firstStaffId);

  for (const window of candidateWindows) {
    let currentMs = Math.max(window.start.getTime(), rangeStart.getTime());
    while (currentMs < window.end.getTime() && currentMs < rangeEnd.getTime()) {
      const current = new Date(currentMs);
      const key = `${firstStaffId}:${current.toISOString()}`;
      if (
        currentMs > now.getTime() &&
        recipeFitsAt(current, recipe, workingWindows, busyConflicts) &&
        !seen.has(key)
      ) {
        seen.add(key);
        slots.push({
          staffId: firstStaffId,
          availableStart: current.toISOString(),
          availableEnd: new Date(currentMs + totalClientMs).toISOString(),
        });
      }
      currentMs += intervalMs;
    }
  }

  slots.sort((a, b) => a.availableStart.localeCompare(b.availableStart));
  return slots;
}

export interface Interval {
  start: Date;
  end: Date;
}

export function subtractIntervals(windows: Interval[], blocks: Interval[]): Interval[] {
  let result = windows.filter((window) => window.end.getTime() > window.start.getTime());
  for (const block of blocks) {
    const next: Interval[] = [];
    for (const window of result) {
      if (block.end.getTime() <= window.start.getTime() || block.start.getTime() >= window.end.getTime()) {
        next.push(window);
        continue;
      }
      if (block.start.getTime() > window.start.getTime()) {
        next.push({ start: window.start, end: block.start });
      }
      if (block.end.getTime() < window.end.getTime()) {
        next.push({ start: block.end, end: window.end });
      }
    }
    result = next.filter((window) => window.end.getTime() > window.start.getTime());
  }
  return result;
}
