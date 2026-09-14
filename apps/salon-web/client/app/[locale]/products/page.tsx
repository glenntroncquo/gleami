"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  FilterFn,
  useReactTable,
  Row,
} from "@tanstack/react-table";
import {
  ChevronDownIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import {
  ProductSheet,
  type ProductEditorProduct,
} from "@/components/product-sheet";
import { useCompanyId } from "@/lib/company-util";
import {
  PAGE_FETCH_TIMEOUT_MS,
  startFailClosedLoad,
  withTimeout,
} from "@/lib/async/fail-closed";
import {
  FILTER_NO_PRODUCT_CATEGORY,
  FILTER_NO_PRODUCT_LINE,
} from "@/lib/product-taxonomy";

type Product = ProductEditorProduct;

function mergeMultiSelectWithNewOptions(
  prev: string[],
  previousAll: string[],
  nextAll: string[],
): string[] {
  const wasFull =
    previousAll.length > 0 &&
    prev.length === previousAll.length &&
    previousAll.every((id) => prev.includes(id));
  if (wasFull || prev.length === 0) {
    return nextAll;
  }
  const prevValid = prev.filter((id) => nextAll.includes(id));
  const added = nextAll.filter((id) => !previousAll.includes(id));
  return [...new Set([...prevValid, ...added])];
}

// Custom filter function for multi-column searching
const multiColumnFilterFn: FilterFn<Product> = (row, _columnId, filterValue) => {
  const searchableRowContent = `${row.original.name || ""} ${
    row.original.sku || ""
  }`.toLowerCase();
  const searchTerm = (filterValue ?? "").toLowerCase();
  return searchableRowContent.includes(searchTerm);
};

export default function ProductsPage() {
  const t = useTranslations();
  const companyId = useCompanyId();
  const [data, setData] = useState<Product[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<
    { id: string; name: string | null }[]
  >([]);
  const [lineOptions, setLineOptions] = useState<
    { id: string; name: string | null }[]
  >([]);
  const prevCategoryAllRef = useRef<string[]>([]);
  const prevLineAllRef = useRef<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductSheetOpen, setIsProductSheetOpen] = useState(false);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const allLineFilterIds = useMemo(
    () => [FILTER_NO_PRODUCT_LINE, ...lineOptions.map((l) => l.id)],
    [lineOptions],
  );
  const allCategoryFilterIds = useMemo(
    () => [FILTER_NO_PRODUCT_CATEGORY, ...categoryOptions.map((c) => c.id)],
    [categoryOptions],
  );

  const [selectedLineIds, setSelectedLineIds] = useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [collapsedLineKeys, setCollapsedLineKeys] = useState<
    Record<string, boolean>
  >({});
  const hasInitializedCollapsedRef = useRef(false);

  const loadData = useCallback(async () => {
    if (!companyId) {
      setData([]);
      setCategoryOptions([]);
      setLineOptions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();
      const [prodRes, catRes, lineRes] = await withTimeout(
        Promise.all([
        supabase
          .from("product")
          .select(
            "*, product_category(id, name), product_line(id, name)",
          )
          .order("name"),
        supabase
          .from("product_category")
          .select("id, name")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("name"),
        supabase
          .from("product_line")
          .select("id, name")
          .eq("company_id", companyId)
          .eq("is_active", true)
          .order("name"),
      ]),
        PAGE_FETCH_TIMEOUT_MS,
        "products",
      );

      if (prodRes.error) {
        console.error("Error fetching products:", prodRes.error);
      } else {
        setData((prodRes.data || []) as Product[]);
      }

      const cats = (catRes.data || []) as { id: string; name: string | null }[];
      const lines = (lineRes.data || []) as {
        id: string;
        name: string | null;
      }[];

      if (catRes.error) {
        console.error("Error fetching categories:", catRes.error);
      } else {
        setCategoryOptions(cats);
      }
      if (lineRes.error) {
        console.error("Error fetching product lines:", lineRes.error);
      } else {
        setLineOptions(lines);
      }

      const nextCatAll = [FILTER_NO_PRODUCT_CATEGORY, ...cats.map((c) => c.id)];
      const nextLineAll = [FILTER_NO_PRODUCT_LINE, ...lines.map((l) => l.id)];

      setSelectedCategoryIds((prev) =>
        mergeMultiSelectWithNewOptions(
          prev,
          prevCategoryAllRef.current,
          nextCatAll,
        ),
      );
      setSelectedLineIds((prev) =>
        mergeMultiSelectWithNewOptions(prev, prevLineAllRef.current, nextLineAll),
      );
      prevCategoryAllRef.current = nextCatAll;
      prevLineAllRef.current = nextLineAll;
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    return startFailClosedLoad(
      setLoading,
      async () => {
        await loadData();
      },
      { label: "products" },
    );
  }, [loadData]);

  useEffect(() => {
    if (hasInitializedCollapsedRef.current) return;
    if (lineOptions.length === 0) return;
    hasInitializedCollapsedRef.current = true;
    const next: Record<string, boolean> = { [FILTER_NO_PRODUCT_LINE]: true };
    for (const line of lineOptions) {
      next[line.id] = true;
    }
    setCollapsedLineKeys(next);
  }, [lineOptions]);

  const refreshProductData = () => {
    void loadData();
  };

  const filteredByTaxonomy = useMemo(() => {
    if (selectedLineIds.length === 0 || selectedCategoryIds.length === 0) {
      return [];
    }

    const allLinesSelected =
      selectedLineIds.length === allLineFilterIds.length &&
      allLineFilterIds.every((id) => selectedLineIds.includes(id));
    const allCatsSelected =
      selectedCategoryIds.length === allCategoryFilterIds.length &&
      allCategoryFilterIds.every((id) => selectedCategoryIds.includes(id));

    return data.filter((p) => {
      const lineKey = p.product_line_id ?? FILTER_NO_PRODUCT_LINE;
      const catKey = p.product_category_id ?? FILTER_NO_PRODUCT_CATEGORY;
      const lineOk = allLinesSelected || selectedLineIds.includes(lineKey);
      const catOk = allCatsSelected || selectedCategoryIds.includes(catKey);
      return lineOk && catOk;
    });
  }, [
    data,
    selectedLineIds,
    selectedCategoryIds,
    allLineFilterIds,
    allCategoryFilterIds,
  ]);

  const sortedTableData = useMemo(() => {
    return [...filteredByTaxonomy].sort((a, b) => {
      const nameA = a.product_line?.name ?? "";
      const nameB = b.product_line?.name ?? "";
      const lineCmp = nameA.localeCompare(nameB, undefined, {
        sensitivity: "base",
      });
      if (lineCmp !== 0) return lineCmp;
      return (a.name ?? "").localeCompare(b.name ?? "", undefined, {
        sensitivity: "base",
      });
    });
  }, [filteredByTaxonomy]);

  const columns = useMemo((): ColumnDef<Product>[] => {
    return [
      {
        accessorKey: "name",
        id: "name",
        filterFn: multiColumnFilterFn,
        header: t("common.name"),
        cell: ({ row }) => {
          const product = row.original;
          return (
            <div className="flex items-center gap-3 p-2 rounded-md transition-colors">
              <div className="flex flex-col">
                <div className="font-medium">
                  {product.name || t("common.unknown")}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("products.form.sku")}:{" "}
                  {product.sku || t("common.notAvailable")}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        id: "product_category",
        header: t("products.table.category"),
        accessorFn: (row) => row.product_category?.name ?? "",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.product_category?.name ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "cost_price",
        id: "purchase_price",
        header: t("products.table.purchasePrice"),
        cell: ({ row }) => {
          const cost = row.original.cost_price as number | null | undefined;
          if (cost == null || Number.isNaN(Number(cost))) {
            return (
              <span className="text-sm text-muted-foreground">—</span>
            );
          }
          return (
            <div className="font-medium">€{Number(cost).toFixed(2)}</div>
          );
        },
      },
      {
        accessorKey: "price_gross",
        id: "sale_price",
        header: t("products.table.salePrice"),
        cell: ({ row }) => {
          const price = row.original.price_gross as number | null;
          const n = price ?? 0;
          return <div className="font-medium">€{n.toFixed(2)}</div>;
        },
      },
      {
        accessorKey: "stock_qty",
        header: t("products.form.stockQty"),
        cell: ({ row }) => {
          const stock = row.getValue("stock_qty") as number;
          return (
            <Badge
              variant={
                stock > 10
                  ? "default"
                  : stock > 0
                    ? "secondary"
                    : "destructive"
              }
            >
              {stock}
            </Badge>
          );
        },
      },
      {
        accessorKey: "active",
        header: t("common.status"),
        cell: ({ row }) => {
          const isActive = row.getValue("active") as boolean;
          return (
            <Badge variant={isActive ? "default" : "secondary"}>
              {isActive ? t("common.active") : t("common.inactive")}
            </Badge>
          );
        },
      },
    ];
  }, [t]);

  function handleRowClick(product: Product) {
    setSelectedProduct(product);
    setIsProductSheetOpen(true);
  }

  const table = useReactTable({
    data: sortedTableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
    filterFns: {
      multiColumn: multiColumnFilterFn,
    },
  });

  const toggleLineFilter = (id: string, checked: boolean) => {
    setSelectedLineIds((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id),
    );
  };

  const toggleCategoryFilter = (id: string, checked: boolean) => {
    setSelectedCategoryIds((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id),
    );
  };

  const lineFilterLabel =
    selectedLineIds.length === 0
      ? t("products.filters.filterByProductLine")
      : selectedLineIds.length === allLineFilterIds.length
        ? t("products.filters.allProductLines")
        : `${selectedLineIds.length} ${t("orders.export.selected")}`;

  const categoryFilterLabel =
    selectedCategoryIds.length === 0
      ? t("products.filters.filterByCategory")
      : selectedCategoryIds.length === allCategoryFilterIds.length
        ? t("products.filters.allCategories")
        : `${selectedCategoryIds.length} ${t("orders.export.selected")}`;

  const renderGroupedRows = () => {
    const rows = table.getRowModel().rows;
    if (!rows.length) {
      return (
        <TableRow>
          <TableCell
            colSpan={columns.length}
            className="h-24 text-center"
          >
            {t("products.noProductsFound")}
          </TableCell>
        </TableRow>
      );
    }

    let lastLineKey: string | null = null;
    const out: React.ReactNode[] = [];
    const countsByLineKey = rows.reduce<Record<string, number>>((acc, row) => {
      const key = row.original.product_line_id ?? FILTER_NO_PRODUCT_LINE;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    rows.forEach((row: Row<Product>) => {
      const p = row.original;
      const lineKey = p.product_line_id ?? FILTER_NO_PRODUCT_LINE;
      if (lineKey !== lastLineKey) {
        lastLineKey = lineKey;
        const title =
          p.product_line?.name?.trim() ||
          t("products.group.noProductLine");
        const isCollapsed = Boolean(collapsedLineKeys[lineKey]);
        const count = countsByLineKey[lineKey] ?? 0;
        out.push(
          <TableRow
            key={`group-${lineKey}`}
            className="bg-muted/60 hover:bg-muted/60"
          >
            <TableCell
              colSpan={columns.length}
              className="py-2 font-semibold text-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 -ml-2 gap-2"
                  onClick={() => {
                    setCollapsedLineKeys((prev) => ({
                      ...prev,
                      [lineKey]: !prev[lineKey],
                    }));
                  }}
                >
                  <ChevronDownIcon
                    className={cn(
                      "h-4 w-4 transition-transform",
                      isCollapsed && "-rotate-90",
                    )}
                  />
                  <span className="truncate">{title}</span>
                </Button>
                <span className="text-xs font-medium text-muted-foreground tabular-nums">
                  {count}
                </span>
              </div>
            </TableCell>
          </TableRow>,
        );
        if (isCollapsed) {
          return;
        }
      }
      if (collapsedLineKeys[lineKey]) {
        return;
      }
      out.push(
        <TableRow
          key={row.id}
          className="cursor-pointer hover:bg-muted/50"
          onClick={() => handleRowClick(row.original)}
        >
          {row.getVisibleCells().map((cell) => (
            <TableCell key={cell.id}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </TableCell>
          ))}
        </TableRow>,
      );
    });

    return out;
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <AppSidebar />
        <SidebarInset>
          <div className="flex flex-1 flex-col gap-6 p-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold">{t("products.title")}</h1>
                <p className="text-muted-foreground">
                  {t("products.description")}
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
              <h1 className="text-3xl font-bold">{t("products.title")}</h1>
              <p className="text-muted-foreground">
                {t("products.description")}
              </p>
            </div>
            <Button
              onClick={() => {
                setSelectedProduct(null);
                setIsProductSheetOpen(true);
              }}
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              {t("products.create")}
            </Button>
          </div>

          <div className="rounded-md border overflow-hidden flex min-h-0 flex-1 flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 p-4">
              <div className="flex flex-1 flex-wrap items-center gap-2">
                <div className="relative">
                  <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("products.filterByNameOrSku")}
                    value={
                      (table.getColumn("name")?.getFilterValue() as string) ??
                      ""
                    }
                    onChange={(event) =>
                      table.getColumn("name")?.setFilterValue(event.target.value)
                    }
                    className={cn(
                      "peer min-w-60 ps-9",
                      Boolean(table.getColumn("name")?.getFilterValue()) &&
                        "pe-9",
                    )}
                  />
                  {Boolean(table.getColumn("name")?.getFilterValue()) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() =>
                        table.getColumn("name")?.setFilterValue("")
                      }
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-[180px] justify-between"
                    >
                      {lineFilterLabel}
                      <ChevronDownIcon className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[220px]">
                    <DropdownMenuCheckboxItem
                      checked={selectedLineIds.includes(FILTER_NO_PRODUCT_LINE)}
                      onCheckedChange={(checked) =>
                        toggleLineFilter(FILTER_NO_PRODUCT_LINE, !!checked)
                      }
                      onSelect={(e) => e.preventDefault()}
                    >
                      {t("products.filters.noLine")}
                    </DropdownMenuCheckboxItem>
                    {lineOptions.map((line) => (
                      <DropdownMenuCheckboxItem
                        key={line.id}
                        checked={selectedLineIds.includes(line.id)}
                        onCheckedChange={(checked) =>
                          toggleLineFilter(line.id, !!checked)
                        }
                        onSelect={(e) => e.preventDefault()}
                      >
                        {line.name || t("common.unknown")}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-[180px] justify-between"
                    >
                      {categoryFilterLabel}
                      <ChevronDownIcon className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[220px]">
                    <DropdownMenuCheckboxItem
                      checked={selectedCategoryIds.includes(
                        FILTER_NO_PRODUCT_CATEGORY,
                      )}
                      onCheckedChange={(checked) =>
                        toggleCategoryFilter(
                          FILTER_NO_PRODUCT_CATEGORY,
                          !!checked,
                        )
                      }
                      onSelect={(e) => e.preventDefault()}
                    >
                      {t("products.filters.noCategory")}
                    </DropdownMenuCheckboxItem>
                    {categoryOptions.map((cat) => (
                      <DropdownMenuCheckboxItem
                        key={cat.id}
                        checked={selectedCategoryIds.includes(cat.id)}
                        onCheckedChange={(checked) =>
                          toggleCategoryFilter(cat.id, !!checked)
                        }
                        onSelect={(e) => e.preventDefault()}
                      >
                        {cat.name || t("common.unknown")}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="border-t overflow-y-auto flex-1 min-h-0">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        return (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>{renderGroupedRows()}</TableBody>
              </Table>
            </div>
          </div>
        </div>
      </SidebarInset>

      <ProductSheet
        product={selectedProduct}
        isOpen={isProductSheetOpen}
        onClose={() => setIsProductSheetOpen(false)}
        onRefresh={refreshProductData}
      />
    </ProtectedRoute>
  );
}
