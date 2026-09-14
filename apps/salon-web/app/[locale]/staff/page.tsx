"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { addDays } from "date-fns";
import {
  ColumnDef,
  ColumnFiltersState,
  FilterFn,
  flexRender,
  getCoreRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import {
  ChevronDownIcon,
  ChevronFirstIcon,
  ChevronLastIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CircleAlertIcon,
  CircleXIcon,
  Columns3Icon,
  EllipsisIcon,
  ListFilterIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { ProtectedRoute } from "@/components/protected-route";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";
import { StaffSheet } from "@/components/staff-sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import AvailabilitySelectorDialog from "@/components/availability-selector-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  StaffScheduleGrid,
  getWeekStart,
} from "@/components/staff-schedule/staff-schedule-grid";
import { UnavailabilityDialog } from "@/components/unavailability-dialog";
import { fetchWeekSchedule } from "@/lib/api/staff/queries/fetch-week-schedule";
import { AppointmentSheet } from "@/components/appointment-sheet";
import type { CalendarEvent } from "@/components/event-calendar";
import { fetchAppointmentById } from "@/lib/api/calendar/queries/fetch-appointment-by-id";
import { transformAppointmentToEvent } from "@/lib/api/calendar/transform-appointment";
import type {
  ScheduleAvailabilityBlock,
  ScheduleStaff,
  ScheduleUnavailabilityBlock,
  WeekScheduleData,
} from "@/components/staff-schedule/types";
import { CalendarPlus, CalendarX2 } from "lucide-react";
import { useCompanyId, useLocationId } from "@/lib/company-util";
import {
  asLocationClient,
  fetchStaffIdsForLocation,
  staffIdsForLocationScope,
} from "@/lib/location";
import {
  PAGE_FETCH_TIMEOUT_MS,
  resolveLocationScopeIds,
  startFailClosedLoad,
  withTimeout,
} from "@/lib/async/fail-closed";

type Staff = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  slug: string | null;
  specialization: string | null;
  image_path: string | null;
  role: string | null;
  status: string | null;
  hire_date: string | null;
  specialties: string[] | null;
  availability?: {
    id: string | number;
    start: string;
    end: string;
    day_of_week: number | null;
    recurring: boolean;
  }[];
};

// Helper function to get weekday abbreviations
const getWeekdayAbbr = (dayOfWeek: number, locale: string = "nl") => {
  const days = {
    en: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
    nl: ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"],
    fr: ["Di", "Lu", "Ma", "Me", "Je", "Ve", "Sa"],
  };
  return days[locale as keyof typeof days]?.[dayOfWeek] || days.en[dayOfWeek];
};

const STAFF_LIST_SELECT = `id, first_name, last_name, email, phone, slug, specialization, image_path, role, status, hire_date, specialties,
           staff_schedule_rule (id, start_time, end_time, day_of_week, is_active)`;

async function loadStaffRows(
  locationId: string | null,
  multiLocationEnabled: boolean,
): Promise<Staff[]> {
  const supabase = createClient();
  let query = supabase.from("staff").select(STAFF_LIST_SELECT);
  if (locationId && multiLocationEnabled) {
    const scopedIds = staffIdsForLocationScope(
      await resolveLocationScopeIds(
        () => fetchStaffIdsForLocation(asLocationClient(supabase), locationId),
        "staff location scope",
      ),
      multiLocationEnabled,
    );
    if (scopedIds) {
      if (scopedIds.length === 0) return [];
      query = query.in("id", scopedIds);
    }
  }

  const { data: staff, error } = await withTimeout(
    query,
    PAGE_FETCH_TIMEOUT_MS,
    "staff list",
  );
  if (error) {
    console.error("Error fetching staff:", error);
    return [];
  }
  return (staff || []).map(mapStaffScheduleToAvailability);
}

function mapStaffScheduleToAvailability(row: Staff & {
  staff_schedule_rule?: Array<{
    id: string;
    start_time?: string;
    end_time?: string;
    day_of_week: number | null;
    is_active?: boolean | null;
  }>;
}): Staff {
  const rules = (row.staff_schedule_rule || []).filter(
    (rule) => rule.is_active !== false,
  );
  return {
    ...row,
    availability: rules.map((rule) => ({
      id: rule.id,
      start: rule.start_time || "",
      end: rule.end_time || "",
      day_of_week: rule.day_of_week,
      recurring: true,
    })),
  };
}

const formatAvailabilityCircles = (
  availability: Staff["availability"],
  t: ReturnType<typeof useTranslations>,
  locale: string = "nl"
) => {
  // Get available days from the availability data
  const availableDays = new Set(
    (availability || [])
      .map((slot) => slot.day_of_week)
      .filter((day) => day !== null) as number[]
  );

  // All days of the week (0 = Sunday, 1 = Monday, etc.)
  const allDays = [1, 2, 3, 4, 5, 6, 0]; // Start with Monday (1) and end with Sunday (0)

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {allDays.map((day) => {
        const isAvailable = availableDays.has(day);
        return (
          <div
            key={day}
            className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium ${
              isAvailable
                ? "bg-blue-100 text-blue-800"
                : "bg-gray-100 text-gray-400"
            }`}
          >
            {getWeekdayAbbr(day, locale)}
          </div>
        );
      })}
    </div>
  );
};

// Custom filter function for multi-column searching
const multiColumnFilterFn: FilterFn<Staff> = (row, columnId, filterValue) => {
  const fullName = `${row.original.first_name || ""} ${
    row.original.last_name || ""
  }`.trim();
  const searchableRowContent =
    `${fullName} ${row.original.email}`.toLowerCase();
  const searchTerm = (filterValue ?? "").toLowerCase();
  return searchableRowContent.includes(searchTerm);
};

// Status filter function - Commented out for future use
// const statusFilterFn: FilterFn<Staff> = (
//   row,
//   columnId,
//   filterValue: string[]
// ) => {
//   if (!filterValue?.length) return true;
//   const status = row.getValue(columnId) as string;
//   return filterValue.includes(status);
// };

// Move columns inside the component to access translations
const createColumns = (
  t: ReturnType<typeof useTranslations>,
  onRowClick: (staff: Staff) => void,
  onDelete: (staff: Staff) => void,
  onAvailability: (staff: Staff) => void
): ColumnDef<Staff>[] => [
  {
    header: t("common.name"),
    accessorKey: "first_name",
    cell: ({ row }) => {
      const staff = row.original;
      const fullName = `${staff.first_name || ""} ${
        staff.last_name || ""
      }`.trim();

      return (
        <div
          className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors"
          onClick={() => onRowClick(staff)}
        >
          <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
            {staff.image_path ? (
              <img
                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/company/${staff.image_path}`}
                alt={fullName || "Staff member"}
                className="h-full w-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  target.nextElementSibling?.classList.remove("hidden");
                }}
              />
            ) : null}
            <div
              className={`h-full w-full flex items-center justify-center text-sm font-medium text-gray-600 ${
                staff.image_path ? "hidden" : ""
              }`}
            >
              {staff.first_name && staff.last_name
                ? `${staff.first_name.charAt(0).toUpperCase()}${staff.last_name
                    .charAt(0)
                    .toUpperCase()}`
                : t("common.notAvailable")}
            </div>
          </div>
          <div className="font-medium">
            {fullName || t("common.notAvailable")}
          </div>
        </div>
      );
    },
    filterFn: multiColumnFilterFn,
    enableHiding: false,
  },
  {
    header: t("common.email"),
    accessorKey: "email",
  },
  {
    header: t("common.phone"),
    accessorKey: "phone",
    cell: ({ row }) => (
      <div>{row.getValue("phone") || t("common.notAvailable")}</div>
    ),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">{t("common.actions")}</span>,
    cell: ({ row }) => (
      <RowActions
        t={t}
        staff={row.original}
        onDelete={onDelete}
        onEdit={onRowClick}
        onAvailability={onAvailability}
      />
    ),
    size: 60,
    enableHiding: false,
  },
];

// Mobile Staff Card Component
function MobileStaffCard({
  staff,
  onEdit,
  onDelete,
  onToggleStatus,
  onAvailabilityClick,
}: {
  staff: Staff;
  onEdit: (staff: Staff) => void;
  onDelete: (staff: Staff) => void;
  onToggleStatus: (staff: Staff) => void;
  onAvailabilityClick: (staff: Staff) => void;
}) {
  const t = useTranslations();
  const fullName = `${staff.first_name || ""} ${staff.last_name || ""}`.trim();

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
              {staff.image_path ? (
                <img
                  src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/company/${staff.image_path}`}
                  alt={fullName || "Staff member"}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                    target.nextElementSibling?.classList.remove("hidden");
                  }}
                />
              ) : null}
              <div
                className={`h-full w-full flex items-center justify-center text-sm font-medium text-gray-600 ${
                  staff.image_path ? "hidden" : ""
                }`}
              >
                {staff.first_name && staff.last_name
                  ? `${staff.first_name
                      .charAt(0)
                      .toUpperCase()}${staff.last_name.charAt(0).toUpperCase()}`
                  : t("common.notAvailable")}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-lg select-none">
                {fullName || t("common.notAvailable")}
              </h3>
              <p className="text-sm text-muted-foreground select-none">
                {staff.email}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                {staff.status === "Active"
                  ? t("common.active")
                  : t("common.inactive")}
              </span>
              <Switch
                checked={staff.status === "Active"}
                onCheckedChange={() => onToggleStatus(staff)}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Phone */}
          {staff.phone && (
            <div>
              <span className="text-sm font-medium text-muted-foreground">
                {t("common.phone")}:
              </span>
              <p className="text-sm mt-1 text-muted-foreground select-none">
                {staff.phone}
              </p>
            </div>
          )}

          {/* Specialization */}
          {staff.specialization && (
            <div>
              <span className="text-sm font-medium text-muted-foreground">
                {t("staff.specialization")}:
              </span>
              <p className="text-sm mt-1 text-muted-foreground select-none line-clamp-2">
                {staff.specialization}
              </p>
            </div>
          )}

          {/* Availability */}
          <div
            className="cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors"
            onClick={() => onAvailabilityClick(staff)}
          >
            <span className="text-sm font-medium text-muted-foreground">
              {t("staff.form.availability")}:
            </span>
            <div className="mt-1">
              {formatAvailabilityCircles(staff.availability, t, "nl")}
            </div>
            <p className="text-xs mt-1 text-blue-600 hover:text-blue-800 select-none">
              {t("staff.form.clickToEditAvailability")}
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(staff)}
              className="flex-1 mr-2"
            >
              {t("staff.actions.editDetailsShort")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(staff)}
              className="text-destructive hover:text-destructive"
            >
              {t("staff.actions.removeStaffShort")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function StaffPage() {
  const t = useTranslations();
  const id = useId();
  const { user, multiLocationEnabled } = useAuth();
  const isMobile = useIsMobile();
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  });
  const inputRef = useRef<HTMLInputElement>(null);

  const [sorting, setSorting] = useState<SortingState>([
    {
      id: "first_name",
      desc: false,
    },
  ]);

  const [data, setData] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [isStaffSheetOpen, setIsStaffSheetOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<Staff | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAvailabilityDialogOpen, setIsAvailabilityDialogOpen] =
    useState(false);
  const [staffForAvailability, setStaffForAvailability] =
    useState<Staff | null>(null);

  // Schedule view state
  const companyId = useCompanyId();
  const locationId = useLocationId();
  const [view, setView] = useState<"list" | "schedule">("schedule");
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [scheduleData, setScheduleData] = useState<WeekScheduleData>({
    staff: [],
    availabilities: [],
    unavailabilities: [],
    appointments: [],
  });
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleOrientation, setScheduleOrientation] = useState<
    "staff-rows" | "staff-columns"
  >("staff-rows");
  const [isUnavailabilityDialogOpen, setIsUnavailabilityDialogOpen] =
    useState(false);
  const [unavailabilityDefaults, setUnavailabilityDefaults] = useState<{
    staffId: string | null;
    date: Date | null;
  }>({ staffId: null, date: null });
  const [editUnavailability, setEditUnavailability] =
    useState<ScheduleUnavailabilityBlock | null>(null);
  const [blockToDelete, setBlockToDelete] = useState<
    | { kind: "availability"; block: ScheduleAvailabilityBlock }
    | { kind: "unavailability"; block: ScheduleUnavailabilityBlock }
    | null
  >(null);
  const [isDeletingBlock, setIsDeletingBlock] = useState(false);
  const [appointmentEvent, setAppointmentEvent] = useState<CalendarEvent | null>(
    null
  );
  const [isAppointmentSheetOpen, setIsAppointmentSheetOpen] = useState(false);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  // Prefer staff from the schedule query, but fall back to the already-loaded
  // staff list so rows render immediately while availabilities load.
  const scheduleStaff = useMemo<ScheduleStaff[]>(() => {
    if (scheduleData.staff.length > 0) return scheduleData.staff;
    return data.map((s) => ({
      id: s.id,
      firstName: s.first_name,
      lastName: s.last_name,
      imagePath: s.image_path,
    }));
  }, [scheduleData.staff, data]);

  const loadSchedule = async () => {
    if (!companyId) {
      setScheduleLoading(false);
      return;
    }
    setScheduleLoading(true);
    try {
      const { data: result, error } = await withTimeout(
        fetchWeekSchedule(companyId, weekDays, locationId, multiLocationEnabled),
        PAGE_FETCH_TIMEOUT_MS,
        "staff schedule",
      );
      if (error) {
        console.error("Error loading schedule:", error);
        toast.error(t("staff.schedule.loadError"));
        return;
      }
      if (result) setScheduleData(result);
    } catch (error) {
      console.error("Error loading schedule:", error);
      toast.error(t("staff.schedule.loadError"));
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleAppointmentClick = async (appointmentId: string) => {
    const { data: appointment, error } = await fetchAppointmentById(
      appointmentId
    );
    if (error || !appointment) {
      console.error("Error loading appointment:", error);
      toast.error(t("staff.schedule.loadError"));
      return;
    }
    setAppointmentEvent(transformAppointmentToEvent(appointment, t));
    setIsAppointmentSheetOpen(true);
  };

  const handleAddAppointment = (staffId: string, date: Date) => {
    const staff = data.find((s) => s.id === staffId);
    const start = new Date(date);
    start.setHours(9, 0, 0, 0);
    const end = new Date(date);
    end.setHours(10, 0, 0, 0);
    setAppointmentEvent({
      id: "",
      title: "",
      start,
      end,
      allDay: false,
      staff: staff
        ? {
            id: staff.id,
            first_name: staff.first_name || "",
            last_name: staff.last_name || "",
            image_path: staff.image_path,
          }
        : undefined,
    });
    setIsAppointmentSheetOpen(true);
  };

  const closeAppointmentSheet = () => {
    setIsAppointmentSheetOpen(false);
  };

  useEffect(() => {
    if (view === "schedule") {
      loadSchedule();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, weekStart, companyId, locationId, multiLocationEnabled]);

  useEffect(() => {
    const stored = localStorage.getItem("staffScheduleOrientation");
    if (stored === "staff-rows" || stored === "staff-columns") {
      setScheduleOrientation(stored);
    }
  }, []);

  const toggleScheduleOrientation = () => {
    setScheduleOrientation((prev) => {
      const next = prev === "staff-rows" ? "staff-columns" : "staff-rows";
      localStorage.setItem("staffScheduleOrientation", next);
      return next;
    });
  };

  const openUnavailabilityDialog = (staffId?: string | null, date?: Date | null) => {
    setEditUnavailability(null);
    setUnavailabilityDefaults({ staffId: staffId ?? null, date: date ?? null });
    setIsUnavailabilityDialogOpen(true);
  };

  const openEditUnavailabilityDialog = (block: ScheduleUnavailabilityBlock) => {
    setEditUnavailability(block);
    setUnavailabilityDefaults({ staffId: block.staffId, date: block.start });
    setIsUnavailabilityDialogOpen(true);
  };

  const handleConfirmDeleteBlock = async () => {
    if (!blockToDelete) return;
    setIsDeletingBlock(true);
    try {
      const supabase = createClient();
      const table =
        blockToDelete.kind === "unavailability" ||
        (blockToDelete.kind === "availability" &&
          !blockToDelete.block.recurring)
          ? "staff_schedule_exception"
          : "staff_schedule_rule";
      const id =
        blockToDelete.kind === "availability"
          ? blockToDelete.block.sourceId
          : blockToDelete.block.id;
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) {
        toast.error(t("staff.schedule.deleteError"));
        return;
      }
      toast.success(t("staff.schedule.deleteSuccess"));
      setBlockToDelete(null);
      await loadSchedule();
    } finally {
      setIsDeletingBlock(false);
    }
  };

  const handleRowClick = (staff: Staff) => {
    // Open the staff sheet for editing
    setSelectedStaff(staff);
    setIsStaffSheetOpen(true);
  };

  const handleAvailabilityClick = (staff: Staff) => {
    // Open the availability dialog
    setStaffForAvailability(staff);
    setIsAvailabilityDialogOpen(true);
  };

  const handleToggleStatus = async (staff: Staff) => {
    const newStatus = staff.status === "Active" ? "Inactive" : "Active";

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("staff")
        .update({ status: newStatus })
        .eq("id", staff.id);

      if (error) {
        console.error("Error updating staff status:", error);
        toast.error("Failed to update staff status");
        return;
      }

      // Update local state
      setData((prev) =>
        prev.map((s) => (s.id === staff.id ? { ...s, status: newStatus } : s))
      );

      toast.success(
        `Staff ${
          newStatus === "Active" ? "activated" : "deactivated"
        } successfully!`
      );
    } catch (error) {
      console.error("Error updating staff status:", error);
      toast.error("An unexpected error occurred while updating the staff");
    }
  };

  const handleDeleteStaff = async (staff: Staff) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("staff")
        .delete()
        .eq("id", staff.id);

      if (error) {
        console.error("Error deleting staff:", error);
        toast.error(t("staff.deleteError"));
        return;
      }

      // Update local state
      setData((prev) => prev.filter((s) => s.id !== staff.id));

      toast.success(t("staff.deleteSuccess"));
      setIsDeleteDialogOpen(false);
      setStaffToDelete(null);
    } catch (error) {
      console.error("Error deleting staff:", error);
      toast.error(t("staff.deleteError"));
    }
  };

  const handleDeleteClick = (staff: Staff) => {
    setStaffToDelete(staff);
    setIsDeleteDialogOpen(true);
  };

  const columns = createColumns(
    t,
    handleRowClick,
    handleDeleteClick,
    handleAvailabilityClick
  );

  const refreshStaffData = async () => {
    setLoading(true);
    try {
      setData(await loadStaffRows(locationId, multiLocationEnabled));
    } catch (error) {
      console.error("Error refreshing staff data:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }

    return startFailClosedLoad(
      setLoading,
      async (isCancelled) => {
        try {
          const rows = await loadStaffRows(locationId, multiLocationEnabled);
          if (!isCancelled()) setData(rows);
        } catch (error) {
          console.error("Error fetching staff:", error);
          if (!isCancelled()) setData([]);
        }
      },
      { label: "staff" },
    );
  }, [user, locationId, multiLocationEnabled]);

  const handleDeleteRows = async () => {
    const selectedRows = table.getSelectedRowModel().rows;
    const selectedIds = selectedRows.map((row) => row.original.id);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("staff")
        .delete()
        .in("id", selectedIds);

      if (error) {
        console.error("Error deleting staff:", error);
      }

      // Update local state regardless of Supabase success
      const updatedData = data.filter(
        (item) => !selectedRows.some((row) => row.original.id === item.id)
      );
      setData(updatedData);
      table.resetRowSelection();
    } catch (error) {
      console.error("Error:", error);
      // Still update local state for demo purposes
      const updatedData = data.filter(
        (item) => !selectedRows.some((row) => row.original.id === item.id)
      );
      setData(updatedData);
      table.resetRowSelection();
    }
  };

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    enableSortingRemoval: false,
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    state: {
      sorting,
      pagination,
      columnFilters,
      columnVisibility,
    },
  });

  // Status filter functions - Commented out for future use
  // const uniqueStatusValues = useMemo(() => {
  //   const statusColumn = table.getColumn("status");
  //   if (!statusColumn) return [];
  //   const values = Array.from(statusColumn.getFacetedUniqueValues().keys());
  //   return values.sort();
  // }, [table.getColumn("status")?.getFacetedUniqueValues()]);

  // const statusCounts = useMemo(() => {
  //   const statusColumn = table.getColumn("status");
  //   if (!statusColumn) return new Map();
  //   return statusColumn.getFacetedUniqueValues();
  // }, [table.getColumn("status")?.getFacetedUniqueValues()]);

  // const selectedStatuses = useMemo(() => {
  //   const filterValue = table.getColumn("status")?.getFilterValue() as string[];
  //   return filterValue ?? [];
  // }, [table.getColumn("status")?.getFilterValue()]);

  // const handleStatusChange = (checked: boolean, value: string) => {
  //   const filterValue = table.getColumn("status")?.getFilterValue() as string[];
  //   const newFilterValue = filterValue ? [...filterValue] : [];
  //   if (checked) {
  //     newFilterValue.push(value);
  //   } else {
  //     const index = newFilterValue.indexOf(value);
  //     if (index > -1) {
  //       newFilterValue.splice(index, 1);
  //     }
  //   }
  //   table
  //     .getColumn("status")
  //     ?.setFilterValue(newFilterValue.length ? newFilterValue : undefined);
  // };

  return (
    <ProtectedRoute>
      <AppSidebar />
      <SidebarInset className="h-svh overflow-hidden lg:h-[calc(100svh-1rem)]">
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">{t("staff.title")}</h1>
              <p className="text-muted-foreground">{t("staff.description")}</p>
            </div>
            <Tabs
              value={view}
              onValueChange={(v) => setView(v as "list" | "schedule")}
            >
              <TabsList>
                <TabsTrigger value="schedule">
                  {t("staff.views.schedule")}
                </TabsTrigger>
                <TabsTrigger value="list">{t("staff.views.list")}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {view === "schedule" ? (
            <div className="flex min-h-0 flex-1 flex-col gap-4">
              <div className="flex flex-wrap items-center justify-end gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button>
                      <PlusIcon
                        className="-ms-1 opacity-90"
                        size={16}
                        aria-hidden="true"
                      />
                      {t("staff.schedule.add")}
                      <ChevronDownIcon
                        className="-me-1 ms-1 opacity-70"
                        size={16}
                        aria-hidden="true"
                      />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedStaff(null);
                        setIsStaffSheetOpen(true);
                      }}
                    >
                      <PlusIcon
                        className="opacity-60"
                        size={16}
                        aria-hidden="true"
                      />
                      <span>{t("staff.addStaff")}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => openUnavailabilityDialog()}>
                      <CalendarX2
                        className="opacity-60"
                        size={16}
                        aria-hidden="true"
                      />
                      <span>{t("staff.schedule.addUnavailability")}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        const first = scheduleData.staff[0];
                        if (!first) {
                          toast.error(t("staff.schedule.noStaff"));
                          return;
                        }
                        setStaffForAvailability({
                          id: first.id,
                          first_name: first.firstName,
                          last_name: first.lastName,
                          email: "",
                          phone: null,
                          slug: null,
                          specialization: null,
                          image_path: first.imagePath,
                          role: null,
                          status: null,
                          hire_date: null,
                          specialties: null,
                        });
                        setIsAvailabilityDialogOpen(true);
                      }}
                    >
                      <CalendarPlus
                        className="opacity-60"
                        size={16}
                        aria-hidden="true"
                      />
                      <span>{t("staff.schedule.addAvailability")}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <StaffScheduleGrid
                weekStart={weekStart}
                staff={scheduleStaff}
                availabilities={scheduleData.availabilities}
                unavailabilities={scheduleData.unavailabilities}
                appointments={scheduleData.appointments}
                orientation={scheduleOrientation}
                onToggleOrientation={toggleScheduleOrientation}
                isLoading={scheduleLoading}
                skeletonRows={data.length || undefined}
                onPreviousWeek={() =>
                  setWeekStart((prev) => addDays(prev, -7))
                }
                onNextWeek={() => setWeekStart((prev) => addDays(prev, 7))}
                onToday={() => setWeekStart(getWeekStart(new Date()))}
                onAddUnavailability={(staffId, date) =>
                  openUnavailabilityDialog(staffId, date)
                }
                onAddAppointment={handleAddAppointment}
                onAddAvailability={(staffId) => {
                  const staff = data.find((s) => s.id === staffId);
                  if (staff) {
                    setStaffForAvailability(staff);
                    setIsAvailabilityDialogOpen(true);
                  }
                }}
                onEditAvailability={(block) => {
                  const staff = data.find((s) => s.id === block.staffId);
                  if (staff) {
                    setStaffForAvailability(staff);
                    setIsAvailabilityDialogOpen(true);
                  }
                }}
                onEditUnavailability={(block) =>
                  openEditUnavailabilityDialog(block)
                }
                onDeleteAvailability={(block) =>
                  setBlockToDelete({ kind: "availability", block })
                }
                onDeleteUnavailability={(block) =>
                  setBlockToDelete({ kind: "unavailability", block })
                }
                onStaffClick={(staffId) => {
                  const staff = data.find((s) => s.id === staffId);
                  if (staff) handleRowClick(staff);
                }}
                onAppointmentClick={handleAppointmentClick}
              />
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-muted-foreground">{t("common.loading")}</div>
            </div>
          ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* Filter by name, email, or role */}
                <div className="relative">
                  <Input
                    id={`${id}-input`}
                    ref={inputRef}
                    className={cn(
                      "peer min-w-60 ps-9",
                      Boolean(
                        table.getColumn("first_name")?.getFilterValue()
                      ) && "pe-9"
                    )}
                    value={
                      (table.getColumn("first_name")?.getFilterValue() ??
                        "") as string
                    }
                    onChange={(e) =>
                      table
                        .getColumn("first_name")
                        ?.setFilterValue(e.target.value)
                    }
                    placeholder={t("staff.filterByNameOrEmail")}
                    type="text"
                    aria-label={t("staff.filterByNameOrEmail")}
                  />
                  <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
                    <ListFilterIcon size={16} aria-hidden="true" />
                  </div>
                  {Boolean(table.getColumn("first_name")?.getFilterValue()) && (
                    <button
                      className="text-muted-foreground/80 hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md transition-[color,box-shadow] outline-none focus:z-10 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={t("common.clear")}
                      onClick={() => {
                        table.getColumn("first_name")?.setFilterValue("");
                        if (inputRef.current) {
                          inputRef.current.focus();
                        }
                      }}
                    >
                      <CircleXIcon size={16} aria-hidden="true" />
                    </button>
                  )}
                </div>
                {/* Filter by status - Commented out for future use */}
                {/* <Popover>
                   <PopoverTrigger asChild>
                     <Button variant="outline">
                       <FilterIcon
                         className="-ms-1 opacity-60"
                         size={16}
                         aria-hidden="true"
                       />
                       Status
                       {selectedStatuses.length > 0 && (
                         <span className="bg-background text-muted-foreground/70 -me-1 inline-flex h-5 max-h-full items-center rounded border px-1 font-[inherit] text-[0.625rem] font-medium">
                           {selectedStatuses.length}
                         </span>
                       )}
                     </Button>
                   </PopoverTrigger>
                   <PopoverContent className="w-auto min-w-36 p-3" align="start">
                  <div className="space-y-3">
                       <div className="text-muted-foreground text-xs font-medium">
                         Filters
                    </div>
                       <div className="space-y-3">
                         {uniqueStatusValues.map((value, i) => (
                           <div key={value} className="flex items-center gap-2">
                             <Checkbox
                               id={`${id}-${i}`}
                               checked={selectedStatuses.includes(value)}
                               onCheckedChange={(checked: boolean) =>
                                 handleStatusChange(checked, value)
                               }
                             />
                             <Label
                               htmlFor={`${id}-${i}`}
                               className="flex grow justify-between gap-2 font-normal"
                             >
                               {value}{" "}
                               <span className="text-muted-foreground ms-2 text-xs">
                                 {statusCounts.get(value)}
                          </span>
                             </Label>
                           </div>
                        ))}
                      </div>
                    </div>
                   </PopoverContent>
                 </Popover> */}
                {/* Toggle columns visibility */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Columns3Icon
                        className="-ms-1 opacity-60"
                        size={16}
                        aria-hidden="true"
                      />
                      {t("common.view")}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>
                      {t("staff.toggleColumns")}
                    </DropdownMenuLabel>
                    {table
                      .getAllColumns()
                      .filter((column) => column.getCanHide())
                      .map((column) => {
                        return (
                          <DropdownMenuCheckboxItem
                            key={column.id}
                            className="capitalize"
                            checked={column.getIsVisible()}
                            onCheckedChange={(value) =>
                              column.toggleVisibility(!!value)
                            }
                            onSelect={(event) => event.preventDefault()}
                          >
                            {column.id}
                          </DropdownMenuCheckboxItem>
                        );
                      })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-center gap-3">
                {/* Delete button */}
                {table.getSelectedRowModel().rows.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="ml-auto" variant="outline">
                        <TrashIcon
                          className="-ms-1 opacity-60"
                          size={16}
                          aria-hidden="true"
                        />
                        {t("common.delete")}
                        <span className="bg-background text-muted-foreground/70 -me-1 inline-flex h-5 max-h-full items-center rounded border px-1 font-[inherit] text-[0.625rem] font-medium">
                          {table.getSelectedRowModel().rows.length}
                        </span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <div className="flex flex-col gap-2 max-sm:items-center sm:flex-row sm:gap-4">
                        <div
                          className="flex size-9 shrink-0 items-center justify-center rounded-full border"
                          aria-hidden="true"
                        >
                          <CircleAlertIcon className="opacity-80" size={16} />
                        </div>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {t("staff.deleteConfirmTitle")}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("staff.deleteConfirmDescription", {
                              count: table.getSelectedRowModel().rows.length,
                            })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel>
                          {t("common.cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteRows}>
                          {t("common.delete")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                {/* Add staff button */}
                <Button
                  className="ml-auto"
                  variant="outline"
                  onClick={() => {
                    setSelectedStaff(null); // null means we're creating new staff
                    setIsStaffSheetOpen(true);
                  }}
                >
                  <PlusIcon
                    className="-ms-1 opacity-60"
                    size={16}
                    aria-hidden="true"
                  />
                  {t("staff.addStaff")}
                </Button>
              </div>
            </div>

            {/* Responsive Layout */}
            {isMobile ? (
              /* Mobile Card Layout */
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="space-y-4">
                  {data?.length ? (
                    data.map((staff) => (
                      <MobileStaffCard
                        key={staff.id}
                        staff={staff}
                        onEdit={handleRowClick}
                        onDelete={(staff) => {
                          setStaffToDelete(staff);
                          setIsDeleteDialogOpen(true);
                        }}
                        onToggleStatus={handleToggleStatus}
                        onAvailabilityClick={handleAvailabilityClick}
                      />
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-muted-foreground">
                        {t("staff.noStaffFound")}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Desktop Table Layout */
              <div className="bg-background rounded-md border overflow-hidden flex min-h-0 flex-1 flex-col">
                <div className="overflow-y-auto overflow-x-auto flex-1">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow
                          key={headerGroup.id}
                          className="hover:bg-transparent"
                        >
                          {headerGroup.headers.map((header) => {
                            return (
                              <TableHead key={header.id} className="h-11">
                                {header.isPlaceholder ? null : header.column.getCanSort() ? (
                                  <div
                                    className={cn(
                                      header.column.getCanSort() &&
                                        "flex h-full cursor-pointer items-center justify-between gap-2 select-none"
                                    )}
                                    onClick={header.column.getToggleSortingHandler()}
                                    onKeyDown={(e) => {
                                      // Enhanced keyboard handling for sorting
                                      if (
                                        header.column.getCanSort() &&
                                        (e.key === "Enter" || e.key === " ")
                                      ) {
                                        e.preventDefault();
                                        header.column.getToggleSortingHandler()?.(
                                          e
                                        );
                                      }
                                    }}
                                    tabIndex={
                                      header.column.getCanSort() ? 0 : undefined
                                    }
                                  >
                                    {flexRender(
                                      header.column.columnDef.header,
                                      header.getContext()
                                    )}
                                    {{
                                      asc: (
                                        <ChevronUpIcon
                                          className="shrink-0 opacity-60"
                                          size={16}
                                          aria-hidden="true"
                                        />
                                      ),
                                      desc: (
                                        <ChevronDownIcon
                                          className="shrink-0 opacity-60"
                                          size={16}
                                          aria-hidden="true"
                                        />
                                      ),
                                    }[header.column.getIsSorted() as string] ??
                                      null}
                                  </div>
                                ) : (
                                  flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )
                                )}
                              </TableHead>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableHeader>
                    <TableBody>
                      {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                          <TableRow
                            key={row.id}
                            data-state={row.getIsSelected() && "selected"}
                          >
                            {row.getVisibleCells().map((cell) => (
                              <TableCell key={cell.id} className="last:py-0">
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={columns.length}
                            className="h-24 text-center"
                          >
                            {t("staff.noStaffFound")}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Pagination - Desktop Only */}
            {!isMobile && (
              <div className="flex items-center justify-between gap-8">
                {/* Results per page */}
                <div className="flex items-center gap-3">
                  <Label htmlFor={id} className="max-sm:sr-only">
                    {t("staff.rowsPerPage")}
                  </Label>
                  <Select
                    value={table.getState().pagination.pageSize.toString()}
                    onValueChange={(value) => {
                      table.setPageSize(Number(value));
                    }}
                  >
                    <SelectTrigger id={id} className="w-fit whitespace-nowrap">
                      <SelectValue placeholder="Select number of results" />
                    </SelectTrigger>
                    <SelectContent className="[&_*[role=option]]:ps-2 [&_*[role=option]]:pe-8 [&_*[role=option]>span]:start-auto [&_*[role=option]>span]:end-2">
                      {[5, 10, 25, 50].map((pageSize) => (
                        <SelectItem key={pageSize} value={pageSize.toString()}>
                          {pageSize}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Page number information */}
                <div className="text-muted-foreground flex grow justify-end text-sm whitespace-nowrap">
                  <p
                    className="text-muted-foreground text-sm whitespace-nowrap"
                    aria-live="polite"
                  >
                    <span className="text-foreground">
                      {table.getState().pagination.pageIndex *
                        table.getState().pagination.pageSize +
                        1}
                      -
                      {Math.min(
                        Math.max(
                          table.getState().pagination.pageIndex *
                            table.getState().pagination.pageSize +
                            table.getState().pagination.pageSize,
                          0
                        ),
                        table.getRowCount()
                      )}
                    </span>{" "}
                    of{" "}
                    <span className="text-foreground">
                      {table.getRowCount().toString()}
                    </span>
                  </p>
                </div>

                {/* Pagination buttons */}
                <div>
                  <Pagination>
                    <PaginationContent>
                      {/* First page button */}
                      <PaginationItem>
                        <Button
                          size="icon"
                          variant="outline"
                          className="disabled:pointer-events-none disabled:opacity-50"
                          onClick={() => table.firstPage()}
                          disabled={!table.getCanPreviousPage()}
                          aria-label="Go to first page"
                        >
                          <ChevronFirstIcon size={16} aria-hidden="true" />
                        </Button>
                      </PaginationItem>
                      {/* Previous page button */}
                      <PaginationItem>
                        <Button
                          size="icon"
                          variant="outline"
                          className="disabled:pointer-events-none disabled:opacity-50"
                          onClick={() => table.previousPage()}
                          disabled={!table.getCanPreviousPage()}
                          aria-label="Go to previous page"
                        >
                          <ChevronLeftIcon size={16} aria-hidden="true" />
                        </Button>
                      </PaginationItem>
                      {/* Next page button */}
                      <PaginationItem>
                        <Button
                          size="icon"
                          variant="outline"
                          className="disabled:pointer-events-none disabled:opacity-50"
                          onClick={() => table.nextPage()}
                          disabled={!table.getCanNextPage()}
                          aria-label="Go to next page"
                        >
                          <ChevronRightIcon size={16} aria-hidden="true" />
                        </Button>
                      </PaginationItem>
                      {/* Last page button */}
                      <PaginationItem>
                        <Button
                          size="icon"
                          variant="outline"
                          className="disabled:pointer-events-none disabled:opacity-50"
                          onClick={() => table.lastPage()}
                          disabled={!table.getCanNextPage()}
                          aria-label="Go to last page"
                        >
                          <ChevronLastIcon size={16} aria-hidden="true" />
                        </Button>
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </div>
            )}
          </div>
          )}
        </div>
      </SidebarInset>

      {/* Main Staff Sheet for creating new staff only */}
      <StaffSheet
        staff={selectedStaff}
        isOpen={isStaffSheetOpen}
        onClose={() => {
          setIsStaffSheetOpen(false);
          setSelectedStaff(null);
        }}
        onSave={(updatedStaff) => {
          if (selectedStaff) {
            // Update existing staff (shouldn't happen from list page, but handle it)
            setData((prev) =>
              prev.map((staff) =>
                staff.id === updatedStaff.id ? updatedStaff : staff
              )
            );
          } else {
            // Add new staff
            setData((prev) => [...prev, updatedStaff]);
          }
        }}
        onRefresh={refreshStaffData}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <div className="flex flex-col gap-2 max-sm:items-center sm:flex-row sm:gap-4">
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-full border"
              aria-hidden="true"
            >
              <CircleAlertIcon className="opacity-80" size={16} />
            </div>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("staff.deleteSingleConfirmTitle")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {staffToDelete && (
                  <>
                    {t("staff.deleteSingleConfirmDescription", {
                      name:
                        `${staffToDelete.first_name || ""} ${
                          staffToDelete.last_name || ""
                        }`.trim() || staffToDelete.email,
                    })}
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setStaffToDelete(null)}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => staffToDelete && handleDeleteStaff(staffToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Availability Dialog */}
      <AvailabilitySelectorDialog
        open={isAvailabilityDialogOpen}
        onOpenChange={setIsAvailabilityDialogOpen}
        staffData={
          staffForAvailability
            ? {
                id: staffForAvailability.id,
                first_name: staffForAvailability.first_name || undefined,
                last_name: staffForAvailability.last_name || undefined,
              }
            : undefined
        }
        onSuccess={() => {
          refreshStaffData();
          if (view === "schedule") loadSchedule();
          setIsAvailabilityDialogOpen(false);
          setStaffForAvailability(null);
        }}
      />

      {/* Unavailability Dialog */}
      <UnavailabilityDialog
        open={isUnavailabilityDialogOpen}
        onOpenChange={(open) => {
          setIsUnavailabilityDialogOpen(open);
          if (!open) setEditUnavailability(null);
        }}
        staffOptions={scheduleData.staff.map((s) => ({
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
        }))}
        defaultStaffId={unavailabilityDefaults.staffId}
        defaultDate={unavailabilityDefaults.date}
        editBlock={
          editUnavailability
            ? {
                id: editUnavailability.id,
                staffId: editUnavailability.staffId,
                start: editUnavailability.start,
                end: editUnavailability.end,
              }
            : null
        }
        onSuccess={() => loadSchedule()}
      />

      {/* Delete schedule block confirmation */}
      <AlertDialog
        open={!!blockToDelete}
        onOpenChange={(open) => {
          if (!open) setBlockToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {blockToDelete?.kind === "availability"
                ? t("staff.schedule.deleteAvailabilityTitle")
                : t("staff.schedule.deleteUnavailabilityTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {blockToDelete?.kind === "availability" &&
              blockToDelete.block.recurring
                ? t("staff.schedule.deleteRecurringDescription")
                : t("staff.schedule.deleteBlockDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingBlock}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDeleteBlock();
              }}
              disabled={isDeletingBlock}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Appointment detail sheet (same as calendar) */}
      {appointmentEvent ? (
        <AppointmentSheet
          key={appointmentEvent.id}
          event={appointmentEvent}
          isOpen={isAppointmentSheetOpen}
          onClose={closeAppointmentSheet}
          onSave={() => {
            closeAppointmentSheet();
            loadSchedule();
          }}
          onDelete={() => {
            closeAppointmentSheet();
            loadSchedule();
          }}
          onRefresh={() => loadSchedule()}
        />
      ) : null}
    </ProtectedRoute>
  );
}

function RowActions({
  t,
  staff,
  onDelete,
  onEdit,
  onAvailability,
}: {
  t: ReturnType<typeof useTranslations>;
  staff: Staff;
  onDelete: (staff: Staff) => void;
  onEdit: (staff: Staff) => void;
  onAvailability: (staff: Staff) => void;
}) {
  const handleEditStaff = () => {
    onEdit(staff);
  };

  const handleOpenAvailability = () => {
    onAvailability(staff);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="flex justify-end">
            <Button
              size="icon"
              variant="ghost"
              className="shadow-none"
              aria-label={t("common.actions")}
            >
              <EllipsisIcon size={16} aria-hidden="true" />
            </Button>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleEditStaff}>
            <span>{t("staff.actions.editDetailsShort")}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleOpenAvailability}>
            <span>{t("staff.actions.addAvailability")}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => onDelete(staff)}
          >
            <span>{t("staff.actions.removeStaffShort")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
