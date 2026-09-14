"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import {
  CalendarCheck,
  CalendarClock,
  CalendarX2,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Pencil,
  Plus,
  Repeat,
  Rows3,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { getEventColorClasses } from "@/components/event-calendar";
import { useDateFnsLocale } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  ScheduleAppointmentBlock,
  ScheduleAvailabilityBlock,
  ScheduleStaff,
  ScheduleUnavailabilityBlock,
} from "./types";

interface StaffScheduleGridProps {
  weekStart: Date;
  staff: ScheduleStaff[];
  availabilities: ScheduleAvailabilityBlock[];
  unavailabilities: ScheduleUnavailabilityBlock[];
  appointments: ScheduleAppointmentBlock[];
  isLoading: boolean;
  /**
   * Layout orientation. "staff-rows" (default) shows staff down the side and
   * days across the top; "staff-columns" flips it (days down, staff across).
   */
  orientation?: "staff-rows" | "staff-columns";
  onToggleOrientation?: () => void;
  /** Expected number of staff rows, used to size the loading skeleton. */
  skeletonRows?: number;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onAddUnavailability: (staffId: string, date: Date) => void;
  onAddAppointment?: (staffId: string, date: Date) => void;
  onAddAvailability?: (staffId: string, date: Date) => void;
  onEditAvailability?: (block: ScheduleAvailabilityBlock) => void;
  onEditUnavailability?: (block: ScheduleUnavailabilityBlock) => void;
  onDeleteAvailability?: (block: ScheduleAvailabilityBlock) => void;
  onDeleteUnavailability?: (block: ScheduleUnavailabilityBlock) => void;
  onStaffClick?: (staffId: string) => void;
  onAppointmentClick?: (appointmentId: string) => void;
}

function staffInitials(staff: ScheduleStaff): string {
  const first = staff.firstName?.charAt(0) || "";
  const last = staff.lastName?.charAt(0) || "";
  return (first + last).toUpperCase() || "??";
}

function staffFullName(staff: ScheduleStaff): string {
  return `${staff.firstName || ""} ${staff.lastName || ""}`.trim();
}

function staffImageUrl(imagePath: string | null): string | undefined {
  if (!imagePath) return undefined;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/company/${imagePath}`;
}

export function StaffScheduleGrid({
  weekStart,
  staff,
  availabilities,
  unavailabilities,
  appointments,
  isLoading,
  orientation = "staff-rows",
  onToggleOrientation,
  skeletonRows,
  onPreviousWeek,
  onNextWeek,
  onToday,
  onAddUnavailability,
  onAddAppointment,
  onAddAvailability,
  onEditAvailability,
  onEditUnavailability,
  onDeleteAvailability,
  onDeleteUnavailability,
  onStaffClick,
  onAppointmentClick,
}: StaffScheduleGridProps) {
  const t = useTranslations("staff.schedule");
  const dateLocale = useDateFnsLocale();
  const today = new Date();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLDivElement>(null);

  // Which cell's "add" menu is currently open (keyed by `${staffId}|${date}`).
  const [openAddMenuKey, setOpenAddMenuKey] = useState<string | null>(null);

  // Close the add menu when the schedule scrolls so it never floats detached
  // from its trigger.
  useEffect(() => {
    if (!openAddMenuKey) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    const close = () => setOpenAddMenuKey(null);
    container.addEventListener("scroll", close, { passive: true });
    return () => container.removeEventListener("scroll", close);
  }, [openAddMenuKey]);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  // Bring today into view once the data has loaded. Runs when the week,
  // orientation, or loading state changes so the current day stays visible.
  useEffect(() => {
    if (isLoading) return;
    const container = scrollContainerRef.current;
    const target = todayRef.current;
    if (!container || !target) return;

    if (orientation === "staff-columns") {
      // Today is a row: align its top just below the sticky header.
      container.scrollTop = Math.max(0, target.offsetTop - target.offsetHeight);
    } else {
      // Today is a column: align its left edge, keeping the staff column visible.
      container.scrollLeft = Math.max(0, target.offsetLeft - target.offsetWidth);
    }
  }, [isLoading, orientation, weekStart, staff.length]);

  const weekLabel = useMemo(() => {
    const end = addDays(weekStart, 6);
    return `${format(weekStart, "d MMM", { locale: dateLocale })} – ${format(
      end,
      "d MMM yyyy",
      { locale: dateLocale }
    )}`;
  }, [weekStart, dateLocale]);

  // Index blocks by `${staffId}|${yyyy-mm-dd}` for fast lookup per cell.
  const availByCell = useMemo(() => {
    const map = new Map<string, ScheduleAvailabilityBlock[]>();
    availabilities.forEach((block) => {
      const key = `${block.staffId}|${format(block.start, "yyyy-MM-dd")}`;
      const arr = map.get(key) || [];
      arr.push(block);
      map.set(key, arr);
    });
    map.forEach((arr) =>
      arr.sort((a, b) => a.start.getTime() - b.start.getTime())
    );
    return map;
  }, [availabilities]);

  const unavailByCell = useMemo(() => {
    const map = new Map<string, ScheduleUnavailabilityBlock[]>();
    unavailabilities.forEach((block) => {
      const key = `${block.staffId}|${format(block.start, "yyyy-MM-dd")}`;
      const arr = map.get(key) || [];
      arr.push(block);
      map.set(key, arr);
    });
    map.forEach((arr) =>
      arr.sort((a, b) => a.start.getTime() - b.start.getTime())
    );
    return map;
  }, [unavailabilities]);

  const apptByCell = useMemo(() => {
    const map = new Map<string, ScheduleAppointmentBlock[]>();
    appointments.forEach((block) => {
      const key = `${block.staffId}|${format(block.start, "yyyy-MM-dd")}`;
      const arr = map.get(key) || [];
      arr.push(block);
      map.set(key, arr);
    });
    map.forEach((arr) =>
      arr.sort((a, b) => a.start.getTime() - b.start.getTime())
    );
    return map;
  }, [appointments]);

  const isAllDay = (block: ScheduleUnavailabilityBlock) => {
    // Treat a block spanning (almost) the whole day as all-day. Using the span
    // instead of exact clock hours keeps this correct regardless of timezone.
    const spanMs = block.end.getTime() - block.start.getTime();
    return spanMs >= 23 * 60 * 60 * 1000;
  };

  const renderCellContent = (staffId: string, day: Date) => {
    const cellKey = `${staffId}|${format(day, "yyyy-MM-dd")}`;
    const cellAvail = availByCell.get(cellKey) || [];
    const cellUnavail = unavailByCell.get(cellKey) || [];
    const cellAppt = apptByCell.get(cellKey) || [];

    if (isLoading) {
      // Staff is known but schedule data is still loading: shimmer the cell.
      const showSkeleton =
        (day.getDate() + (staffId.charCodeAt(0) || 0)) % 2 === 0;
      return (
        <div className="min-h-[92px]">
          {showSkeleton && <Skeleton className="h-9 w-full rounded-md" />}
        </div>
      );
    }

    return (
      <div className="flex h-full min-h-[92px] flex-col gap-1">
        {cellUnavail.map((block) => {
          const interactive =
            !!onEditUnavailability || !!onDeleteUnavailability;
          const content = (
            <>
              <div className="text-xs font-semibold text-red-700">
                {t("unavailable")}
              </div>
              <div className="text-[10px] text-red-600/80">
                {isAllDay(block)
                  ? t("allDay")
                  : `${format(block.start, "HH:mm")} – ${format(
                      block.end,
                      "HH:mm"
                    )}`}
              </div>
            </>
          );
          if (!interactive) {
            return (
              <div
                key={block.id}
                className="rounded-md border border-red-200/60 bg-red-100/80 px-2 py-1 text-left"
              >
                {content}
              </div>
            );
          }
          return (
            <DropdownMenu key={block.id}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  title={t("editOrDelete")}
                  className="cursor-pointer rounded-md border border-red-200/60 bg-red-100/80 px-2 py-1 text-left transition-colors hover:border-red-300 hover:bg-red-200/80"
                >
                  {content}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {onEditUnavailability && (
                  <DropdownMenuItem
                    onClick={() => onEditUnavailability(block)}
                  >
                    <Pencil className="opacity-60" />
                    {t("edit")}
                  </DropdownMenuItem>
                )}
                {onDeleteUnavailability && (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onDeleteUnavailability(block)}
                  >
                    <Trash2 className="opacity-60" />
                    {t("delete")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })}

        {cellAvail.map((block) => {
          const interactive = !!onEditAvailability || !!onDeleteAvailability;
          const content = (
            <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-700">
              {block.recurring && (
                <Repeat
                  className="h-2.5 w-2.5 flex-shrink-0"
                  aria-label={t("recurring")}
                />
              )}
              <span>
                {format(block.start, "HH:mm")} – {format(block.end, "HH:mm")}
              </span>
            </div>
          );
          if (!interactive) {
            return (
              <div
                key={block.id}
                className="rounded-md border border-emerald-200/60 bg-emerald-100/70 px-2 py-1 text-left"
              >
                {content}
              </div>
            );
          }
          return (
            <DropdownMenu key={block.id}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  title={t("editOrDelete")}
                  className="cursor-pointer rounded-md border border-emerald-200/60 bg-emerald-100/70 px-2 py-1 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-200/70"
                >
                  {content}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {onEditAvailability && (
                  <DropdownMenuItem onClick={() => onEditAvailability(block)}>
                    <Pencil className="opacity-60" />
                    {block.recurring ? t("editRecurring") : t("edit")}
                  </DropdownMenuItem>
                )}
                {onDeleteAvailability && (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onDeleteAvailability(block)}
                  >
                    <Trash2 className="opacity-60" />
                    {t("delete")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })}

        {cellAppt.map((block) => (
          <button
            key={block.id}
            type="button"
            onClick={() => onAppointmentClick?.(block.appointmentId)}
            className={cn(
              "w-full rounded-md px-2 py-1 text-left transition-colors",
              getEventColorClasses(block.color)
            )}
          >
            <div className="text-[10px] font-medium opacity-80">
              {format(block.start, "HH:mm")} – {format(block.end, "HH:mm")}
            </div>
            {block.clientName && (
              <div className="truncate text-xs font-semibold">
                {block.clientName}
              </div>
            )}
            {block.services.map((tr, i) => (
              <div key={i} className="truncate text-[10px] opacity-90">
                {tr.serviceVariantName
                  ? `${tr.serviceName} · ${tr.serviceVariantName}`
                  : tr.serviceName}
              </div>
            ))}
          </button>
        ))}
        {/* Reserved slot pinned to the bottom of the cell so the layout never
            reflows. The add button only becomes visible on hover. */}
        <div className="mt-auto min-h-[34px] pt-1">
          <DropdownMenu
            modal={false}
            open={openAddMenuKey === cellKey}
            onOpenChange={(next) =>
              setOpenAddMenuKey(next ? cellKey : null)
            }
          >
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="hidden w-full items-center justify-center gap-1 rounded-md border border-dashed border-muted-foreground/30 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-muted/50 group-hover:flex data-[state=open]:flex"
                aria-label={t("addForCell")}
              >
                <Plus className="h-3 w-3" />
                {t("add")}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="center"
              onCloseAutoFocus={(e) => e.preventDefault()}
              className="data-[state=closed]:hidden data-[state=closed]:animate-none"
            >
              {onAddAppointment && (
                <DropdownMenuItem
                  onClick={() => onAddAppointment(staffId, day)}
                >
                  <CalendarClock className="opacity-60" />
                  {t("addAppointment")}
                </DropdownMenuItem>
              )}
              {onAddAvailability && (
                <DropdownMenuItem
                  onClick={() => onAddAvailability(staffId, day)}
                >
                  <CalendarCheck className="opacity-60" />
                  {t("addAvailability")}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => onAddUnavailability(staffId, day)}
              >
                <CalendarX2 className="opacity-60" />
                {t("addUnavailability")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  const renderStaffLabel = (s: ScheduleStaff, className: string) => (
    <button
      key={s.id}
      type="button"
      onClick={() => onStaffClick?.(s.id)}
      disabled={!onStaffClick}
      className={cn(
        className,
        onStaffClick &&
          "cursor-pointer transition-colors hover:bg-muted/50"
      )}
    >
      <Avatar className="h-8 w-8">
        <AvatarImage src={staffImageUrl(s.imagePath)} alt={staffFullName(s)} />
        <AvatarFallback className="text-xs">{staffInitials(s)}</AvatarFallback>
      </Avatar>
      <span className="truncate text-sm font-medium">
        {staffFullName(s) || t("unnamed")}
      </span>
    </button>
  );

  const renderDayHeaderContent = (day: Date) => (
    <>
      <div className="text-sm font-medium">
        {format(day, "EEE", { locale: dateLocale })}
      </div>
      <div
        className={cn(
          "text-xs text-muted-foreground",
          isSameDay(day, today) && "font-semibold text-primary"
        )}
      >
        {format(day, "d MMM", { locale: dateLocale })}
      </div>
    </>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-background">
      {/* Week navigation */}
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onToday}>
            {t("today")}
          </Button>
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onPreviousWeek}
              aria-label={t("previousWeek")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onNextWeek}
              aria-label={t("nextWeek")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">{weekLabel}</span>
          {onToggleOrientation && (
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleOrientation}
              aria-label={t("toggleOrientation")}
              title={t("toggleOrientation")}
            >
              {orientation === "staff-rows" ? (
                <Columns3 className="h-4 w-4" />
              ) : (
                <Rows3 className="h-4 w-4" />
              )}
              <span className="ms-1">
                {orientation === "staff-rows"
                  ? t("orientationColumns")
                  : t("orientationRows")}
              </span>
            </Button>
          )}
        </div>
      </div>

      {isLoading && staff.length === 0 ? (
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="w-max min-w-full">
            {/* Header row skeleton */}
            <div className="sticky top-0 z-10 flex border-b bg-muted/30">
              <div className="w-32 flex-shrink-0 border-r p-3">
                <Skeleton className="h-4 w-16" />
              </div>
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className="w-[140px] flex-1 flex-shrink-0 space-y-1.5 border-r p-3 last:border-r-0"
                >
                  <Skeleton className="h-4 w-10" />
                  <Skeleton className="h-3 w-14" />
                </div>
              ))}
            </div>

            {/* Staff row skeletons */}
            {Array.from({
              length: Math.min(Math.max(skeletonRows || 4, 1), 12),
            }).map((_, rowIdx) => (
              <div key={rowIdx} className="flex border-b last:border-b-0">
                <div className="flex w-32 flex-shrink-0 items-center gap-2 border-r p-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                </div>
                {Array.from({ length: 7 }).map((_, colIdx) => (
                  <div
                    key={colIdx}
                    className="w-[140px] flex-1 flex-shrink-0 border-r p-1.5 last:border-r-0"
                  >
                    {(rowIdx + colIdx) % 2 === 0 && (
                      <Skeleton className="h-9 w-full rounded-md" />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : staff.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          {t("noStaff")}
        </div>
      ) : orientation === "staff-columns" ? (
        <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-auto">
          <div className="w-max min-w-full">
            {/* Header row: staff columns */}
            <div className="sticky top-0 z-10 flex border-b bg-background">
              <div className="w-28 flex-shrink-0 border-r p-3 text-xs font-medium text-muted-foreground">
                {t("day")}
              </div>
              {staff.map((s) =>
                renderStaffLabel(
                  s,
                  "flex w-[160px] flex-1 flex-shrink-0 items-center gap-2 border-r p-3 text-left last:border-r-0"
                )
              )}
            </div>

            {/* Day rows */}
            {days.map((day) => {
              const isToday = isSameDay(day, today);
              return (
                <div
                  key={day.toISOString()}
                  ref={isToday ? todayRef : undefined}
                  className={cn(
                    "flex border-b last:border-b-0",
                    isToday && "bg-primary/5"
                  )}
                >
                  {/* Day label */}
                  <div className="w-28 flex-shrink-0 border-r p-3">
                    {renderDayHeaderContent(day)}
                  </div>

                  {/* Staff cells */}
                  {staff.map((s) => (
                    <div
                      key={s.id}
                      className="group w-[160px] flex-1 flex-shrink-0 border-r p-1.5 last:border-r-0"
                    >
                      {renderCellContent(s.id, day)}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-auto">
          <div className="w-max min-w-full">
            {/* Header row: day columns */}
            <div className="sticky top-0 z-10 flex border-b bg-background">
              <div className="w-32 flex-shrink-0 border-r p-3 text-xs font-medium text-muted-foreground">
                {t("staff")}
              </div>
              {days.map((day) => {
                const isToday = isSameDay(day, today);
                return (
                  <div
                    key={day.toISOString()}
                    ref={isToday ? todayRef : undefined}
                    className={cn(
                      "w-[140px] flex-1 flex-shrink-0 border-r p-3 last:border-r-0",
                      isToday && "bg-primary/5"
                    )}
                  >
                    {renderDayHeaderContent(day)}
                  </div>
                );
              })}
            </div>

            {/* Staff rows */}
            {staff.map((s) => (
              <div key={s.id} className="flex border-b last:border-b-0">
                {/* Staff label */}
                {renderStaffLabel(
                  s,
                  "flex w-32 flex-shrink-0 items-center gap-2 border-r p-3 text-left"
                )}

                {/* Day cells */}
                {days.map((day) => {
                  const isToday = isSameDay(day, today);
                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "group w-[140px] flex-1 flex-shrink-0 border-r p-1.5 last:border-r-0",
                        isToday && "bg-primary/5"
                      )}
                    >
                      {renderCellContent(s.id, day)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function getWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}
