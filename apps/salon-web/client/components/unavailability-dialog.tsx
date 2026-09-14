"use client";

import { useEffect, useState } from "react";
import { format, startOfDay } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useCompanyId, useLocationId } from "@/lib/company-util";
import { withOptionalLocationFields } from "@/lib/location";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UnavailabilityStaffOption {
  id: string;
  firstName: string | null;
  lastName: string | null;
}

interface UnavailabilityEditBlock {
  id: string;
  staffId: string;
  start: Date;
  end: Date;
}

interface UnavailabilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffOptions: UnavailabilityStaffOption[];
  defaultStaffId?: string | null;
  defaultDate?: Date | null;
  /** When provided, the dialog edits this existing block instead of creating. */
  editBlock?: UnavailabilityEditBlock | null;
  onSuccess?: () => void;
}

function staffName(staff: UnavailabilityStaffOption): string {
  return `${staff.firstName || ""} ${staff.lastName || ""}`.trim() || staff.id;
}

export function UnavailabilityDialog({
  open,
  onOpenChange,
  staffOptions,
  defaultStaffId,
  defaultDate,
  editBlock,
  onSuccess,
}: UnavailabilityDialogProps) {
  const t = useTranslations("staff.unavailability");
  const companyId = useCompanyId();
  const locationId = useLocationId();

  const [staffId, setStaffId] = useState<string>("");
  const [date, setDate] = useState<Date>(startOfDay(new Date()));
  const [startTime, setStartTime] = useState("00:00");
  const [endTime, setEndTime] = useState("23:59");
  const [isSaving, setIsSaving] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editBlock) {
      setStaffId(editBlock.staffId);
      setDate(startOfDay(editBlock.start));
      setStartTime(format(editBlock.start, "HH:mm"));
      setEndTime(format(editBlock.end, "HH:mm"));
      return;
    }
    setStaffId(defaultStaffId || staffOptions[0]?.id || "");
    setDate(startOfDay(defaultDate || new Date()));
    setStartTime("00:00");
    setEndTime("23:59");
  }, [open, editBlock, defaultStaffId, defaultDate, staffOptions]);

  const maskTime = (raw: string) => {
    let value = raw.replace(/[^\d]/g, "");
    if (value.length >= 2) {
      const hours = value.slice(0, 2);
      const minutes = value.slice(2, 4);
      if (Number.parseInt(hours) > 23) {
        value = "23" + minutes;
      }
      if (minutes && Number.parseInt(minutes) > 59) {
        value = value.slice(0, 2) + "59";
      }
      if (value.length > 2) {
        value = value.slice(0, 2) + ":" + value.slice(2, 4);
      }
    }
    return value.slice(0, 5);
  };

  const handleSave = async () => {
    if (!staffId) {
      toast.error(t("errorNoStaff"));
      return;
    }
    if (!companyId) {
      toast.error(t("errorGeneric"));
      return;
    }

    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const start = new Date(date);
    start.setHours(sh, sm, 0, 0);
    const end = new Date(date);
    // Extend the final minute to 23:59:59 so a full-day block covers the day.
    end.setHours(eh, em, eh === 23 && em === 59 ? 59 : 0, 0);

    if (end <= start) {
      toast.error(t("errorEndBeforeStart"));
      return;
    }

    setIsSaving(true);
    try {
      const supabase = createClient();
      const { error } = editBlock
        ? await supabase
            .from("staff_schedule_exception")
            .update(
              withOptionalLocationFields(
                {
                  staff_id: staffId,
                  starts_at: start.toISOString(),
                  ends_at: end.toISOString(),
                  kind: "unavailable",
                },
                locationId,
              ),
            )
            .eq("id", editBlock.id)
        : await supabase.from("staff_schedule_exception").insert(
            withOptionalLocationFields(
              {
                staff_id: staffId,
                company_id: companyId,
                starts_at: start.toISOString(),
                ends_at: end.toISOString(),
                kind: "unavailable",
              },
              locationId,
            ),
          );

      if (error) {
        console.error("Error saving unavailability:", error);
        toast.error(t("errorGeneric"));
        return;
      }

      toast.success(editBlock ? t("updateSuccess") : t("success"));
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving unavailability:", error);
      toast.error(t("errorGeneric"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editBlock ? t("editTitle") : t("title")}</DialogTitle>
          <DialogDescription>
            {editBlock ? t("editDescription") : t("description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Staff */}
          <div className="space-y-2">
            <Label>{t("staff")}</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger>
                <SelectValue placeholder={t("selectStaff")} />
              </SelectTrigger>
              <SelectContent>
                {staffOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {staffName(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>{t("date")}</Label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 opacity-60" />
                  {format(date, "EEEE d MMMM yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => {
                    if (d) {
                      setDate(startOfDay(d));
                      setIsCalendarOpen(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start-time">{t("startTime")}</Label>
              <Input
                id="start-time"
                type="text"
                inputMode="numeric"
                placeholder="HH:MM"
                maxLength={5}
                className="font-mono"
                value={startTime}
                onChange={(e) => setStartTime(maskTime(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">{t("endTime")}</Label>
              <Input
                id="end-time"
                type="text"
                inputMode="numeric"
                placeholder="HH:MM"
                maxLength={5}
                className="font-mono"
                value={endTime}
                onChange={(e) => setEndTime(maskTime(e.target.value))}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            {t("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !staffId}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
