export type PhaseType = "busy" | "free" | "buffer";

export interface PhaseDuration {
  phaseType: PhaseType;
  durationMinutes: number;
}

/** Client present: widget confirmation and appointment header duration. */
export function isClientFacingPhase(phaseType: PhaseType): boolean {
  return phaseType === "busy" || phaseType === "free";
}

/** Staff locked: same exclusive set as staff_busy_no_overlap. */
export function isStaffLockingPhase(phaseType: PhaseType): boolean {
  return phaseType === "busy" || phaseType === "buffer";
}

export function clientFacingMinutes(phases: PhaseDuration[]): number {
  return phases
    .filter((phase) => isClientFacingPhase(phase.phaseType))
    .reduce((sum, phase) => sum + phase.durationMinutes, 0);
}

export function staffOccupancyMinutes(phases: PhaseDuration[]): number {
  return phases
    .filter((phase) => isStaffLockingPhase(phase.phaseType))
    .reduce((sum, phase) => sum + phase.durationMinutes, 0);
}
