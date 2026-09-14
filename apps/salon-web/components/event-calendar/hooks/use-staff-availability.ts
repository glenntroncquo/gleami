"use client";

import { useEffect, useMemo, useState } from "react";
import { areIntervalsOverlapping, eachDayOfInterval, getDay } from "date-fns";
import { fetchStaffAvailability } from "@/lib/api/calendar/queries/fetch-staff-availability";
import { applyTimeOnDate } from "@/lib/api/calendar/layout-segments";
import { useCompanyId } from "@/lib/company-util";
import { toast } from "sonner";

type AvailabilityPeriod = {
  start: Date;
  end: Date;
};

type UnavailabilityPeriod = {
  start: Date;
  end: Date;
};

function isRuleEffectiveOn(day: Date, from: string | null, to: string | null): boolean {
  const dayKey = day.toISOString().slice(0, 10);
  if (from && dayKey < from) return false;
  if (to && dayKey > to) return false;
  return true;
}

export function useStaffAvailability(
  staffId: string | null,
  startDate: Date,
  endDate: Date
) {
  const companyId = useCompanyId();
  const [availabilities, setAvailabilities] = useState<AvailabilityPeriod[]>(
    []
  );
  const [unavailabilities, setUnavailabilities] = useState<
    UnavailabilityPeriod[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!staffId || !companyId) {
      setAvailabilities([]);
      setUnavailabilities([]);
      return;
    }

    const loadAvailability = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await fetchStaffAvailability(
          staffId,
          companyId,
          startDate,
          endDate
        );

        if (error) {
          console.error("Error fetching staff availability:", error);
          toast.error("Failed to load staff availability");
          return;
        }

        if (!data) {
          setAvailabilities([]);
          setUnavailabilities([]);
          return;
        }

        const expandedAvailabilities: AvailabilityPeriod[] = [];
        const days = eachDayOfInterval({ start: startDate, end: endDate });

        data.rules.forEach((rule) => {
          days.forEach((day) => {
            if (getDay(day) !== rule.day_of_week) return;
            if (!isRuleEffectiveOn(day, rule.effective_from, rule.effective_to)) {
              return;
            }
            expandedAvailabilities.push({
              start: applyTimeOnDate(day, rule.start_time),
              end: applyTimeOnDate(day, rule.end_time),
            });
          });
        });

        data.exceptions.forEach((exception) => {
          if (exception.kind === "available_addition") {
            expandedAvailabilities.push({
              start: new Date(exception.starts_at),
              end: new Date(exception.ends_at),
            });
          }
        });

        const processedUnavailabilities: UnavailabilityPeriod[] =
          data.exceptions
            .filter((exception) => exception.kind === "unavailable")
            .map((exception) => ({
              start: new Date(exception.starts_at),
              end: new Date(exception.ends_at),
            }));

        setAvailabilities(expandedAvailabilities);
        setUnavailabilities(processedUnavailabilities);
      } catch (error) {
        console.error("Error loading availability:", error);
        toast.error("Failed to load staff availability");
      } finally {
        setIsLoading(false);
      }
    };

    loadAvailability();
  }, [staffId, companyId, startDate, endDate]);

  const checkTimeSlot = useMemo(
    () => (date: Date, time: number) => {
      const slotStart = new Date(date);
      const hours = Math.floor(time);
      const minutes = Math.round((time - hours) * 60);
      slotStart.setHours(hours, minutes, 0, 0);

      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + 15);

      const isUnavailable = unavailabilities.some((unav) =>
        areIntervalsOverlapping(
          { start: slotStart, end: slotEnd },
          { start: unav.start, end: unav.end }
        )
      );

      if (isUnavailable) {
        return { isAvailable: false, isUnavailable: true };
      }

      const isAvailable = availabilities.some((avail) =>
        areIntervalsOverlapping(
          { start: slotStart, end: slotEnd },
          { start: avail.start, end: avail.end }
        )
      );

      return {
        isAvailable,
        isUnavailable: false,
      };
    },
    [availabilities, unavailabilities]
  );

  return {
    checkTimeSlot,
    isLoading,
  };
}
