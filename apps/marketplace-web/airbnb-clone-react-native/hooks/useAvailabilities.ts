import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Availabilities, TimeSlot, ApiTimeSlot } from "@/types/availability";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Alert } from "react-native";

interface Treatment {
  treatmentId: string;
  priceOptionId: string;
}

interface UseAvailabilitiesResult {
  availabilities: Availabilities | null;
  loading: boolean;
  error: string | null;
  fetchAvailabilities: (
    companyId: string,
    treatments: Treatment[],
    month: Date
  ) => Promise<void>;
  getTimeSlotsForDate: (date: string) => TimeSlot[];
}

export const useAvailabilities = (): UseAvailabilitiesResult => {
  const [availabilities, setAvailabilities] = useState<Availabilities | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailabilities = useCallback(
    async (companyId: string, treatments: Treatment[], month: Date) => {
      try {
        setLoading(true);
        setError(null);

        const startDate = format(startOfMonth(month), "yyyy-MM-dd");
        const endDate = format(endOfMonth(month), "yyyy-MM-dd");

        console.log(startDate, endDate, treatments, companyId);
        const { data, error: functionError } = await supabase.functions.invoke(
          "get-availabilities",
          {
            body: {
              startDate,
              endDate,
              treatments,
              companyId,
            },
          }
        );

        if (functionError) {
          Alert.alert(functionError.message);
          //   throw new Error(functionError.message);
        }

        setAvailabilities(data);
      } catch (err) {
        console.error("Error fetching availabilities:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch availabilities"
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const getTimeSlotsForDate = useCallback(
    (date: string): TimeSlot[] => {
      if (!availabilities?.dates[date]) {
        return [];
      }

      const dayAvailability = availabilities.dates[date];
      const timeSlots: TimeSlot[] = [];

      // Process all staff members for this date
      Object.values(dayAvailability.staff).forEach((staff) => {
        staff.slots.forEach((slot: ApiTimeSlot) => {
          // Convert slot times to time slots
          const startTime =
            slot.available_start.split(" ")[1]?.substring(0, 5) ||
            slot.start_time.substring(0, 5);
          const endTime =
            slot.available_end.split(" ")[1]?.substring(0, 5) ||
            slot.end_time.substring(0, 5);

          timeSlots.push({
            time: startTime,
            available: true,
            staffId: slot.staff_id,
            staffName: `${slot.first_name} ${slot.last_name}`,
            staffImage: slot.image_url,
          });
        });
      });

      // Sort by time and remove duplicates
      const uniqueSlots = timeSlots.reduce((acc, slot) => {
        const existingSlot = acc.find((s) => s.time === slot.time);
        if (!existingSlot) {
          acc.push(slot);
        }
        return acc;
      }, [] as TimeSlot[]);

      return uniqueSlots.sort((a, b) => a.time.localeCompare(b.time));
    },
    [availabilities]
  );

  return {
    availabilities,
    loading,
    error,
    fetchAvailabilities,
    getTimeSlotsForDate,
  };
};
