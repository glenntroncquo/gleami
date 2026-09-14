"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ColumnDef,
  FilterFn,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CircleXIcon,
  CopyIcon,
  ListFilterIcon,
  SparklesIcon,
  TicketIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { useCompanyId } from "@/lib/company-util";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

type CreatorCodeRow = {
  id: string;
  code: string;
  created_at: string;
  expires_at: string | null;
  is_active: boolean | null;
  referrer_client_id: string | null;
  creator: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
};

const buildFullName = (row: CreatorCodeRow) =>
  `${row.creator?.first_name || ""} ${row.creator?.last_name || ""}`.trim();

const creatorFilterFn: FilterFn<CreatorCodeRow> = (row, _columnId, filterValue) => {
  const raw = String(filterValue ?? "").trim().toLowerCase();
  if (!raw) return true;

  const original = row.original;
  const haystack = [
    buildFullName(original),
    original.creator?.email,
    original.creator?.phone,
    original.code,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(raw);
};

const createColumns = (
  t: ReturnType<typeof useTranslations>
): ColumnDef<CreatorCodeRow>[] => [
  {
    id: "creator",
    accessorFn: (row) => buildFullName(row),
    header: t("common.name"),
    cell: ({ row }) => {
      const fullName = buildFullName(row.original);
      const initials =
        row.original.creator?.first_name && row.original.creator?.last_name
          ? `${row.original.creator.first_name.charAt(0)}${row.original.creator.last_name.charAt(0)}`
          : fullName.charAt(0);

      return (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,hsl(var(--primary)/0.18),hsl(var(--accent)/0.22))] text-sm font-semibold text-foreground">
            {(initials || "?").toUpperCase()}
          </div>
          <div className="space-y-0.5">
            <div className="font-medium text-foreground">
              {fullName || t("common.notAvailable")}
            </div>
            <div className="text-sm text-muted-foreground">
              {row.original.creator?.email || t("common.notAvailable")}
            </div>
          </div>
        </div>
      );
    },
    filterFn: creatorFilterFn,
    enableHiding: false,
  },
  {
    id: "phone",
    accessorFn: (row) => row.creator?.phone || "",
    header: t("common.phone"),
    cell: ({ row }) => row.original.creator?.phone || t("common.notAvailable"),
  },
  {
    accessorKey: "code",
    header: t("marketing.creators.columns.code"),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-muted px-3 py-1 font-mono text-xs font-semibold tracking-[0.18em] text-foreground">
          {row.original.code}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={(event) => {
            event.stopPropagation();
            void navigator.clipboard.writeText(row.original.code);
            toast.success(t("marketing.creators.codeCopied"));
          }}
          aria-label={t("marketing.creators.copyCode")}
        >
          <CopyIcon size={15} />
        </Button>
      </div>
    ),
  },
  {
    id: "status",
    accessorFn: (row) => (row.is_active ? "active" : "inactive"),
    header: t("common.status"),
    cell: ({ row }) => (
      <Badge
        variant="secondary"
        className={cn(
          "rounded-full border-0 px-2.5 py-1 text-xs font-medium",
          row.original.is_active
            ? "bg-emerald-100 text-emerald-700"
            : "bg-slate-200 text-slate-600"
        )}
      >
        {row.original.is_active ? t("common.active") : t("common.inactive")}
      </Badge>
    ),
  },
  {
    id: "created_at",
    accessorFn: (row) => row.created_at,
    header: t("marketing.creators.columns.created"),
    cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString(),
  },
];

export function CreatorsOverview() {
  const t = useTranslations();
  const companyId = useCompanyId();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [data, setData] = useState<CreatorCodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "created_at", desc: true },
  ]);

  useEffect(() => {
    const loadCreatorCodes = async () => {
      setLoading(true);

      try {
        if (!companyId) {
          setData([]);
          return;
        }

        const supabase = createClient();
        const { data: rows, error } = await supabase
          .from("referral_code")
          .select(
            "id, code, created_at, expires_at, is_active, referrer_client_id, creator:client!referral_code_referrer_client_id_fkey(id, first_name, last_name, email, phone)"
          )
          .eq("company_id", companyId)
          .not("referrer_client_id", "is", null)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setData((rows as CreatorCodeRow[]) ?? []);
      } catch (error) {
        console.error("Failed to load creators overview:", error);
        toast.error(t("marketing.creators.loadError"));
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    void loadCreatorCodes();
  }, [companyId, t]);

  const columns = useMemo(() => createColumns(t), [t]);

  const table = useReactTable({
    data,
    columns,
    state: {
      globalFilter: filter,
      sorting,
    },
    onGlobalFilterChange: setFilter,
    onSortingChange: setSorting,
    globalFilterFn: creatorFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
  });

  const uniqueCreators = useMemo(
    () => new Set(data.map((row) => row.referrer_client_id).filter(Boolean)).size,
    [data]
  );

  const activeCodes = useMemo(
    () => data.filter((row) => row.is_active).length,
    [data]
  );

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-0 bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.20),_transparent_38%),linear-gradient(135deg,hsl(var(--background)),hsl(var(--muted)/0.55))] shadow-sm">
        <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-3">
            <Badge
              variant="secondary"
              className="w-fit rounded-full border-0 bg-background/80 px-3 py-1 text-xs font-medium text-foreground"
            >
              <SparklesIcon className="mr-1.5" size={14} />
              {t("marketing.creators.eyebrow")}
            </Badge>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                {t("marketing.creators.title")}
              </h2>
              <p className="max-w-xl text-sm leading-6 text-muted-foreground md:text-base">
                {t("marketing.creators.description")}
              </p>
            </div>
          </div>

          <div className="grid min-w-full gap-3 sm:grid-cols-3 md:min-w-[420px]">
            <div className="rounded-3xl border border-white/40 bg-background/80 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <UsersIcon size={16} />
                {t("marketing.creators.stats.creators")}
              </div>
              <div className="mt-2 text-2xl font-semibold">{uniqueCreators}</div>
            </div>
            <div className="rounded-3xl border border-white/40 bg-background/80 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TicketIcon size={16} />
                {t("marketing.creators.stats.codes")}
              </div>
              <div className="mt-2 text-2xl font-semibold">{data.length}</div>
            </div>
            <div className="rounded-3xl border border-white/40 bg-background/80 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <SparklesIcon size={16} />
                {t("marketing.creators.stats.active")}
              </div>
              <div className="mt-2 text-2xl font-semibold">{activeCodes}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardContent className="space-y-5 p-0">
          <div className="flex flex-col gap-4 border-b border-border/60 px-6 py-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground">
                {t("marketing.creators.tableTitle")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("marketing.creators.tableDescription")}
              </p>
            </div>

            <div className="relative w-full md:max-w-sm">
              <Input
                id={inputId}
                ref={inputRef}
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder={t("marketing.creators.searchPlaceholder")}
                className={cn("peer h-11 rounded-full ps-10", filter && "pe-10")}
                aria-label={t("marketing.creators.searchPlaceholder")}
              />
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-muted-foreground/80">
                <ListFilterIcon size={16} />
              </div>
              {filter ? (
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => {
                    setFilter("");
                    inputRef.current?.focus();
                  }}
                  aria-label={t("common.clear")}
                >
                  <CircleXIcon size={16} />
                </button>
              ) : null}
            </div>
          </div>

          <div className="overflow-x-auto px-2 pb-2">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="hover:bg-transparent">
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="h-12 px-4">
                        {header.isPlaceholder ? null : header.column.getCanSort() ? (
                          <button
                            type="button"
                            className="flex items-center gap-2 text-left font-medium"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            {{
                              asc: <ChevronUpIcon size={15} className="opacity-60" />,
                              desc: (
                                <ChevronDownIcon size={15} className="opacity-60" />
                              ),
                            }[header.column.getIsSorted() as string] ?? null}
                          </button>
                        ) : (
                          flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      {t("common.loading")}
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} className="transition-colors hover:bg-muted/40">
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="px-4 py-4 align-middle">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-28 text-center">
                      <div className="space-y-1">
                        <div className="font-medium">
                          {t("marketing.creators.empty.title")}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {t("marketing.creators.empty.description")}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-4 border-t border-border/60 px-6 py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <Label htmlFor={`${inputId}-page-size`} className="text-sm text-muted-foreground">
                {t("clients.rowsPerPage")}
              </Label>
              <Select
                value={String(table.getState().pagination.pageSize)}
                onValueChange={(value) => table.setPageSize(Number(value))}
              >
                <SelectTrigger
                  id={`${inputId}-page-size`}
                  className="w-[90px] rounded-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 25, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={String(pageSize)}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-muted-foreground">
              {table.getRowCount() === 0
                ? "0"
                : `${table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-${Math.min(
                    (table.getState().pagination.pageIndex + 1) *
                      table.getState().pagination.pageSize,
                    table.getRowCount()
                  )}`}{" "}
              {t("marketing.creators.pagination.of")} {table.getRowCount()}
            </div>

            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="rounded-full"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <ChevronLeftIcon size={16} />
                  </Button>
                </PaginationItem>
                <PaginationItem>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="rounded-full"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    <ChevronRightIcon size={16} />
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
