"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
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
  CircleXIcon,
  EllipsisIcon,
  GripVerticalIcon,
  ListFilterIcon,
  PlusIcon,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { cn } from "@/lib/utils";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { ProtectedRoute } from "@/components/protected-route";
import { getServiceColorCSS } from "@/lib/color-utils";
import { useIsMobile } from "@/hooks/use-mobile";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { useLocationId } from "@/lib/company-util";
import {
  asLocationClient,
  fetchServiceIdsForLocation,
} from "@/lib/location";
import {
  PAGE_FETCH_TIMEOUT_MS,
  resolveLocationScopeIds,
  startFailClosedLoad,
  withTimeout,
} from "@/lib/async/fail-closed";
import { ServiceSheet } from "@/components/service-sheet";
import { parsePhaseType } from "@/lib/api/calendar/layout-segments";
import { toast } from "sonner";

type Treatment = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  is_active: boolean | null;
  interval: number | null;
  order: number | null;
  company_id: string;
  created_at: string;
  updated_at: string | null;
  service_variants: ServiceVariant[];
};

type ServiceVariant = {
  id: string;
  name: string;
  price: number;
  max_price: number | null;
  duration_in_minutes: number;
  actual_duration_in_minutes: number | null;
  image_path: string | null;
  order: number | null;
  service_id: string | null;
  company_id: string;
  created_at: string;
  updated_at: string | null;
  is_deleted?: boolean | null;
  phases?: Array<{
    sequence: number;
    phase_type: "busy" | "free" | "buffer";
    duration_minutes: number;
  }>;
};

// Custom filter function for multi-column searching
const multiColumnFilterFn: FilterFn<Treatment> = (
  row,
  columnId,
  filterValue
) => {
  const treatmentName = row.original.name || "";
  const searchableRowContent = `${treatmentName} ${
    row.original.description || ""
  }`.toLowerCase();
  const searchTerm = (filterValue ?? "").toLowerCase();
  return searchableRowContent.includes(searchTerm);
};

// Sortable row component
function SortableTableRow({
  treatment,
  children,
}: {
  treatment: Treatment;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: treatment.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      data-state={isDragging && "dragging"}
      className={cn(
        "hover:bg-muted/50 select-none",
        isDragging && "opacity-50 z-50"
      )}
    >
      {children}
      <TableCell className="w-10 p-0">
        <div
          {...attributes}
          {...listeners}
          className="flex items-center justify-center p-2 cursor-grab active:cursor-grabbing"
        >
          <GripVerticalIcon className="h-4 w-4 text-muted-foreground" />
        </div>
      </TableCell>
    </TableRow>
  );
}

// Move columns inside the component to access translations
const createColumns = (
  t: ReturnType<typeof useTranslations>,
  onRowClick: (treatment: Treatment) => void,
  onEdit: (treatment: Treatment) => void,
  onDelete: (treatment: Treatment) => void
): ColumnDef<Treatment>[] => [
  {
    header: t("common.name"),
    accessorKey: "name",
    cell: ({ row }) => {
      const treatment = row.original;

      return (
        <div
          className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors select-none"
          onClick={() => onRowClick(treatment)}
        >
          <div
            className="h-6 w-6 rounded-full flex-shrink-0"
            style={{
              backgroundColor: getServiceColorCSS(
                treatment.color,
                treatment.name
              ),
            }}
          />
          <div className="font-medium select-none">
            {treatment.name || t("common.notAvailable")}
          </div>
        </div>
      );
    },
    filterFn: multiColumnFilterFn,
    enableHiding: false,
  },
  {
    header: t("treatments.priceOptions"),
    accessorKey: "service_variants",
    cell: ({ row }) => {
      const priceOptions = row.original.service_variants || [];

      if (priceOptions.length === 0) {
        return (
          <div className="text-muted-foreground select-none">
            {t("treatments.noOptions")}
          </div>
        );
      }

      if (priceOptions.length === 1) {
        return (
          <div className="flex items-center space-x-2">
            <span className="text-sm select-none">
              {priceOptions[0].name} - €{priceOptions[0].price}
            </span>
          </div>
        );
      }

      return (
        <div className="flex flex-col space-y-1">
          {priceOptions.slice(0, 2).map((option) => (
            <span key={option.id} className="text-sm select-none">
              {option.name} - €{option.price}
            </span>
          ))}
          {priceOptions.length > 2 && (
            <span className="text-sm text-muted-foreground select-none">
              +{priceOptions.length - 2} {t("common.more")}
            </span>
          )}
        </div>
      );
    },
  },
  {
    header: t("common.status"),
    accessorKey: "is_active",
    cell: ({ row }) => {
      const isActive = row.getValue("is_active");
      return (
        <span
          className={`text-sm select-none ${
            isActive ? "text-green-600" : "text-gray-500"
          }`}
        >
          {isActive ? t("common.active") : t("common.inactive")}
        </span>
      );
    },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">{t("common.actions")}</span>,
    cell: ({ row }) => (
      <RowActions
        t={t}
        treatment={row.original}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    ),
    size: 60,
    enableHiding: false,
  },
];

// Sortable Mobile Card Component
function SortableMobileTreatmentCard({
  treatment,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  treatment: Treatment;
  onEdit: (treatment: Treatment) => void;
  onDelete: (treatment: Treatment) => void;
  onToggleActive: (treatment: Treatment) => void;
}) {
  const t = useTranslations();
  const priceOptions = treatment.service_variants || [];

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: treatment.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "w-full mb-4 hover:shadow-md transition-shadow select-none",
        isDragging && "opacity-50 z-50"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Drag Handle */}
            <div
              {...attributes}
              {...listeners}
              className="flex items-center justify-center p-2 cursor-grab active:cursor-grabbing"
            >
              <GripVerticalIcon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div
              className="h-6 w-6 rounded-full flex-shrink-0"
              style={{
                backgroundColor: getServiceColorCSS(
                  treatment.color,
                  treatment.name
                ),
              }}
            />
            <div>
              <h3 className="font-semibold text-lg select-none">
                {treatment.name || t("common.notAvailable")}
              </h3>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                {treatment.is_active
                  ? t("common.active")
                  : t("common.inactive")}
              </span>
              <Switch
                checked={treatment.is_active ?? true}
                onCheckedChange={() => onToggleActive(treatment)}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Price Options */}
          <div>
            <span className="text-sm font-medium text-muted-foreground">
              {t("treatments.priceOptions")}:
            </span>
            <div className="mt-1">
              {priceOptions.length === 0 ? (
                <span className="text-sm text-muted-foreground select-none">
                  {t("treatments.noOptions")}
                </span>
              ) : (
                <div className="space-y-1">
                  {priceOptions.slice(0, 2).map((option) => (
                    <div
                      key={option.id}
                      className="flex justify-between items-center text-sm select-none"
                    >
                      <span>{option.name}</span>
                      <span className="font-medium">€{option.price}</span>
                    </div>
                  ))}
                  {priceOptions.length > 2 && (
                    <span className="text-sm text-muted-foreground select-none">
                      +{priceOptions.length - 2} {t("common.more")}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {treatment.description && (
            <div>
              <span className="text-sm font-medium text-muted-foreground">
                {t("treatments.form.description")}:
              </span>
              <p className="text-sm mt-1 text-muted-foreground select-none line-clamp-2">
                {treatment.description}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(treatment)}
              className="flex-1 mr-2"
            >
              {t("treatments.actions.editDetailsShort")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(treatment)}
              className="text-destructive hover:text-destructive"
            >
              {t("treatments.actions.deleteTreatmentShort")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TreatmentPage() {
  const t = useTranslations();
  const id = useId();
  const isMobile = useIsMobile();
  const locationId = useLocationId();
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  });
  const inputRef = useRef<HTMLInputElement>(null);

  const [sorting, setSorting] = useState<SortingState>([]);

  const [data, setData] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);

  const visibleData = useMemo(
    () =>
      showInactive
        ? data
        : data.filter((treatment) => treatment.is_active !== false),
    [data, showInactive]
  );

  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(
    null
  );
  const [isTreatmentSheetOpen, setIsTreatmentSheetOpen] = useState(false);

  // Drag and drop state
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleRowClick = (treatment: Treatment) => {
    setSelectedTreatment(treatment);
    setIsTreatmentSheetOpen(true);
  };

  const handleDelete = async (treatment: Treatment) => {
    if (!treatment.id) {
      toast.error("No treatment to delete");
      return;
    }

    try {
      const supabase = createClient();

      // Soft delete: keep the row (and its price options) for historical
      // order/appointment references, just hide it from active use.
      const { error: treatmentError } = await supabase
        .from("service")
        .update({ is_deleted: true, is_active: false })
        .eq("id", treatment.id);

      if (treatmentError) {
        console.error("Error deleting treatment:", treatmentError);
        toast.error("Failed to delete treatment");
        return;
      }

      toast.success("Treatment deleted successfully!");
      refreshTreatmentData();
    } catch (error) {
      console.error("Error deleting treatment:", error);
      toast.error("An unexpected error occurred while deleting the treatment");
    }
  };

  const handleToggleActive = async (treatment: Treatment) => {
    if (!treatment.id) {
      toast.error("No treatment to update");
      return;
    }

    try {
      const supabase = createClient();
      const newActiveStatus = !treatment.is_active;

      const { error } = await supabase
        .from("service")
        .update({ is_active: newActiveStatus })
        .eq("id", treatment.id);

      if (error) {
        console.error("Error updating treatment status:", error);
        toast.error("Failed to update treatment status");
        return;
      }

      toast.success(
        `Treatment ${
          newActiveStatus ? "activated" : "deactivated"
        } successfully!`
      );
      // Refresh data without showing loading state to prevent flash
      refreshTreatmentData(false);
    } catch (error) {
      console.error("Error updating treatment status:", error);
      toast.error("An unexpected error occurred while updating the treatment");
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const updateTreatmentOrder = async (reorderedData: Treatment[]) => {
    try {
      const supabase = createClient();

      // Update each treatment individually with its new order
      const updatePromises = reorderedData.map((treatment, index) =>
        supabase
          .from("service")
          .update({ display_order: index + 1 })
          .eq("id", treatment.id)
      );

      // Wait for all updates to complete
      const results = await Promise.all(updatePromises);

      // Check for any errors
      const errors = results.filter((result) => result.error);
      if (errors.length > 0) {
        console.error("Error updating treatment order:", errors);
        // Optionally revert the local state if database update fails
        // refreshTreatmentData();
      }
    } catch (error) {
      console.error("Error updating treatment order:", error);
      // Optionally revert the local state if database update fails
      // refreshTreatmentData();
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = data.findIndex((item) => item.id === active.id);
      const newIndex = data.findIndex((item) => item.id === over?.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newData = arrayMove(data, oldIndex, newIndex);

        // Update local state immediately for responsive UI
        setData(newData);

        // Update database with new order
        updateTreatmentOrder(newData);
      }
    }

    setActiveId(null);
  };

  const columns = createColumns(
    t,
    handleRowClick,
    handleRowClick,
    handleDelete
  );

  const refreshTreatmentData = async (
    showLoading = true,
    isCancelled?: () => boolean,
  ) => {
    try {
      if (showLoading) setLoading(true);
      const supabase = createClient();
      let query = supabase
        .from("service")
        .select(
          `
          id,
          name,
          description,
          color,
          is_active,
          booking_interval_minutes,
          display_order,
          company_id,
          created_at,
          updated_at,
          service_variants:service_variant(
            id,
            name,
            price,
            max_price,
            client_duration_minutes,
            staff_duration_minutes,
            image_path,
            display_order,
            is_deleted,
            is_active,
            service_id,
            company_id,
            created_at,
            updated_at,
            phases:service_variant_phase(
              sequence,
              phase_type,
              duration_minutes
            )
          )
          `
        )
        .eq("is_deleted", false)
        .order("display_order", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });

      if (locationId) {
        const offeredIds = await resolveLocationScopeIds(
          () =>
            fetchServiceIdsForLocation(
              asLocationClient(supabase),
              locationId,
            ),
          "service location scope",
        );
        if (offeredIds) {
          if (offeredIds.length === 0) {
            if (!isCancelled?.()) setData([]);
            return;
          }
          query = query.in("id", offeredIds);
        }
      }

      const { data: treatments, error } = await withTimeout(
        query,
        PAGE_FETCH_TIMEOUT_MS,
        "service list",
      );

      if (error) {
        console.error("Error fetching treatments:", error);
        return;
      }

      if (isCancelled?.()) return;

      setData(
        (treatments || []).map((service) => ({
          id: service.id,
          name: service.name,
          description: service.description,
          color: service.color,
          is_active: service.is_active,
          interval: service.booking_interval_minutes,
          order: service.display_order,
          company_id: service.company_id,
          created_at: service.created_at,
          updated_at: service.updated_at,
          service_variants: (service.service_variants || [])
            .filter((option) => option.is_deleted !== true)
            .sort(
              (a, b) =>
                (a.display_order ?? Number.MAX_SAFE_INTEGER) -
                (b.display_order ?? Number.MAX_SAFE_INTEGER),
            )
            .map((option) => ({
              id: option.id,
              name: option.name,
              price: Number(option.price),
              max_price: option.max_price,
              duration_in_minutes: Number(option.client_duration_minutes),
              actual_duration_in_minutes: option.staff_duration_minutes,
              image_path: option.image_path,
              order: option.display_order,
              service_id: option.service_id,
              company_id: option.company_id,
              created_at: option.created_at,
              updated_at: option.updated_at,
              is_deleted: option.is_deleted,
              phases: [...(option.phases || [])]
                .sort((a, b) => a.sequence - b.sequence)
                .map((phase) => ({
                  sequence: phase.sequence,
                  phase_type: parsePhaseType(phase.phase_type),
                  duration_minutes: Number(phase.duration_minutes),
                })),
            })),
        })),
      );
    } catch (error) {
      console.error("Error refreshing treatment data:", error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    return startFailClosedLoad(
      setLoading,
      async (isCancelled) => {
        await refreshTreatmentData(false, isCancelled);
      },
      { label: "services" },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]);

  const table = useReactTable({
    data: visibleData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    enableSortingRemoval: false,
    enableSorting: false, // Disable sorting to prevent interference with drag-and-drop
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

  if (loading) {
    return (
      <ProtectedRoute>
        <AppSidebar />
        <SidebarInset>
          <div className="flex flex-1 flex-col gap-6 p-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold">{t("treatments.title")}</h1>
                <p className="text-muted-foreground">
                  {t("treatments.description")}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center h-64">
              <div className="text-muted-foreground">{t("common.loading")}</div>
            </div>
          </div>
        </SidebarInset>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppSidebar />
      <SidebarInset className="h-svh overflow-hidden lg:h-[calc(100svh-1rem)]">
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">{t("treatments.title")}</h1>
              <p className="text-muted-foreground">
                {t("treatments.description")}
              </p>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* Filter by name or description */}
                <div className="relative">
                  <Input
                    id={`${id}-input`}
                    ref={inputRef}
                    className={cn(
                      "peer min-w-60 ps-9",
                      Boolean(table.getColumn("name")?.getFilterValue()) &&
                        "pe-9"
                    )}
                    value={
                      (table.getColumn("name")?.getFilterValue() ??
                        "") as string
                    }
                    onChange={(e) =>
                      table.getColumn("name")?.setFilterValue(e.target.value)
                    }
                    placeholder={t("treatments.filterByNameOrDescription")}
                    type="text"
                    aria-label={t("treatments.filterByNameOrDescription")}
                  />
                  <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
                    <ListFilterIcon size={16} aria-hidden="true" />
                  </div>
                  {Boolean(table.getColumn("name")?.getFilterValue()) && (
                    <button
                      className="text-muted-foreground/80 hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md transition-[color,box-shadow] outline-none focus:z-10 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={t("common.clear")}
                      onClick={() => {
                        table.getColumn("name")?.setFilterValue("");
                        if (inputRef.current) {
                          inputRef.current.focus();
                        }
                      }}
                    >
                      <CircleXIcon size={16} aria-hidden="true" />
                    </button>
                  )}
                </div>
                {/* Show/hide inactive treatments */}
                <div className="flex items-center gap-2">
                  <Switch
                    id={`${id}-show-inactive`}
                    checked={showInactive}
                    onCheckedChange={setShowInactive}
                  />
                  <Label
                    htmlFor={`${id}-show-inactive`}
                    className="text-sm text-muted-foreground"
                  >
                    {t("treatments.showInactiveTreatments")}
                  </Label>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Add treatment button */}
                <Button
                  className="ml-auto"
                  variant="outline"
                  onClick={() => {
                    setSelectedTreatment(null);
                    setIsTreatmentSheetOpen(true);
                  }}
                >
                  <PlusIcon
                    className="-ms-1 opacity-60"
                    size={16}
                    aria-hidden="true"
                  />
                  {t("treatments.create")}
                </Button>
              </div>
            </div>

            {/* Responsive Layout */}
            {isMobile ? (
              /* Mobile Card Layout with Drag and Drop */
              <div className="min-h-0 flex-1 overflow-y-auto">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                <div className="space-y-4">
                  {visibleData?.length ? (
                    <SortableContext
                      items={visibleData.map((treatment) => treatment.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {visibleData.map((treatment) => (
                        <SortableMobileTreatmentCard
                          key={treatment.id}
                          treatment={treatment}
                          onEdit={handleRowClick}
                          onDelete={handleDelete}
                          onToggleActive={handleToggleActive}
                        />
                      ))}
                    </SortableContext>
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-muted-foreground">
                        {t("treatments.noTreatmentsFound")}
                      </div>
                    </div>
                  )}
                </div>
                <DragOverlay>
                  {activeId ? (
                    <div className="bg-background border rounded-md shadow-lg p-4">
                      <div className="flex items-center space-x-3">
                        <div
                          className="h-6 w-6 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: getServiceColorCSS(
                              data.find((t) => t.id === activeId)?.color ||
                                null,
                              data.find((t) => t.id === activeId)?.name || ""
                            ),
                          }}
                        />
                        <div className="font-medium select-none">
                          {data.find((t) => t.id === activeId)?.name ||
                            t("common.notAvailable")}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </DragOverlay>
                </DndContext>
              </div>
            ) : (
              /* Desktop Table Layout */
              <div className="bg-background rounded-md border overflow-hidden flex min-h-0 flex-1 flex-col">
                <div className="overflow-y-auto overflow-x-auto flex-1">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  >
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
                                        header.column.getCanSort()
                                          ? 0
                                          : undefined
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
                                      }[
                                        header.column.getIsSorted() as string
                                      ] ?? null}
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
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        ))}
                      </TableHeader>
                      <TableBody>
                        {table.getRowModel().rows?.length ? (
                          <SortableContext
                            items={table
                              .getRowModel()
                              .rows.map((row) => row.original.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {table.getRowModel().rows.map((row) => (
                              <SortableTableRow
                                key={row.id}
                                treatment={row.original}
                              >
                                {row.getVisibleCells().map((cell) => (
                                  <TableCell
                                    key={cell.id}
                                    className="last:py-0"
                                  >
                                    {flexRender(
                                      cell.column.columnDef.cell,
                                      cell.getContext()
                                    )}
                                  </TableCell>
                                ))}
                              </SortableTableRow>
                            ))}
                          </SortableContext>
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={columns.length + 1}
                              className="h-24 text-center"
                            >
                              {t("treatments.noTreatmentsFound")}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                    <DragOverlay>
                      {activeId ? (
                        <div className="bg-background border rounded-md shadow-lg p-4">
                          <div className="flex items-center space-x-3">
                            <div
                              className="h-6 w-6 rounded-full flex-shrink-0"
                              style={{
                                backgroundColor: getServiceColorCSS(
                                  data.find((t) => t.id === activeId)?.color ||
                                    null,
                                  data.find((t) => t.id === activeId)?.name ||
                                    ""
                                ),
                              }}
                            />
                            <div className="font-medium select-none">
                              {data.find((t) => t.id === activeId)?.name ||
                                "N/A"}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                </div>
              </div>
            )}

            {/* Pagination */}
            {!isMobile && (
              <div className="flex items-center justify-between gap-8">
                {/* Results per page */}
                <div className="flex items-center gap-3">
                  <Label htmlFor={id} className="max-sm:sr-only">
                    {t("treatments.rowsPerPage")}
                  </Label>
                  <Select
                    value={table.getState().pagination.pageSize.toString()}
                    onValueChange={(value) => {
                      table.setPageSize(Number(value));
                    }}
                  >
                    <SelectTrigger id={id} className="w-fit whitespace-nowrap">
                      <SelectValue
                        placeholder={t("treatments.selectNumberOfResults")}
                      />
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
                    van{" "}
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
        </div>

        {/* Treatment Sheet for editing */}
        <ServiceSheet
          service={selectedTreatment}
          isOpen={isTreatmentSheetOpen}
          onOpenChange={setIsTreatmentSheetOpen}
          onSave={refreshTreatmentData}
          onDelete={() => {
            // Handle delete from sheet - refresh data
            refreshTreatmentData();
          }}
        />
      </SidebarInset>
    </ProtectedRoute>
  );
}

function RowActions({
  t,
  treatment,
  onEdit,
  onDelete,
}: {
  t: ReturnType<typeof useTranslations>;
  treatment: Treatment;
  onEdit: (treatment: Treatment) => void;
  onDelete: (treatment: Treatment) => void;
}) {
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
          <DropdownMenuItem onClick={() => onEdit(treatment)}>
            <span>{t("treatments.actions.editDetailsShort")}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => onDelete(treatment)}
          >
            <span>{t("treatments.actions.deleteTreatmentShort")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
