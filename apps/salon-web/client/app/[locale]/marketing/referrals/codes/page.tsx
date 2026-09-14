"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useCompanyId } from "@/lib/company-util";
import type { Tables } from "@/lib/types/supabase-types";
import { toast } from "sonner";

import {
  ColumnDef,
  ColumnFiltersState,
  FilterFn,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { SearchIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TicketIcon, UsersIcon, SparklesIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReferralCodeSheet } from "@/components/referrals/referral-code-sheet";

type ReferralCodeRow = Tables<"referral_code">;

const codeFilterFn: FilterFn<ReferralCodeRow> = (row, _columnId, filterValue) => {
  const raw = String(filterValue ?? "").trim().toLowerCase();
  if (!raw) return true;

  const haystack = [row.original.code, row.original.referrer_client_id]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(raw);
};

export default function ReferralCodesPage() {
  const t = useTranslations();
  const companyId = useCompanyId();

  const [codes, setCodes] = useState<ReferralCodeRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState<ReferralCodeRow | null>(null);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const loadCodes = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!companyId) {
        setCodes([]);
        return;
      }
      const supabase = createClient();
      const { data, error } = await supabase
        .from("referral_code")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCodes(data ?? []);
    } catch (err) {
      console.error(err);
      toast.error(t("referrals.codes.loadError"));
      setCodes([]);
    } finally {
      setIsLoading(false);
    }
  }, [companyId, t]);

  useEffect(() => {
    void loadCodes();
  }, [loadCodes]);

  const emptyState = useMemo(
    () => !isLoading && codes.length === 0,
    [codes.length, isLoading]
  );

  const stats = useMemo(() => {
    const codesCount = codes.length;
    const activeCodes = codes.filter((c) => Boolean(c.is_active)).length;
    const creators = new Set(
      codes
        .map((c) => c.referrer_client_id)
        .filter((id): id is string => Boolean(id))
    ).size;

    return { creators, codesCount, activeCodes };
  }, [codes]);

  const toggleActive = useCallback(
    async (row: ReferralCodeRow, nextActive: boolean) => {
      try {
        if (!companyId) return;
        const supabase = createClient();
        const { error } = await supabase
          .from("referral_code")
          .update({ is_active: nextActive })
          .eq("id", row.id)
          .eq("company_id", companyId);

        if (error) throw error;
        setCodes((prev) =>
          prev.map((c) => (c.id === row.id ? { ...c, is_active: nextActive } : c))
        );
      } catch (err) {
        console.error(err);
        toast.error(t("referrals.codes.toggleError"));
      }
    },
    [companyId, t]
  );

  const columns = useMemo((): ColumnDef<ReferralCodeRow>[] => {
    return [
      {
        id: "code",
        accessorKey: "code",
        header: t("referrals.codes.columns.code"),
        cell: ({ row }) => (
          <div className="font-medium text-foreground">{row.original.code}</div>
        ),
        filterFn: codeFilterFn,
      },
      {
        id: "created_at",
        accessorKey: "created_at",
        header: t("referrals.codes.columns.created"),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {new Date(row.original.created_at).toLocaleString()}
          </span>
        ),
      },
      {
        id: "expires_at",
        accessorKey: "expires_at",
        header: t("referrals.codes.columns.expires"),
        cell: ({ row }) =>
          row.original.expires_at ? (
            <Badge variant="secondary">
              {new Date(row.original.expires_at).toLocaleDateString()}
            </Badge>
          ) : (
            <Badge variant="outline">{t("referrals.codes.noExpiry")}</Badge>
          ),
      },
      {
        id: "referrer_client_id",
        accessorKey: "referrer_client_id",
        header: t("referrals.codes.columns.referrer"),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.referrer_client_id ?? t("referrals.codes.none")}
          </span>
        ),
      },
      {
        id: "is_active",
        accessorKey: "is_active",
        header: t("common.status"),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {row.original.is_active ? t("common.active") : t("common.inactive")}
            </span>
            <Switch
              checked={Boolean(row.original.is_active)}
              onCheckedChange={(checked) => toggleActive(row.original, checked)}
            />
          </div>
        ),
      },
    ];
  }, [t, toggleActive]);

  const table = useReactTable({
    data: codes,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: codeFilterFn,
  });

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{t("referrals.codes.title")}</h2>
          {t("referrals.codes.description") ? (
            <p className="text-sm text-muted-foreground">
              {t("referrals.codes.description")}
            </p>
          ) : null}
        </div>

        <Button
          onClick={() => {
            setSelectedCode(null);
            setIsSheetOpen(true);
          }}
        >
          {t("referrals.codes.actions.new")}
        </Button>
      </div>

      <div className="mt-6 grid gap-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                {t("referrals.codes.stats.creators")}
              </div>
              <UsersIcon className="size-4 text-muted-foreground" />
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {isLoading ? <Skeleton className="h-7 w-12" /> : stats.creators}
            </div>
          </div>
          <div className="rounded-lg border bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                {t("referrals.codes.stats.codes")}
              </div>
              <TicketIcon className="size-4 text-muted-foreground" />
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {isLoading ? <Skeleton className="h-7 w-12" /> : stats.codesCount}
            </div>
          </div>
          <div className="rounded-lg border bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                {t("referrals.codes.stats.active")}
              </div>
              <SparklesIcon className="size-4 text-muted-foreground" />
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {isLoading ? <Skeleton className="h-7 w-12" /> : stats.activeCodes}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[260px] flex-1 sm:flex-none">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
            <Input
              value={(table.getState().globalFilter as string) ?? ""}
              onChange={(event) => table.setGlobalFilter(event.target.value)}
              placeholder={t("referrals.codes.searchPlaceholder")}
              className="pl-9 pr-9"
            />
            {(table.getState().globalFilter as string) ? (
              <button
                type="button"
                onClick={() => table.setGlobalFilter("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <XIcon className="size-4" />
              </button>
            ) : null}
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-lg border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Skeleton className="h-4 w-24" />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-4 w-24" />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-4 w-16" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 6 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-24" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : emptyState ? (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>{t("referrals.codes.empty.title")}</CardTitle>
              <CardDescription>{t("referrals.codes.empty.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => {
                  setSelectedCode(null);
                  setIsSheetOpen(true);
                }}
              >
                {t("referrals.codes.actions.new")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border bg-background">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        <button
                          type="button"
                          className={cn(
                            "inline-flex items-center gap-2",
                            header.column.getCanSort() && "cursor-pointer select-none"
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </button>
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedCode(row.original);
                      setIsSheetOpen(true);
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <ReferralCodeSheet
        open={isSheetOpen}
        onOpenChange={(open) => {
          setIsSheetOpen(open);
          if (!open) setSelectedCode(null);
        }}
        onCreated={() => {
          void loadCodes();
        }}
        referralCode={selectedCode}
      />
    </>
  );
}

