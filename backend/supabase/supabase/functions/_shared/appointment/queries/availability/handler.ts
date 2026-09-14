import { parseISO, isBefore, endOfMonth, addMonths, differenceInDays, eachDayOfInterval, getDay } from "date-fns";
import { resolveBookingLocation } from "../../../location/resolve.ts";
import { serviceRepository } from "../../../service/repository.ts";
import { appointmentRepository } from "../../repository.ts";
import {
  calculateAvailableSlots,
  subtractIntervals,
  type Interval,
  type PhaseRecipeStep,
  type TimeWindow,
} from "./calculate-slots.ts";
import { toAvailabilityResponseDto, type AvailabilityResponseDto } from "./dto.ts";
import type { GetAvailabilityInput } from "./schema.ts";
import type { StaffInfo } from "../../../service/entity.ts";
import { formatInSalonZone, zonedWallTimeToUtc } from "../../../time/salon-timezone.ts";

const MAX_DATE_RANGE_DAYS = 31;

function eligibleStaffForService(
  serviceId: string,
  variantId: string,
  staffByService: Map<string, Set<string>>,
  staffByVariant: Map<string, Set<string>>,
): Set<string> {
  const assigned = staffByVariant.get(variantId);
  if (assigned && assigned.size > 0) return assigned;
  return staffByService.get(serviceId) || new Set();
}

function buildWorkingWindows(params: {
  staffIds: string[];
  rules: Array<{
    staffId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    effectiveFrom: string | null;
    effectiveTo: string | null;
    isActive: boolean;
  }>;
  exceptions: Array<{
    staffId: string;
    kind: "available_addition" | "unavailable";
    startsAt: string;
    endsAt: string;
  }>;
  rangeStart: Date;
  rangeEnd: Date;
  timeZone: string;
}): TimeWindow[] {
  const days = eachDayOfInterval({ start: params.rangeStart, end: params.rangeEnd });
  const windows: TimeWindow[] = [];

  for (const staffId of params.staffIds) {
    const staffRules = params.rules.filter((rule) => rule.staffId === staffId && rule.isActive);
    const additions = params.exceptions.filter(
      (exception) => exception.staffId === staffId && exception.kind === "available_addition",
    );
    const unavailables = params.exceptions.filter(
      (exception) => exception.staffId === staffId && exception.kind === "unavailable",
    );

    const dayWindows: Interval[] = [];
    for (const day of days) {
      const dateStr = formatInSalonZone(day, "yyyy-MM-dd", params.timeZone);
      const dow = getDay(zonedWallTimeToUtc(dateStr, "12:00:00", params.timeZone));
      for (const rule of staffRules) {
        if (rule.dayOfWeek !== dow) continue;
        if (rule.effectiveFrom && dateStr < rule.effectiveFrom) continue;
        if (rule.effectiveTo && dateStr > rule.effectiveTo) continue;
        dayWindows.push({
          start: zonedWallTimeToUtc(dateStr, rule.startTime, params.timeZone),
          end: zonedWallTimeToUtc(dateStr, rule.endTime, params.timeZone),
        });
      }
    }

    for (const addition of additions) {
      dayWindows.push({ start: new Date(addition.startsAt), end: new Date(addition.endsAt) });
    }

    const blocks: Interval[] = unavailables.map((exception) => ({
      start: new Date(exception.startsAt),
      end: new Date(exception.endsAt),
    }));

    for (const interval of subtractIntervals(dayWindows, blocks)) {
      windows.push({ staffId, start: interval.start, end: interval.end });
    }
  }

  return windows;
}

export async function getAvailabilityHandler(
  input: GetAvailabilityInput,
): Promise<AvailabilityResponseDto> {
  const location = await resolveBookingLocation(input.companyId, input.locationId);
  const serviceIds = input.services.map((service) => service.serviceId);
  const variantIds = input.services.map((service) => service.serviceVariantId);

  const [variants, serviceEligibility, variantEligibility, services] = await Promise.all([
    serviceRepository.findVariantsWithPhasesByIds(variantIds),
    serviceRepository.findEligibleStaffForServices(serviceIds, location.locationId),
    serviceRepository.findEligibleStaffForVariants(variantIds, location.locationId),
    serviceRepository.findServicesByIds(serviceIds),
  ]);

  const variantById = new Map(variants.map((variant) => [variant.id, variant]));

  const staffInfoById: Record<string, StaffInfo> = {};
  for (const row of serviceEligibility) staffInfoById[row.staffId] = row.staffInfo;
  for (const row of variantEligibility) staffInfoById[row.staffId] = row.staffInfo;

  const staffByService = new Map<string, Set<string>>();
  for (const row of serviceEligibility) {
    if (!staffByService.has(row.serviceId)) staffByService.set(row.serviceId, new Set());
    staffByService.get(row.serviceId)!.add(row.staffId);
  }

  const staffByVariant = new Map<string, Set<string>>();
  for (const row of variantEligibility) {
    if (!staffByVariant.has(row.serviceVariantId)) staffByVariant.set(row.serviceVariantId, new Set());
    staffByVariant.get(row.serviceVariantId)!.add(row.staffId);
  }

  const requestedFilter = input.staffIds && input.staffIds.length > 0 ? new Set(input.staffIds) : null;
  const perServiceStaff = input.services.map((service) => service.staffId).filter((id): id is string => Boolean(id));
  const hasExplicitStaffPerService = perServiceStaff.length === input.services.length;

  let assignments: string[][];
  if (hasExplicitStaffPerService) {
    assignments = [perServiceStaff];
  } else {
    let intersection: Set<string> | null = null;
    for (const service of input.services) {
      const eligible = eligibleStaffForService(
        service.serviceId,
        service.serviceVariantId,
        staffByService,
        staffByVariant,
      );
      intersection = intersection
        ? new Set([...intersection].filter((id) => eligible.has(id)))
        : new Set(eligible);
    }
    const staffIds = [...(intersection ?? [])].filter((id) => !requestedFilter || requestedFilter.has(id));
    assignments = staffIds.map((staffId) => input.services.map(() => staffId));
  }

  if (assignments.length === 0) {
    return {};
  }

  const involvedStaffIds = [...new Set(assignments.flat())];
  const intervalDuration = Math.max(
    15,
    ...services.map((service) => service.bookingIntervalMinutes || 60),
  );

  const now = new Date();
  const requestedStart = input.startDate ? parseISO(input.startDate) : now;
  const rangeStart = isBefore(requestedStart, now) ? now : requestedStart;
  let rangeEnd = input.endDate ? parseISO(input.endDate) : endOfMonth(rangeStart);
  if (differenceInDays(rangeEnd, rangeStart) > MAX_DATE_RANGE_DAYS) {
    rangeEnd = addMonths(rangeStart, 1);
  }
  if (isBefore(rangeEnd, rangeStart)) {
    rangeEnd = addMonths(rangeStart, 1);
  }

  const [rules, exceptions, busyPhases] = await Promise.all([
    appointmentRepository.findScheduleRulesForStaff({
      companyId: input.companyId,
      staffIds: involvedStaffIds,
      rangeStart,
      rangeEnd,
      locationId: location.locationId,
    }),
    appointmentRepository.findScheduleExceptionsForStaff({
      companyId: input.companyId,
      staffIds: involvedStaffIds,
      rangeStart,
      rangeEnd,
      locationId: location.locationId,
    }),
    appointmentRepository.findBusyPhasesForStaff({
      companyId: input.companyId,
      staffIds: involvedStaffIds,
      rangeStart,
      rangeEnd,
      locationId: location.locationId,
    }),
  ]);

  const workingWindows = buildWorkingWindows({
    staffIds: involvedStaffIds,
    rules,
    exceptions,
    rangeStart,
    rangeEnd,
    timeZone: location.timezone,
  });

  const busyConflicts: TimeWindow[] = busyPhases.map((phase) => ({
    staffId: phase.staffId,
    start: new Date(phase.startsAt),
    end: new Date(phase.endsAt),
  }));

  const slots = [];
  for (const staffAssignment of assignments) {
    const recipe: PhaseRecipeStep[] = [];
    let valid = true;
    for (let index = 0; index < input.services.length; index++) {
      const requested = input.services[index]!;
      const variant = variantById.get(requested.serviceVariantId);
      const staffId = staffAssignment[index]!;
      if (!variant) {
        valid = false;
        break;
      }
      const phases =
        variant.phases.length > 0
          ? variant.phases
          : [{ sequence: 0, phaseType: "busy" as const, durationMinutes: variant.clientDurationMinutes }];
      for (const phase of phases) {
        recipe.push({
          staffId,
          phaseType: phase.phaseType,
          durationMinutes: phase.durationMinutes,
        });
      }
    }
    if (!valid || recipe.length === 0) continue;

    slots.push(
      ...calculateAvailableSlots(
        workingWindows,
        busyConflicts,
        recipe,
        intervalDuration,
        rangeStart,
        rangeEnd,
        now,
      ),
    );
  }

  return toAvailabilityResponseDto(slots, staffInfoById, location.timezone);
}
