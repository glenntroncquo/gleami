"use client";

import { useState, useEffect } from "react";
import {
  format,
  addDays,
  isSameDay,
  startOfWeek,
  isBefore,
  getDay,
} from "date-fns";
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Globe,
  Loader2,
  PlusCircle,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useCompanyId, useLocationId } from "@/lib/company-util";
import { withLocationId, withOptionalLocationFields } from "@/lib/location";
import { useTranslations } from "next-intl";
import { applyTimeOnDate } from "@/lib/api/calendar/layout-segments";

function toTimeValue(hhmm: string): string {
  return hhmm.length === 5 ? `${hhmm}:00` : hhmm;
}

function toHhmm(value: string): string {
  return value.slice(0, 5);
}

type ScheduleRuleRow = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean | null;
};

type ScheduleExceptionRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  kind: string;
};

interface TimeSlot {
  id?: string | number;
  startTime: string;
  endTime: string;
  recurring: boolean;
}

interface DayAvailability {
  date: Date;
  available: boolean;
  timeSlots: TimeSlot[];
}

interface AvailabilityDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  staffData?: {
    id?: string;
    first_name?: string;
    last_name?: string;
  };
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export default function AvailabilitySelectorDialog({
  open,
  onOpenChange,
  staffData,
  trigger,
  onSuccess,
}: AvailabilityDialogProps = {}) {
  const t = useTranslations("staff.availability");
  const companyId = useCompanyId();
  const locationId = useLocationId();
  // Get the current week's Monday
  const getCurrentWeekMonday = () => {
    return startOfWeek(new Date(), { weekStartsOn: 1 });
  };

  const [currentWeekStart, setCurrentWeekStart] = useState(
    getCurrentWeekMonday()
  );
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [timezone, setTimezone] = useState("Europe/Brussels");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Week view data
  const [weekAvailability, setWeekAvailability] = useState<DayAvailability[]>(
    () => {
      return Array.from({ length: 7 }).map((_, index) => {
        const day = addDays(currentWeekStart, index);
        return {
          date: day,
          available: false,
          timeSlots: [],
        };
      });
    }
  );

  const handlePreviousWeek = () => {
    const newWeekStart = addDays(currentWeekStart, -7);

    // Check if the new week start is in the past compared to the current week's Monday
    const currentMonday = getCurrentWeekMonday();
    if (isBefore(newWeekStart, currentMonday)) {
      // Don't allow navigation to past weeks
      return;
    }

    setCurrentWeekStart(newWeekStart);

    // Update selected day to the same day in the new week if one is selected
    if (selectedDay) {
      const dayOfWeek = getDay(selectedDay);
      const newSelectedDay = Array.from({ length: 7 })
        .map((_, i) => addDays(newWeekStart, i))
        .find((d) => getDay(d) === dayOfWeek);

      if (newSelectedDay) {
        setSelectedDay(newSelectedDay);
      }
    }
  };

  const handleNextWeek = () => {
    const newWeekStart = addDays(currentWeekStart, 7);
    setCurrentWeekStart(newWeekStart);

    // Update selected day to the same day in the new week if one is selected
    if (selectedDay) {
      const dayOfWeek = getDay(selectedDay);
      const newSelectedDay = Array.from({ length: 7 })
        .map((_, i) => addDays(newWeekStart, i))
        .find((d) => getDay(d) === dayOfWeek);

      if (newSelectedDay) {
        setSelectedDay(newSelectedDay);
      }
    }
  };

  const handleDaySelect = (day: DayAvailability) => {
    setSelectedDay(day.date);
  };

  const handleAddTimeSlot = () => {
    if (!selectedDay) return;

    const updatedWeekAvailability = [...weekAvailability];
    const dayIndex = updatedWeekAvailability.findIndex((day) =>
      isSameDay(day.date, selectedDay)
    );

    if (dayIndex !== -1) {
      // Add a new time slot with default times
      updatedWeekAvailability[dayIndex].timeSlots.push({
        startTime: "09:00",
        endTime: "17:00",
        recurring: isRecurring,
      });

      // Mark as available if it has time slots
      if (updatedWeekAvailability[dayIndex].timeSlots.length > 0) {
        updatedWeekAvailability[dayIndex].available = true;
      }

      setWeekAvailability(updatedWeekAvailability);
    }
  };

  const handleRemoveTimeSlot = (timeSlotIndex: number) => {
    if (!selectedDay) return;

    const updatedWeekAvailability = [...weekAvailability];
    const dayIndex = updatedWeekAvailability.findIndex((day) =>
      isSameDay(day.date, selectedDay)
    );

    if (dayIndex !== -1) {
      // Remove the time slot at the specified index
      updatedWeekAvailability[dayIndex].timeSlots.splice(timeSlotIndex, 1);

      // Mark as unavailable if it has no time slots
      if (updatedWeekAvailability[dayIndex].timeSlots.length === 0) {
        updatedWeekAvailability[dayIndex].available = false;
      }

      setWeekAvailability(updatedWeekAvailability);
    }
  };

  const handleTimeChange = (
    timeSlotIndex: number,
    type: "start" | "end",
    value: string
  ) => {
    if (!selectedDay) return;

    const updatedWeekAvailability = [...weekAvailability];
    const dayIndex = updatedWeekAvailability.findIndex((day) =>
      isSameDay(day.date, selectedDay)
    );

    if (dayIndex !== -1) {
      const timeSlots = updatedWeekAvailability[dayIndex].timeSlots;

      if (timeSlotIndex >= 0 && timeSlotIndex < timeSlots.length) {
        if (type === "start") {
          timeSlots[timeSlotIndex].startTime = value;
        } else {
          timeSlots[timeSlotIndex].endTime = value;
        }
      }

      setWeekAvailability(updatedWeekAvailability);
    }
  };

  const handleToggleTimeSlotRecurring = (
    timeSlotIndex: number,
    recurring: boolean
  ) => {
    if (!selectedDay) return;

    const updatedWeekAvailability = [...weekAvailability];
    const dayIndex = updatedWeekAvailability.findIndex((day) =>
      isSameDay(day.date, selectedDay)
    );

    if (dayIndex !== -1) {
      const timeSlots = updatedWeekAvailability[dayIndex].timeSlots;

      if (timeSlotIndex >= 0 && timeSlotIndex < timeSlots.length) {
        timeSlots[timeSlotIndex].recurring = recurring;
      }

      setWeekAvailability(updatedWeekAvailability);
    }
  };

  const handleSaveAvailability = async () => {
    if (!staffData?.id || !companyId) {
      toast.error(t("messages.error"));
      return;
    }

    setIsSaving(true);

    try {
      // Get available days
      const availableDays = weekAvailability.filter((day) => day.available);

      // Check if there are any available days with time slots
      if (
        availableDays.length === 0 ||
        availableDays.every((day) => day.timeSlots.length === 0)
      ) {
        toast.error(t("messages.noSlots"));
        setIsSaving(false);
        return;
      }

      // Validate that all time slots have values
      let hasEmptyTimeSlots = false;
      let emptyDayName = "";

      for (const day of availableDays) {
        for (const slot of day.timeSlots) {
          if (!slot.startTime || !slot.endTime) {
            hasEmptyTimeSlots = true;
            emptyDayName = format(day.date, "EEEE");
            break;
          }
        }
        if (hasEmptyTimeSlots) break;
      }

      if (hasEmptyTimeSlots) {
        toast.error(t("messages.emptyFields", { dayName: emptyDayName }));
        setIsSaving(false);
        return;
      }

      const supabase = createClient();

      await withLocationId(
        supabase
          .from("staff_schedule_rule")
          .delete()
          .eq("staff_id", staffData.id),
        locationId,
      );
      await withLocationId(
        supabase
          .from("staff_schedule_exception")
          .delete()
          .eq("staff_id", staffData.id)
          .eq("kind", "available_addition"),
        locationId,
      );

      const ruleRows = availableDays.flatMap((day) =>
        day.timeSlots
          .filter((slot) => slot.recurring)
          .map((slot) =>
            withOptionalLocationFields(
              {
                staff_id: staffData.id as string,
                company_id: companyId,
                day_of_week: getDay(day.date),
                start_time: toTimeValue(slot.startTime),
                end_time: toTimeValue(slot.endTime),
                is_active: true,
              },
              locationId,
            ),
          ),
      );

      const additionRows = availableDays.flatMap((day) =>
        day.timeSlots
          .filter((slot) => !slot.recurring)
          .map((slot) =>
            withOptionalLocationFields(
              {
                staff_id: staffData.id as string,
                company_id: companyId,
                starts_at: applyTimeOnDate(day.date, slot.startTime).toISOString(),
                ends_at: applyTimeOnDate(day.date, slot.endTime).toISOString(),
                kind: "available_addition" as const,
              },
              locationId,
            ),
          ),
      );

      if (ruleRows.length > 0) {
        const { error } = await supabase.from("staff_schedule_rule").insert(ruleRows);
        if (error) throw error;
      }
      if (additionRows.length > 0) {
        const { error } = await supabase
          .from("staff_schedule_exception")
          .insert(additionRows);
        if (error) throw error;
      }

      toast.success(t("messages.success"));
      if (onSuccess) onSuccess();
      if (onOpenChange) onOpenChange(false);
    } catch (error) {
      console.error("Error saving availability:", error);
      toast.error(t("messages.error"));
    } finally {
      setIsSaving(false);
    }
  };

  // Check if previous week navigation should be disabled
  const isPreviousWeekDisabled = () => {
    const currentMonday = getCurrentWeekMonday();
    return (
      isSameDay(currentWeekStart, currentMonday) ||
      isBefore(currentWeekStart, currentMonday)
    );
  };

  // Handle calendar date selection
  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      // Get the Monday of the selected week
      const selectedWeekMonday = startOfWeek(date, { weekStartsOn: 1 });

      // Check if the selected week is in the past
      const currentMonday = getCurrentWeekMonday();
      if (isBefore(selectedWeekMonday, currentMonday)) {
        // If it's in the past, set to current week
        setCurrentWeekStart(currentMonday);
      } else {
        // Otherwise set to the selected week
        setCurrentWeekStart(selectedWeekMonday);
      }
    }
  };

  // Disable past dates in the calendar
  const isDateDisabled = (date: Date) => {
    const currentMonday = getCurrentWeekMonday();
    return isBefore(date, currentMonday);
  };

  // Fetch existing availability data
  const fetchAvailability = async () => {
    if (!staffData?.id) return;

    setIsLoading(true);
    try {
      const supabase = createClient();
      const [{ data: rules, error: ruleError }, { data: exceptions, error: exceptionError }] =
        await Promise.all([
          withLocationId(
            supabase
              .from("staff_schedule_rule")
              .select("id, day_of_week, start_time, end_time, is_active")
              .eq("staff_id", staffData.id)
              .eq("is_active", true),
            locationId,
          ),
          withLocationId(
            supabase
              .from("staff_schedule_exception")
              .select("id, starts_at, ends_at, kind")
              .eq("staff_id", staffData.id)
              .eq("kind", "available_addition"),
            locationId,
          ),
        ]);

      if (ruleError) throw ruleError;
      if (exceptionError) throw exceptionError;

      const ruleRows = (rules || []) as ScheduleRuleRow[];
      const exceptionRows = (exceptions || []) as ScheduleExceptionRow[];

      const hasRecurring = ruleRows.length > 0;
      setIsRecurring(hasRecurring);

      const newWeekAvailability = weekAvailability.map((day) => {
        const dayOfWeek = getDay(day.date);
        const timeSlots: TimeSlot[] = [
          ...ruleRows
            .filter((rule) => rule.day_of_week === dayOfWeek)
            .map((rule) => ({
              id: rule.id,
              startTime: toHhmm(rule.start_time),
              endTime: toHhmm(rule.end_time),
              recurring: true,
            })),
          ...exceptionRows
            .filter((row) => isSameDay(new Date(row.starts_at), day.date))
            .map((row) => ({
              id: row.id,
              startTime: format(new Date(row.starts_at), "HH:mm"),
              endTime: format(new Date(row.ends_at), "HH:mm"),
              recurring: false,
            })),
        ];

        return {
          ...day,
          available: timeSlots.length > 0,
          timeSlots,
        };
      });

      setWeekAvailability(newWeekAvailability);
    } catch (error) {
      console.error("Error fetching availability:", error);
      toast.error(t("messages.error"));
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch availability data when dialog opens
  useEffect(() => {
    if (open) {
      // Reset selected day when dialog opens
      setSelectedDay(null);

      if (staffData?.id) {
        fetchAvailability();
      }
    }
  }, [open, staffData?.id, locationId]);

  // Reset selected day when dialog closes
  useEffect(() => {
    if (open === false) {
      setSelectedDay(null);
    }
  }, [open]);

  useEffect(() => {
    // Update week availability when week changes
    const supabase = createClient();

    async function updateWeekAvailabilityData() {
      try {
        if (!staffData?.id) return;

        // Get weekly hours and one-off extra hours
        const [{ data: rules, error: ruleError }, { data: exceptions, error: exceptionError }] =
          await Promise.all([
            withLocationId(
              supabase
                .from("staff_schedule_rule")
                .select("id, day_of_week, start_time, end_time, is_active")
                .eq("staff_id", staffData.id)
                .eq("is_active", true),
              locationId,
            ),
            withLocationId(
              supabase
                .from("staff_schedule_exception")
                .select("id, starts_at, ends_at, kind")
                .eq("staff_id", staffData.id)
                .eq("kind", "available_addition"),
              locationId,
            ),
          ]);

        if (ruleError) throw ruleError;
        if (exceptionError) throw exceptionError;

        const ruleRows = (rules || []) as ScheduleRuleRow[];
        const exceptionRows = (exceptions || []) as ScheduleExceptionRow[];

        // Create new week availability
        const updatedWeekAvailability = Array.from({ length: 7 }).map(
          (_, index) => {
            const day = addDays(currentWeekStart, index);
            const dayOfWeek = getDay(day);
            const timeSlots: TimeSlot[] = [
              ...ruleRows
                .filter((rule) => rule.day_of_week === dayOfWeek)
                .map((rule) => ({
                  id: rule.id,
                  startTime: toHhmm(rule.start_time),
                  endTime: toHhmm(rule.end_time),
                  recurring: true,
                })),
              ...exceptionRows
                .filter((row) => isSameDay(new Date(row.starts_at), day))
                .map((row) => ({
                  id: row.id,
                  startTime: format(new Date(row.starts_at), "HH:mm"),
                  endTime: format(new Date(row.ends_at), "HH:mm"),
                  recurring: false,
                })),
            ];

            return {
              date: day,
              available: timeSlots.length > 0,
              timeSlots,
            };
          }
        );

        setWeekAvailability(updatedWeekAvailability);
      } catch (error) {
        console.error("Error updating week availability:", error);
      }
    }

    updateWeekAvailabilityData();
  }, [currentWeekStart, staffData?.id, locationId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-md [&>button:last-child]:top-3.5">
        <DialogHeader className="contents space-y-0 text-left">
          <DialogTitle className="border-b px-6 py-4 text-base">
            {staffData
              ? t("titleForStaff", {
                  firstName: staffData.first_name || "",
                  lastName: staffData.last_name || "",
                })
              : t("title")}
          </DialogTitle>
        </DialogHeader>
        <DialogDescription className="sr-only">
          {t("description")}
        </DialogDescription>

        <div className="overflow-y-auto">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between mb-4">
                    <div className="relative">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-[220px] justify-between"
                          >
                            {format(currentWeekStart, "MMM d")} -{" "}
                            {format(
                              addDays(currentWeekStart, 6),
                              "MMM d, yyyy"
                            )}
                            <CalendarIcon className="ml-2 h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0">
                          <Calendar
                            mode="single"
                            selected={currentWeekStart}
                            onSelect={handleCalendarSelect}
                            disabled={isDateDisabled}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handlePreviousWeek}
                        className="h-9 w-9 rounded-md p-0"
                        disabled={isPreviousWeekDisabled()}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="sr-only">
                          {t("weekNavigation.previous")}
                        </span>
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleNextWeek}
                        className="h-9 w-9 rounded-md p-0"
                      >
                        <ChevronRight className="h-4 w-4" />
                        <span className="sr-only">
                          {t("weekNavigation.next")}
                        </span>
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {weekAvailability.map((day, index) => (
                      <Button
                        key={index}
                        variant={
                          selectedDay && isSameDay(day.date, selectedDay)
                            ? "default"
                            : "outline"
                        }
                        className={cn(
                          "h-auto flex flex-col items-center justify-center p-2 rounded-lg",
                          selectedDay && isSameDay(day.date, selectedDay)
                            ? "bg-black text-white"
                            : !selectedDay && day.available
                            ? "border-green-500 border-2"
                            : selectedDay &&
                              !isSameDay(day.date, selectedDay) &&
                              day.available
                            ? "border-green-500 border-2"
                            : ""
                        )}
                        onClick={() => handleDaySelect(day)}
                      >
                        <span className="text-sm font-medium">
                          {format(day.date, "EEE")}
                        </span>
                        <span className="text-2xl font-bold my-1">
                          {format(day.date, "d")}
                        </span>
                        <span
                          className={cn(
                            "text-xs rounded-full px-2 py-0.5",
                            selectedDay && isSameDay(day.date, selectedDay)
                              ? "bg-white/20 text-white"
                              : day.available
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-500"
                          )}
                        >
                          {day.available
                            ? day.timeSlots.length === 1
                              ? t("days.slots", { count: day.timeSlots.length })
                              : t("days.slotsPlural", {
                                  count: day.timeSlots.length,
                                })
                            : t("days.unavailable")}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="p-4 border-b">
                  {selectedDay ? (
                    <div className="space-y-4">
                      <div className="mb-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-sm mb-3">
                            {format(selectedDay, "EEEE, MMMM d")}
                          </h3>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleAddTimeSlot}
                            className="mb-3"
                          >
                            <PlusCircle className="h-4 w-4 mr-1" />
                            {t("timeSlots.add")}
                          </Button>
                        </div>
                      </div>

                      {getSelectedDayAvailability()?.timeSlots.length === 0 ? (
                        <div className="text-center py-2 text-gray-500">
                          {t("timeSlots.noSlots")}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {getSelectedDayAvailability()?.timeSlots.map(
                            (timeSlot, index) => (
                              <div
                                key={index}
                                className="bg-gray-50 p-2 rounded-lg"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className="text-sm font-medium">
                                    Time Slot {index + 1}
                                  </h4>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveTimeSlot(index)}
                                    className="h-6 w-6"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mb-1">
                                  <div className="space-y-1">
                                    <Label className="text-xs">
                                      {t("timeSlots.start")}
                                    </Label>
                                    <input
                                      type="text"
                                      placeholder="HH:MM"
                                      value={timeSlot.startTime}
                                      onChange={(e) => {
                                        let value = e.target.value.replace(
                                          /[^\d]/g,
                                          ""
                                        );

                                        if (value.length >= 2) {
                                          const hours = value.slice(0, 2);
                                          const minutes = value.slice(2, 4);

                                          if (Number.parseInt(hours) > 23) {
                                            value = "23" + minutes;
                                          }

                                          if (
                                            minutes &&
                                            Number.parseInt(minutes) > 59
                                          ) {
                                            value = hours + "59";
                                          }

                                          if (value.length > 2) {
                                            value =
                                              value.slice(0, 2) +
                                              ":" +
                                              value.slice(2, 4);
                                          }
                                        }

                                        if (value.length <= 5) {
                                          handleTimeChange(
                                            index,
                                            "start",
                                            value
                                          );
                                        }
                                      }}
                                      className="w-full px-2 py-1 text-sm border rounded font-mono"
                                      maxLength={5}
                                      required
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">
                                      {t("timeSlots.end")}
                                    </Label>
                                    <input
                                      type="text"
                                      placeholder="HH:MM"
                                      value={timeSlot.endTime}
                                      onChange={(e) => {
                                        let value = e.target.value.replace(
                                          /[^\d]/g,
                                          ""
                                        );

                                        if (value.length >= 2) {
                                          const hours = value.slice(0, 2);
                                          const minutes = value.slice(2, 4);

                                          if (Number.parseInt(hours) > 23) {
                                            value = "23" + minutes;
                                          }

                                          if (
                                            minutes &&
                                            Number.parseInt(minutes) > 59
                                          ) {
                                            value = hours + "59";
                                          }

                                          if (value.length > 2) {
                                            value =
                                              value.slice(0, 2) +
                                              ":" +
                                              value.slice(2, 4);
                                          }
                                        }

                                        if (value.length <= 5) {
                                          handleTimeChange(index, "end", value);
                                        }
                                      }}
                                      className="w-full px-2 py-1 text-sm border rounded font-mono"
                                      maxLength={5}
                                      required
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center justify-end mt-1">
                                  <div className="flex items-center space-x-1.5">
                                    <Label
                                      htmlFor={`recurring-${index}`}
                                      className="text-xs"
                                    >
                                      {t("timeSlots.recurring")}
                                    </Label>
                                    <Checkbox
                                      id={`recurring-${index}`}
                                      checked={timeSlot.recurring}
                                      onCheckedChange={(checked: boolean) =>
                                        handleToggleTimeSlotRecurring(
                                          index,
                                          checked
                                        )
                                      }
                                      className="scale-75"
                                    />
                                  </div>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      {t("timeSlots.selectDay")}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <DialogClose asChild>
            <Button variant="outline" disabled={isSaving || isLoading}>
              {t("actions.cancel")}
            </Button>
          </DialogClose>
          <Button
            onClick={handleSaveAvailability}
            disabled={isSaving || isLoading}
            className="bg-black hover:bg-black/90 text-white"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("actions.saving")}
              </>
            ) : (
              t("actions.save")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Helper function to get selected day's availability
  function getSelectedDayAvailability() {
    if (!selectedDay) return null;
    return weekAvailability.find((day) => isSameDay(day.date, selectedDay));
  }
}
