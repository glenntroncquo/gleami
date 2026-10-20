"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
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
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
import { useCompanyId, useLocationId } from "@/lib/company-util";
import { PAGE_FETCH_TIMEOUT_MS, withTimeout } from "@/lib/async/fail-closed";
import {
  clientPageCount,
  isClientSortColumn,
} from "@/lib/api/client/queries/client-page";
import { fetchClientPage } from "@/lib/api/client/queries/fetch-client-page";
import { ClientDetailSheet } from "@/components/client-detail-sheet";
import { ClientSheet } from "@/components/client-sheet";

type Client = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string | null;
};

// Move columns inside the component to access translations
const createColumns = (
  t: ReturnType<typeof useTranslations>,
  onRowClick: (client: Client) => void
): ColumnDef<Client>[] => [
  {
    header: t("common.name"),
    accessorKey: "first_name",
    cell: ({ row }) => {
      const client = row.original;
      const fullName = `${client.first_name || ""} ${
        client.last_name || ""
      }`.trim();

      return (
        <div
          className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors"
          onClick={() => onRowClick(client)}
        >
          <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
            <div className="h-full w-full flex items-center justify-center text-sm font-medium text-gray-600">
              {client.first_name && client.last_name
                ? `${client.first_name
                    .charAt(0)
                    .toUpperCase()}${client.last_name.charAt(0).toUpperCase()}`
                : t("common.notAvailable")}
            </div>
          </div>
          <div className="font-medium">
            {fullName || t("common.notAvailable")}
          </div>
        </div>
      );
    },
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
    cell: ({ row }) => <RowActions t={t} client={row.original} />,
    size: 60,
    enableHiding: false,
  },
];

export default function ClientPage() {
  const t = useTranslations();
  const id = useId();
  const companyId = useCompanyId();
  const locationId = useLocationId();
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  });
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [refreshToken, setRefreshToken] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [scopedLocationId, setScopedLocationId] = useState(locationId);
  if (locationId !== scopedLocationId) {
    setScopedLocationId(locationId);
    setLoading(true);
    setData([]);
    setTotal(0);
    if (pagination.pageIndex !== 0) {
      setPagination((current) => ({ ...current, pageIndex: 0 }));
    }
    if (search !== "") setSearch("");
  }

  const [sorting, setSorting] = useState<SortingState>([
    {
      id: "first_name",
      desc: false,
    },
  ]);

  const [data, setData] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isClientSheetOpen, setIsClientSheetOpen] = useState(false);
  const [isCreateClientSheetOpen, setIsCreateClientSheetOpen] = useState(false);

  const handleRowClick = (client: Client) => {
    setSelectedClient(client);
    setIsClientSheetOpen(true);
  };

  const columns = createColumns(t, handleRowClick);

  const refreshClientData = () => {
    setRefreshToken((current) => current + 1);
  };

  useEffect(() => {
    let cancelled = false;
    const sort = sorting[0];
    const sortColumn = sort && isClientSortColumn(sort.id) ? sort.id : "first_name";
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          const page = await withTimeout(
            fetchClientPage({
              locationId,
              pageIndex: pagination.pageIndex,
              pageSize: pagination.pageSize,
              search,
              sortColumn,
              sortDescending: Boolean(sort?.desc),
            }),
            PAGE_FETCH_TIMEOUT_MS,
            "client list",
          );
          if (cancelled) return;
          setData(page.rows);
          setTotal(page.total);
          const lastPage = Math.max(0, clientPageCount(page.total, pagination.pageSize) - 1);
          if (pagination.pageIndex > lastPage) {
            setPagination((current) => ({ ...current, pageIndex: lastPage }));
          }
        } catch (error) {
          console.error("Error fetching clients:", error);
          if (!cancelled) {
            setData([]);
            setTotal(0);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, search.trim() ? 250 : 0);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [
    locationId,
    companyId,
    pagination.pageIndex,
    pagination.pageSize,
    sorting,
    search,
    refreshToken,
  ]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount: Math.max(1, clientPageCount(total, pagination.pageSize)),
    rowCount: total,
    onSortingChange: (updater) => {
      setSorting(updater);
      setPagination((current) =>
        current.pageIndex === 0 ? current : { ...current, pageIndex: 0 },
      );
    },
    enableSortingRemoval: false,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      pagination,
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
                <h1 className="text-3xl font-bold">{t("clients.title")}</h1>
                <p className="text-muted-foreground">
                  {t("clients.description")}
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
              <h1 className="text-3xl font-bold">{t("clients.title")}</h1>
              <p className="text-muted-foreground">
                {t("clients.description")}
              </p>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* Filter by name or email */}
                <div className="relative">
                  <Input
                    id={`${id}-input`}
                    ref={inputRef}
                    className={cn(
                      "peer min-w-60 ps-9",
                      Boolean(search) && "pe-9"
                    )}
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPagination((current) =>
                        current.pageIndex === 0
                          ? current
                          : { ...current, pageIndex: 0 },
                      );
                    }}
                    placeholder={t("clients.filterByNameOrEmail")}
                    type="text"
                    aria-label={t("clients.filterByNameOrEmail")}
                  />
                  <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
                    <ListFilterIcon size={16} aria-hidden="true" />
                  </div>
                  {Boolean(search) && (
                    <button
                      className="text-muted-foreground/80 hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md transition-[color,box-shadow] outline-none focus:z-10 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={t("common.clear")}
                      onClick={() => {
                        setSearch("");
                        setPagination((current) =>
                          current.pageIndex === 0
                            ? current
                            : { ...current, pageIndex: 0 },
                        );
                        if (inputRef.current) {
                          inputRef.current.focus();
                        }
                      }}
                    >
                      <CircleXIcon size={16} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Add client button */}
                <Button
                  className="ml-auto"
                  variant="outline"
                  onClick={() => {
                    setIsCreateClientSheetOpen(true);
                  }}
                >
                  <PlusIcon
                    className="-ms-1 opacity-60"
                    size={16}
                    aria-hidden="true"
                  />
                  {t("clients.addClient")}
                </Button>
              </div>
            </div>

            {/* Table */}
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
                          className="hover:bg-muted/50 cursor-pointer"
                          onClick={() => handleRowClick(row.original)}
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
                          {t("clients.noClientsFound")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Pagination */}
            <div className="flex shrink-0 items-center justify-between gap-8">
              {/* Results per page */}
              <div className="flex items-center gap-3">
                <Label htmlFor={id} className="max-sm:sr-only">
                  {t("clients.rowsPerPage")}
                </Label>
                <Select
                  value={table.getState().pagination.pageSize.toString()}
                  onValueChange={(value) => {
                    setPagination({ pageIndex: 0, pageSize: Number(value) });
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
                    {table.getRowCount() === 0
                      ? 0
                      : table.getState().pagination.pageIndex *
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
                  {t("clients.pageOf")}{" "}
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
          </div>
        </div>

        <ClientSheet
          isOpen={isCreateClientSheetOpen}
          onClose={() => setIsCreateClientSheetOpen(false)}
          onRefresh={refreshClientData}
        />

        {/* Client detail sheet: full history when clicking a row */}
        <ClientDetailSheet
          clientId={selectedClient?.id ?? null}
          companyId={companyId}
          isOpen={isClientSheetOpen}
          onClose={() => setIsClientSheetOpen(false)}
          onUpdated={refreshClientData}
        />
      </SidebarInset>
    </ProtectedRoute>
  );
}

function RowActions({
  t,
  client,
}: {
  t: ReturnType<typeof useTranslations>;
  client: Client;
}) {
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div
            className="flex justify-end"
            onClick={(e) => e.stopPropagation()}
          >
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
          <DropdownMenuItem>
            <span>{t("clients.edit")}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive">
            <span>{t("clients.delete")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
