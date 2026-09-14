"use client";

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ColumnDef,
  ColumnFiltersState,
  Row,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  FilterFn,
  useReactTable,
} from "@tanstack/react-table";
import {
  SearchIcon,
  XIcon,
  DownloadIcon,
  ChevronDownIcon,
  BanknoteIcon,
  CreditCardIcon,
  FileTextIcon,
  ReceiptIcon,
  Link2Icon,
  Loader2Icon,
  Trash2Icon,
  PlusIcon,
  MinusIcon,
  PackageIcon,
} from "lucide-react";
import {
  RiDeleteBinLine,
  RiEditLine,
  RiCloseLargeLine,
  RiLoader4Line,
  RiAddLine,
  RiPhoneLine,
  RiMailLine,
} from "@remixicon/react";
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  isSameMonth,
} from "date-fns";

import { cn } from "@/lib/utils";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { useCompanyId, useLocationId } from "@/lib/company-util";
import { asLocationClient, offeredServiceIdsForLocation } from "@/lib/location";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { useConnectCharges } from "@/lib/api/billing/use-connect-charges";
import { fetchOrders, type Order } from "@/lib/api/orders/queries";
import {
  buildPayLinkReturnUrls,
  createPaymentCheckout,
  isClientEmailRequiredError,
  readClientEmail,
} from "@/lib/api/pos/mutations/payment-create-checkout";
import { paymentMethodMessageKey } from "@/app/[locale]/pos/components/payment-methods";
import {
  PAGE_FETCH_TIMEOUT_MS,
  startFailClosedLoad,
  withTimeout,
} from "@/lib/async/fail-closed";
import { loadResolvedOrderItems } from "@/lib/api/orders/load-resolved-order-items";
import { orderItemServiceWriteFields } from "@/lib/api/orders/order-item-service-ids";
import type {
  Product as POSProduct,
  Service as POSService,
} from "@/app/[locale]/pos/components/types";

type POSTreatment = POSService & {
  price_options?: POSService["service_variants"];
};

type OrderItemEntry = Order["order_item"][number];

type PendingDeleteTarget =
  | { type: "order" }
  | { type: "payment"; id: string }
  | { type: "item"; id: string };
type OrderPaymentEntry = Order["payment"][number];

// Custom filter function for multi-column searching
const multiColumnFilterFn: FilterFn<Order> = (row, columnId, filterValue) => {
  const order = row.original;
  const orderNumber = order.order_number || order.id.substring(0, 8);
  const clientName = order.appointment?.client
    ? `${order.appointment.client.first_name || ""} ${
        order.appointment.client.last_name || ""
      }`.trim()
    : order.client
      ? `${order.client.first_name || ""} ${order.client.last_name || ""}`.trim()
      : "";
  const searchableContent = `${orderNumber} ${clientName}`.toLowerCase();
  const searchTerm = (filterValue ?? "").toLowerCase();
  return searchableContent.includes(searchTerm);
};

const getOrderDisplayDate = (order: Order): string => {
  return order.date || order.created_at;
};

const formatOrderDate = (order: Order): string => {
  const rawDate = getOrderDisplayDate(order);
  const parsedDate = new Date(rawDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }
  return format(parsedDate, "MMM dd, yyyy");
};

export default function OrdersPage() {
  const t = useTranslations();
  const tAppt = useTranslations("appointments");
  const locale = useLocale();
  const isMobile = useIsMobile();
  const companyId = useCompanyId();
  const locationId = useLocationId();
  const { chargesEnabled } = useConnectCharges(companyId);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [data, setData] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItemEntry[]>([]);
  const [orderPayments, setOrderPayments] = useState<OrderPaymentEntry[]>([]);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [isLoadingOrderItems, setIsLoadingOrderItems] = useState(false);
  const [isLoadingOrderPayments, setIsLoadingOrderPayments] = useState(false);
  const [isSavingOrderPayment, setIsSavingOrderPayment] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState<string>("cash");
  const [newPaymentAmount, setNewPaymentAmount] = useState("");
  const [showAddPaymentForm, setShowAddPaymentForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [adjustingQtyItemId, setAdjustingQtyItemId] = useState<string | null>(
    null,
  );
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [savingPaymentId, setSavingPaymentId] = useState<string | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(
    null,
  );
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [pendingDeleteTarget, setPendingDeleteTarget] =
    useState<PendingDeleteTarget | null>(null);
  const [showAddItemsDialog, setShowAddItemsDialog] = useState(false);
  const [selectedItemCategory, setSelectedItemCategory] = useState<
    "products" | "treatments"
  >("products");
  const [loadingItems, setLoadingItems] = useState(false);
  const [posProducts, setPosProducts] = useState<POSProduct[]>([]);
  const [posTreatments, setPosTreatments] = useState<POSTreatment[]>([]);
  const [selectedTreatmentNav, setSelectedTreatmentNav] = useState<
    string | null
  >(null);
  const [isAddingOrderItem, setIsAddingOrderItem] = useState(false);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);
  const [isSendingPayLink, setIsSendingPayLink] = useState(false);
  const treatmentScrollRefs = useRef<Map<string, HTMLDivElement | null>>(
    new Map(),
  );
  const [isMounted, setIsMounted] = useState(false);
  const isMountedRef = useRef(true);
  const itemPriceInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const itemDiscountInputRefs = useRef<Map<string, HTMLInputElement>>(
    new Map(),
  );
  const newPaymentPersistLockRef = useRef(false);
  const paymentsSectionRef = useRef<HTMLElement | null>(null);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const paymentTypes = ["cash", "card", "invoice", "bank_transfer"] as const;
  const [selectedPaymentTypes, setSelectedPaymentTypes] = useState<string[]>([
    ...paymentTypes,
  ]);

  // Wrapped setters that check mount status before updating
  const safeSetSorting = useCallback(
    (value: SortingState | ((prev: SortingState) => SortingState)) => {
      if (isMountedRef.current) {
        setSorting(
          value as SortingState | ((prev: SortingState) => SortingState),
        );
      }
    },
    [],
  );

  const safeSetColumnFilters = useCallback(
    (
      value:
        | ColumnFiltersState
        | ((prev: ColumnFiltersState) => ColumnFiltersState),
    ) => {
      if (isMountedRef.current) {
        setColumnFilters(
          value as
            | ColumnFiltersState
            | ((prev: ColumnFiltersState) => ColumnFiltersState),
        );
      }
    },
    [],
  );

  const safeSetColumnVisibility = useCallback(
    (value: VisibilityState | ((prev: VisibilityState) => VisibilityState)) => {
      if (isMountedRef.current) {
        setColumnVisibility(
          value as
            | VisibilityState
            | ((prev: VisibilityState) => VisibilityState),
        );
      }
    },
    [],
  );

  const safeSetRowSelection = useCallback(
    (
      value:
        | Record<string, boolean>
        | ((prev: Record<string, boolean>) => Record<string, boolean>),
    ) => {
      if (isMountedRef.current) {
        setRowSelection(
          value as
            | Record<string, boolean>
            | ((prev: Record<string, boolean>) => Record<string, boolean>),
        );
      }
    },
    [],
  );

  // Fetch orders data for the current month
  const loadOrders = useCallback(async (): Promise<Order[]> => {
    if (!companyId) {
      if (isMountedRef.current) {
        setLoading(false);
      }
      return [];
    }

    try {
      if (isMountedRef.current) {
        setLoading(true);
      }
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      const { data: ordersData, error } = await withTimeout(
        fetchOrders(
          companyId,
          format(monthStart, "yyyy-MM-dd"),
          format(monthEnd, "yyyy-MM-dd"),
          locationId,
        ),
        PAGE_FETCH_TIMEOUT_MS,
        "orders",
      );

      if (!isMountedRef.current) {
        return ordersData || [];
      }

      if (error) {
        console.error("Error fetching orders:", error);
        toast.error("Failed to fetch orders");
        return [];
      }

      const monthScopedOrders = (ordersData || []).filter((order) => {
        const parsedDate = new Date(getOrderDisplayDate(order));
        if (Number.isNaN(parsedDate.getTime())) {
          return false;
        }
        return isSameMonth(parsedDate, currentMonth);
      });

      setData(monthScopedOrders);
      return monthScopedOrders;
    } catch (error) {
      if (!isMountedRef.current) {
        return [];
      }
      console.error("Error fetching orders:", error);
      toast.error("Failed to fetch orders");
      return [];
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [companyId, currentMonth, locationId]);

  useEffect(() => {
    isMountedRef.current = true;
    setIsMounted(true);
    const stop = startFailClosedLoad(
      (value) => {
        if (isMountedRef.current) setLoading(value);
      },
      async () => {
        await loadOrders();
      },
      { label: "orders" },
    );

    return () => {
      stop();
      isMountedRef.current = false;
      setIsMounted(false);
    };
  }, [loadOrders]);

  const getTotalPaid = (
    order: Order,
    paymentsOverride?: OrderPaymentEntry[],
  ): number => {
    const payments = paymentsOverride ?? order.payment ?? [];
    return payments.reduce(
      (sum, payment) => sum + (payment.amount_gross || 0),
      0,
    );
  };

  /** PostgREST often returns numeric columns as strings; avoid `sum + string` bugs in totals. */
  const getOrderTotalAmount = (order: Order): number => {
    const v = order.total_amount;
    if (v == null) return 0;
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };

  /** Same coercion helper as totals; tax columns may also come back as strings. */
  const getOrderTaxAmount = (order: Order): number => {
    const v = order.tax_amount;
    if (v == null) return 0;
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };

  const parseMoneyInput = useCallback((value: string): number | null => {
    const normalized = value.trim().replace(",", ".");
    if (!normalized) return null;
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) return null;
    return Math.round(parsed * 100) / 100;
  }, []);

  const resolveItemName = (item: OrderItemEntry): string => {
    return (
      item.product?.name ||
      (item.service?.name && item.service_variant?.name
        ? `${item.service.name} - ${item.service_variant.name}`
        : item.service_variant?.service?.name && item.service_variant?.name
          ? `${item.service_variant.service.name} - ${item.service_variant.name}`
          : item.service?.name || item.service_variant?.name) ||
      t("orders.unknownItem")
    );
  };

  const loadOrderPayments = useCallback(
    async (orderId: string) => {
      setIsLoadingOrderPayments(true);
      try {
        const supabase = createClient();
        const { data: payments, error } = await supabase
          .from("payment")
          .select(
            "id, payment_method, amount_gross, status, paid_at, payment_status, created_at",
          )
          .eq("order_id", orderId)
          .order("created_at", { ascending: false });

        if (error) {
          toast.error(t("orderPanel.errors.loadPaymentsFailed"));
          setOrderPayments([]);
          return [];
        }

        const nextPayments = (payments || []) as OrderPaymentEntry[];
        setOrderPayments(nextPayments);
        return nextPayments;
      } catch (error) {
        console.error("Error loading order payments:", error);
        toast.error(t("orderPanel.errors.loadPaymentsFailed"));
        setOrderPayments([]);
        return [];
      } finally {
        setIsLoadingOrderPayments(false);
      }
    },
    [t],
  );

  const loadOrderItems = useCallback(async (orderId: string) => {
    setIsLoadingOrderItems(true);
    try {
      const lines = await loadResolvedOrderItems(orderId);
      const nextItems = lines.map(
        (row) =>
          ({
            id: row.id,
            product_id: row.product_id,
            service_id: row.service_id,
            service_variant_id: row.service_variant_id,
            quantity: row.quantity,
            unit_price: row.unit_price,
            discount_amount: row.discount_amount,
            vat_rate: row.vat_rate,
            total: row.total,
            appointment_id: row.appointment_id,
            product: row.product ? { name: row.product.name } : null,
            service: row.service,
            service_variant: row.service_variant,
            appointment: null,
          }) satisfies OrderItemEntry,
      );
      setOrderItems(nextItems);
      return nextItems;
    } catch (error) {
      console.error("Error loading order items:", error);
      setOrderItems([]);
      return [];
    } finally {
      setIsLoadingOrderItems(false);
    }
  }, []);

  const reconcileOrderTotals = useCallback(async (orderId: string) => {
    const supabase = createClient();
    const [
      { data: items, error: itemsError },
      { data: payments, error: paymentsError },
    ] = await Promise.all([
      supabase
        .from("order_item")
        .select("quantity, unit_price, discount_amount")
        .eq("order_id", orderId),
      supabase.from("payment").select("amount_gross").eq("order_id", orderId),
    ]);

    if (itemsError) throw itemsError;
    if (paymentsError) throw paymentsError;

    const subtotal = (items || []).reduce(
      (sum, item) => sum + (item.unit_price || 0) * (item.quantity || 1),
      0,
    );
    const discountAmount = (items || []).reduce(
      (sum, item) => sum + (item.discount_amount || 0),
      0,
    );
    const totalAmount = Math.max(subtotal - discountAmount, 0);
    const amountPaid = (payments || []).reduce(
      (sum, payment) => sum + (payment.amount_gross || 0),
      0,
    );
    const paymentStatus =
      amountPaid >= totalAmount && totalAmount > 0
        ? "paid"
        : amountPaid > 0
          ? "partial"
          : "unpaid";

    const { error: updateError } = await supabase
      .from("order")
      .update({
        subtotal,
        discount_amount: discountAmount,
        tax_amount: 0,
        total_amount: totalAmount,
        amount_paid: amountPaid,
        payment_status: paymentStatus,
      })
      .eq("id", orderId);

    if (updateError) throw updateError;

    return { subtotal, discountAmount, totalAmount, amountPaid, paymentStatus };
  }, []);

  const refreshDetailOrder = useCallback(
    async (orderId: string) => {
      const [refreshedOrders, refreshedItems, refreshedPayments] =
        await Promise.all([
          loadOrders(),
          loadOrderItems(orderId),
          loadOrderPayments(orderId),
        ]);

      const refreshedOrder =
        refreshedOrders.find((order) => order.id === orderId) || null;
      if (refreshedOrder) {
        setDetailOrder({
          ...refreshedOrder,
          order_item: refreshedItems,
          payment: refreshedPayments,
        });
      }
    },
    [loadOrderItems, loadOrderPayments, loadOrders],
  );

  const handleSendPayLink = async (order: Order, amountDue: number) => {
    if (!companyId) {
      toast.error(t("pos.connect.chargesNotEnabled"));
      return;
    }
    if (!chargesEnabled) {
      toast.error(t("pos.connect.chargesNotEnabled"));
      return;
    }
    const email = readClientEmail(
      order.client?.email,
      order.appointment?.client?.email,
    );
    if (!email) {
      toast.error(t("pos.payLink.emailRequired"));
      return;
    }
    if (amountDue <= 0.005) {
      return;
    }

    setIsSendingPayLink(true);
    try {
      const urls = buildPayLinkReturnUrls(window.location.origin, locale);
      const checkout = await createPaymentCheckout({
        company_id: companyId,
        order_id: order.id,
        success_url: urls.success_url,
        cancel_url: urls.cancel_url,
        amount: Math.round(amountDue * 100) / 100,
        client_email: email,
        ...(locationId ? { location_id: locationId } : {}),
      });
      if (isClientEmailRequiredError(checkout)) {
        toast.error(t("pos.payLink.emailRequired"));
        return;
      }
      if (!checkout.success) {
        toast.error(
          checkout.message || checkout.error || t("pos.payLink.failed"),
        );
        return;
      }
      toast.success(
        t("pos.payLink.sent", { email: checkout.data?.email || email }),
      );
      await refreshDetailOrder(order.id);
    } catch (error) {
      console.error("Error sending pay link:", error);
      toast.error(t("pos.payLink.failed"));
    } finally {
      setIsSendingPayLink(false);
    }
  };

  const resetPaymentForm = () => {
    setNewPaymentMethod("cash");
    setNewPaymentAmount("");
    setShowAddPaymentForm(false);
  };

  const resetItemForm = () => {};

  // Get client name
  const getClientName = (order: Order): string => {
    if (order.appointment?.client) {
      const client = order.appointment.client;
      return (
        `${client.first_name || ""} ${client.last_name || ""}`.trim() ||
        t("common.notAvailable")
      );
    }
    if (order.client) {
      return (
        `${order.client.first_name || ""} ${
          order.client.last_name || ""
        }`.trim() || t("common.notAvailable")
      );
    }
    return t("common.notAvailable");
  };

  const getPaymentMethodIcon = (method: string): ReactNode => {
    switch (method) {
      case "cash":
        return <BanknoteIcon className="h-4 w-4" />;
      case "card":
        return <CreditCardIcon className="h-4 w-4" />;
      case "pay_link":
        return <Link2Icon className="h-4 w-4" />;
      case "invoice":
        return <FileTextIcon className="h-4 w-4" />;
      case "bank_transfer":
        return <ReceiptIcon className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getPaymentMethodLabel = (method: string): string => {
    return t(`pos.paymentMethods.${paymentMethodMessageKey(method)}`);
  };

  // Get payment methods
  const getPaymentMethods = (order: Order): ReactNode => {
    const methods =
      order.payment
        ?.map((p) => p.payment_method)
        .filter((m): m is string => !!m) || [];
    if (methods.length === 0) return <span>{t("common.notAvailable")}</span>;

    const uniqueMethods = [...new Set(methods)];
    return (
      <div className="flex items-center gap-2">
        {uniqueMethods.map((method) => (
          <Tooltip key={method}>
            <TooltipTrigger asChild>
              <span
                className="inline-flex h-6 w-6 items-center justify-center rounded-md border bg-muted/40 text-muted-foreground"
                aria-label={method}
              >
                {getPaymentMethodIcon(method)}
              </span>
            </TooltipTrigger>
            <TooltipContent>{getPaymentMethodLabel(method)}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    );
  };

  // Get payment status badge
  const getPaymentStatusBadge = (order: Order) => {
    const totalPaid = getTotalPaid(order);
    const status = order.payment_status || "unpaid";

    if (status === "paid") {
      return (
        <Badge className="bg-green-500">{t("orders.statusLabels.paid")}</Badge>
      );
    } else if (totalPaid > 0) {
      return (
        <Badge className="bg-yellow-500">
          {t("orders.statusLabels.partial")}
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive">{t("orders.statusLabels.unpaid")}</Badge>
      );
    }
  };

  const createColumns = (): ColumnDef<Order>[] => [
    {
      id: "select",
      header: ({ table }) => {
        const rows = table.getRowModel().rows;
        const selectedInView = rows.filter((row) => row.getIsSelected());
        const allSelected =
          rows.length > 0 && selectedInView.length === rows.length;
        const someSelected =
          selectedInView.length > 0 && selectedInView.length < rows.length;
        return (
          <Checkbox
            checked={allSelected || (someSelected && "indeterminate")}
            onCheckedChange={(value) => {
              const checked = Boolean(value);
              const nextRows = table.getRowModel().rows;
              safeSetRowSelection((prev) => {
                const next = { ...prev };
                for (const row of nextRows) {
                  if (checked) {
                    next[row.id] = true;
                  } else {
                    delete next[row.id];
                  }
                }
                return next;
              });
            }}
            aria-label={t("orders.export.selectAll")}
          />
        );
      },
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={t("orders.export.selected")}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 44,
      minSize: 44,
      maxSize: 44,
    },
    {
      id: "date",
      header: t("orders.date"),
      cell: ({ row }) => {
        return (
          <div className="font-medium">{formatOrderDate(row.original)}</div>
        );
      },
      sortingFn: (rowA, rowB) => {
        const a = new Date(getOrderDisplayDate(rowA.original)).getTime();
        const b = new Date(getOrderDisplayDate(rowB.original)).getTime();
        if (Number.isNaN(a) && Number.isNaN(b)) return 0;
        if (Number.isNaN(a)) return -1;
        if (Number.isNaN(b)) return 1;
        return a - b;
      },
    },
    {
      id: "client",
      header: t("orders.client"),
      filterFn: multiColumnFilterFn,
      cell: ({ row }) => {
        const order = row.original;
        return <div>{getClientName(order)}</div>;
      },
    },
    {
      id: "payment_status",
      header: t("orders.status"),
      cell: ({ row }) => {
        const order = row.original;
        return getPaymentStatusBadge(order);
      },
    },
    {
      accessorKey: "total_amount",
      header: t("orders.price"),
      cell: ({ row }) => {
        const amount = getOrderTotalAmount(row.original);
        return <div className="font-medium">€{amount.toFixed(2)}</div>;
      },
    },
    {
      id: "amount_paid",
      header: t("orders.amountPaid"),
      cell: ({ row }) => {
        const order = row.original;
        const totalPaid = getTotalPaid(order);
        return <div className="font-medium">€{totalPaid.toFixed(2)}</div>;
      },
    },
    {
      id: "payment_method",
      header: t("orders.paymentType"),
      cell: ({ row }) => {
        const order = row.original;
        return <div>{getPaymentMethods(order)}</div>;
      },
    },
    {
      id: "items",
      header: t("orders.items"),
      cell: ({ row }) => {
        const order = row.original;
        const items = order.order_item || [];
        if (items.length === 0) {
          return (
            <div className="text-sm text-muted-foreground">
              {t("orders.noItems")}
            </div>
          );
        }

        return (
          <div className="space-y-1 text-sm text-muted-foreground whitespace-normal break-words">
            {items.map((item) => {
              return <div key={item.id}>{resolveItemName(item)}</div>;
            })}
          </div>
        );
      },
    },
  ];

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const columns = useMemo(() => createColumns(), [t]);

  // Filter data by payment type
  const filteredData = useMemo(() => {
    if (selectedPaymentTypes.length === 0) return [];
    if (selectedPaymentTypes.length === paymentTypes.length) return data;
    return data.filter((order) => {
      const methods =
        order.payment
          ?.map((p) => p.payment_method)
          .filter((m): m is string => !!m) || [];
      return methods.some((method) => selectedPaymentTypes.includes(method));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, selectedPaymentTypes]);

  // Only initialize table after mount to prevent state updates during render
  const table = useReactTable({
    data: isMounted ? filteredData : [],
    columns,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: safeSetSorting,
    onColumnFiltersChange: safeSetColumnFilters,
    onColumnVisibilityChange: safeSetColumnVisibility,
    onRowSelectionChange: safeSetRowSelection,
    enableRowSelection: true,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    filterFns: {
      multiColumn: multiColumnFilterFn,
    },
  });

  // Totaal: sum rowSelection ∩ current row model (same source as checkboxes). Coerce amounts (API may send strings).
  let selectedRows: Row<Order>[] = [];
  let totalAmount = 0;
  let totalTaxAmount = 0;
  if (isMounted && isMountedRef.current) {
    try {
      const rowModel = table.getRowModel();
      const displayed = rowModel.rows;
      const rowsById = rowModel.rowsById;
      const selection = table.getState().rowSelection ?? {};
      const selectedIds = Object.keys(selection).filter((id) => selection[id]);
      const resolvedSelected: Row<Order>[] =
        selectedIds.length > 0
          ? selectedIds.map((id) => rowsById[id]).filter(Boolean)
          : [];

      if (resolvedSelected.length > 0) {
        selectedRows = resolvedSelected;
        totalAmount = resolvedSelected.reduce(
          (sum, row) => sum + getOrderTotalAmount(row.original),
          0,
        );
        totalTaxAmount = resolvedSelected.reduce(
          (sum, row) => sum + getOrderTaxAmount(row.original),
          0,
        );
      } else {
        selectedRows = [];
        totalAmount = displayed.reduce(
          (sum, row) => sum + getOrderTotalAmount(row.original),
          0,
        );
        totalTaxAmount = displayed.reduce(
          (sum, row) => sum + getOrderTaxAmount(row.original),
          0,
        );
      }
    } catch {
      selectedRows = [];
      totalAmount = 0;
      totalTaxAmount = 0;
    }
  }

  // Export handlers (not implemented yet)
  const handleExportToExcel = () => {
    const rowsToExport =
      selectedRows.length > 0 ? selectedRows : table.getFilteredRowModel().rows;
    // TODO: Implement Excel export
    toast.info(`Exporting ${rowsToExport.length} orders to Excel...`);
  };

  const handleExportToDagontvangsten = async () => {
    const rowsToExport =
      selectedRows.length > 0 ? selectedRows : table.getFilteredRowModel().rows;
    const currentMonthLabel = format(currentMonth, "MMMM yyyy");

    if (!companyId) {
      toast.error(t("orderPanel.errors.missingOrderOrCompany"));
      return;
    }

    const paymentIds = rowsToExport
      .flatMap((row) => row.original.payment || [])
      .filter((payment) => {
        return payment.payment_status === "paid";
      })
      .map((payment) => payment.id);

    if (paymentIds.length === 0) {
      toast.info(
        `${t("orders.export.noEligibleCashPayments")} (${currentMonthLabel})`,
      );
      return;
    }

    try {
      const supabase = createClient();
      const { data: result, error } = await supabase.functions.invoke(
        "scrada-sync-dagontvangsten",
        {
          body: {
            company_id: companyId,
            payment_ids: paymentIds,
          },
        },
      );

      if (error) {
        toast.error(error.message || t("orders.export.scradaSyncFailed"));
        return;
      }

      const response = result as {
        success?: boolean;
        error?: string;
        message?: string;
        data?: { synced?: number };
      } | null;

      if (!response?.success) {
        toast.error(
          response?.message ||
            response?.error ||
            t("orders.export.scradaSyncFailed"),
        );
        return;
      }

      toast.success(
        `${t("orders.export.scradaSyncSuccess", {
          count: response.data?.synced || paymentIds.length,
        })} (${currentMonthLabel})`,
      );
      await loadOrders();
    } catch (error) {
      console.error("Error syncing Scrada cashbook lines:", error);
      toast.error(t("orders.export.scradaSyncFailed"));
    }
  };

  const openOrderDetail = useCallback(
    async (order: Order) => {
      setDetailOrder(order);
      setOrderItems(order.order_item || []);
      setOrderPayments(order.payment || []);
      resetPaymentForm();
      resetItemForm();
      setShowAddPaymentForm(false);
      setIsDetailSheetOpen(true);
      await Promise.all([
        loadOrderItems(order.id),
        loadOrderPayments(order.id),
      ]);
    },
    [loadOrderItems, loadOrderPayments],
  );

  const persistExistingPaymentAmount = useCallback(
    async (payment: OrderPaymentEntry, amountRaw: string) => {
      if (!detailOrder || !companyId) {
        toast.error(t("orderPanel.errors.missingOrderOrCompany"));
        return;
      }

      if (!amountRaw.trim()) {
        toast.error(t("orders.error.invalidAmount"));
        return;
      }

      const amount = parseMoneyInput(amountRaw);
      if (amount === null || amount <= 0) {
        toast.error(t("orders.error.invalidAmount"));
        return;
      }

      if (Math.abs((payment.amount_gross || 0) - amount) < 0.0001) return;

      setSavingPaymentId(payment.id);
      try {
        const supabase = createClient();
        const { data: updatedPayment, error } = await supabase
          .from("payment")
          .update({ amount_gross: amount })
          .eq("id", payment.id)
          .eq("order_id", detailOrder.id)
          .eq("company_id", companyId)
          .select("id, amount_gross")
          .single();

        if (error) {
          toast.error(`${t("orders.error.paymentFailed")}: ${error.message}`);
          return;
        }

        if (!updatedPayment) {
          toast.error(t("orderPanel.errors.updateNotApplied"));
          return;
        }

        await reconcileOrderTotals(detailOrder.id);
        await refreshDetailOrder(detailOrder.id);
      } catch (error) {
        console.error("Error updating payment:", error);
        toast.error(t("orders.error.paymentFailed"));
      } finally {
        setSavingPaymentId(null);
      }
    },
    [
      companyId,
      detailOrder,
      parseMoneyInput,
      reconcileOrderTotals,
      refreshDetailOrder,
      t,
    ],
  );

  const persistNewPayment = useCallback(async () => {
    if (!detailOrder || !companyId) {
      toast.error(t("orderPanel.errors.missingOrderOrCompany"));
      return;
    }

    if (!newPaymentAmount.trim()) return;

    const amount = parseMoneyInput(newPaymentAmount);
    if (amount === null || amount <= 0) {
      toast.error(t("orders.error.invalidAmount"));
      return;
    }

    if (newPaymentPersistLockRef.current) return;
    newPaymentPersistLockRef.current = true;

    setIsSavingOrderPayment(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("payment").insert({
        order_id: detailOrder.id,
        company_id: companyId,
        payment_method: newPaymentMethod,
        amount_gross: amount,
        status: "completed",
        payment_status: "completed",
        created_at: new Date().toISOString(),
      });

      if (error) {
        toast.error(`${t("orders.error.paymentFailed")}: ${error.message}`);
        return;
      }

      await reconcileOrderTotals(detailOrder.id);
      await refreshDetailOrder(detailOrder.id);
      resetPaymentForm();
    } catch (error) {
      console.error("Error adding payment:", error);
      toast.error(t("orders.error.paymentFailed"));
    } finally {
      newPaymentPersistLockRef.current = false;
      setIsSavingOrderPayment(false);
    }
  }, [
    companyId,
    detailOrder,
    newPaymentAmount,
    newPaymentMethod,
    parseMoneyInput,
    reconcileOrderTotals,
    refreshDetailOrder,
    t,
  ]);

  const handleDeletePayment = useCallback(
    async (paymentId: string) => {
      if (!detailOrder || !companyId) {
        toast.error(t("orderPanel.errors.missingOrderOrCompany"));
        return;
      }

      setDeletingPaymentId(paymentId);
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from("payment")
          .delete()
          .eq("id", paymentId)
          .eq("order_id", detailOrder.id)
          .eq("company_id", companyId);

        if (error) {
          toast.error(
            `${t("orderPanel.errors.deletePaymentFailed")}: ${error.message}`,
          );
          return;
        }

        await reconcileOrderTotals(detailOrder.id);
        await refreshDetailOrder(detailOrder.id);
      } catch (error) {
        console.error("Error deleting payment:", error);
        toast.error(t("orderPanel.errors.deletePaymentFailed"));
      } finally {
        setDeletingPaymentId(null);
      }
    },
    [companyId, detailOrder, reconcileOrderTotals, refreshDetailOrder, t],
  );

  const persistOrderItemLine = useCallback(
    async (itemId: string) => {
      if (!detailOrder || !companyId) {
        toast.error(t("orderPanel.errors.missingOrderOrCompany"));
        return;
      }

      const item = orderItems.find((entry) => entry.id === itemId);
      if (!item) return;

      const priceEl = itemPriceInputRefs.current.get(itemId);
      const discEl = itemDiscountInputRefs.current.get(itemId);
      const priceRaw =
        priceEl?.value?.trim() ?? (item.unit_price || 0).toFixed(2);
      const discountRaw =
        discEl?.value?.trim() ?? (item.discount_amount || 0).toFixed(2);

      const price = parseMoneyInput(priceRaw);
      const discount = parseMoneyInput(discountRaw);

      if (price === null || price < 0 || discount === null || discount < 0) {
        toast.error(t("orders.error.invalidAmount"));
        if (priceEl) priceEl.value = (item.unit_price || 0).toFixed(2);
        if (discEl) discEl.value = (item.discount_amount || 0).toFixed(2);
        return;
      }

      const quantity = item.quantity || 1;
      const lineSubtotal = price * quantity;
      const safeDiscount = Math.min(discount, lineSubtotal);
      const total = Math.max(lineSubtotal - safeDiscount, 0);

      if (
        Math.abs((item.unit_price || 0) - price) < 0.0001 &&
        Math.abs((item.discount_amount || 0) - safeDiscount) < 0.0001
      ) {
        return;
      }

      setSavingItemId(itemId);
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from("order_item")
          .update({
            unit_price: price,
            discount_amount: safeDiscount,
            total,
          })
          .eq("id", itemId)
          .eq("order_id", detailOrder.id)
          .eq("company_id", companyId);

        if (error) {
          toast.error(
            `${t("orderPanel.errors.updateItemFailed")}: ${error.message}`,
          );
          if (priceEl) priceEl.value = (item.unit_price || 0).toFixed(2);
          if (discEl) discEl.value = (item.discount_amount || 0).toFixed(2);
          return;
        }

        await reconcileOrderTotals(detailOrder.id);
        await refreshDetailOrder(detailOrder.id);
      } catch (error) {
        console.error("Error saving order item:", error);
        toast.error(t("orderPanel.errors.updateItemFailed"));
        if (priceEl) priceEl.value = (item.unit_price || 0).toFixed(2);
        if (discEl) discEl.value = (item.discount_amount || 0).toFixed(2);
      } finally {
        setSavingItemId(null);
      }
    },
    [
      companyId,
      detailOrder,
      orderItems,
      parseMoneyInput,
      reconcileOrderTotals,
      refreshDetailOrder,
      t,
    ],
  );

  const handleAdjustItemQuantity = useCallback(
    async (item: OrderItemEntry, delta: number) => {
      if (!detailOrder || !companyId) {
        toast.error(t("orderPanel.errors.missingOrderOrCompany"));
        return;
      }

      const currentQty = item.quantity || 1;
      const newQty = currentQty + delta;
      if (newQty < 1) return;

      const unitPrice = item.unit_price || 0;
      const prevDiscount = item.discount_amount || 0;
      const lineSubtotal = unitPrice * newQty;
      const safeDiscount = Math.min(prevDiscount, lineSubtotal);
      const total = Math.max(lineSubtotal - safeDiscount, 0);

      if (newQty === currentQty) return;

      setAdjustingQtyItemId(item.id);
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from("order_item")
          .update({
            quantity: newQty,
            discount_amount: safeDiscount,
            total,
          })
          .eq("id", item.id)
          .eq("order_id", detailOrder.id)
          .eq("company_id", companyId);

        if (error) {
          toast.error(
            `${t("orderPanel.errors.updateItemFailed")}: ${error.message}`,
          );
          return;
        }

        await reconcileOrderTotals(detailOrder.id);
        await refreshDetailOrder(detailOrder.id);
      } catch (error) {
        console.error("Error updating quantity:", error);
        toast.error(t("orderPanel.errors.updateItemFailed"));
      } finally {
        setAdjustingQtyItemId(null);
      }
    },
    [
      companyId,
      detailOrder,
      reconcileOrderTotals,
      refreshDetailOrder,
      t,
    ],
  );

  const handleDeleteItem = useCallback(
    async (itemId: string) => {
      if (!detailOrder || !companyId) {
        toast.error(t("orderPanel.errors.missingOrderOrCompany"));
        return;
      }

      setDeletingItemId(itemId);
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from("order_item")
          .delete()
          .eq("id", itemId)
          .eq("order_id", detailOrder.id)
          .eq("company_id", companyId);

        if (error) {
          toast.error(
            `${t("orderPanel.errors.deleteItemFailed")}: ${error.message}`,
          );
          return;
        }

        await reconcileOrderTotals(detailOrder.id);
        await refreshDetailOrder(detailOrder.id);
      } catch (error) {
        console.error("Error deleting order item:", error);
        toast.error(t("orderPanel.errors.deleteItemFailed"));
      } finally {
        setDeletingItemId(null);
      }
    },
    [companyId, detailOrder, reconcileOrderTotals, refreshDetailOrder, t],
  );

  const closeDetailSheet = useCallback(() => {
    setIsDetailSheetOpen(false);
    setIsEditMode(false);
    resetPaymentForm();
    resetItemForm();
    setShowAddPaymentForm(false);
    setShowAddItemsDialog(false);
  }, []);

  const copyContactToClipboard = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast.success(t("common.copied"), { duration: 1200 });
      } catch {
        toast.error(t("common.errorOccurred"));
      }
    },
    [t],
  );

  const fetchItemsForAddDialog = useCallback(async () => {
    if (!companyId) return;
    setLoadingItems(true);
    try {
      const supabase = createClient();
      const offeredIds = await offeredServiceIdsForLocation(
        asLocationClient(supabase),
        locationId,
      );
      const { data: productsData } = await supabase
        .from("product")
        .select("id, name, price_gross, stock_qty, sku, vat_rate")
        .eq("active", true)
        .eq("company_id", companyId);

      const servicesQuery = supabase
        .from("service")
        .select(
          `
          id,
          name,
          price_options:service_variant(id, name, price, client_duration_minutes, vat_rate)
        `,
        )
        .eq("is_active", true)
        .eq("is_deleted", false)
        .eq("company_id", companyId);
      const { data: treatmentsData } =
        offeredIds && offeredIds.length === 0
          ? { data: [] }
          : await (offeredIds
              ? servicesQuery.in("id", offeredIds)
              : servicesQuery);

      setPosProducts((productsData || []) as POSProduct[]);
      const transformed: POSTreatment[] = (treatmentsData || []).map(
        (row: {
          id: string;
          name: string;
          price_options?: Array<{
            id: string;
            name: string;
            price: number;
            client_duration_minutes?: number;
            duration_in_minutes?: number;
            vat_rate: number | null;
          }>;
        }) => ({
          id: row.id,
          name: row.name,
          service_variants: (row.price_options || []).map((option) => ({
            id: option.id,
            name: option.name,
            price: option.price,
            duration_in_minutes:
              option.client_duration_minutes ?? option.duration_in_minutes ?? 0,
            vat_rate: option.vat_rate,
          })),
          price_options: (row.price_options || []).map((option) => ({
            id: option.id,
            name: option.name,
            price: option.price,
            duration_in_minutes:
              option.client_duration_minutes ?? option.duration_in_minutes ?? 0,
            vat_rate: option.vat_rate,
          })),
        }),
      );
      setPosTreatments(transformed);
      if (transformed.length > 0) {
        setSelectedTreatmentNav(transformed[0]!.id);
      }
    } catch (error) {
      console.error("Error loading POS items:", error);
      toast.error(t("common.errorOccurred"));
    } finally {
      setLoadingItems(false);
    }
  }, [companyId, locationId, t]);

  const handleAddProductLine = useCallback(
    async (product: POSProduct) => {
      if (!detailOrder || !companyId) {
        toast.error(t("orderPanel.errors.missingOrderOrCompany"));
        return;
      }
      const unitPrice = Math.round((product.price_gross || 0) * 100) / 100;
      const quantity = 1;
      const total = unitPrice * quantity;
      setIsAddingOrderItem(true);
      try {
        const supabase = createClient();
        const { error } = await supabase.from("order_item").insert({
          order_id: detailOrder.id,
          company_id: companyId,
          product_id: product.id,
          quantity,
          unit_price: unitPrice,
          discount_amount: 0,
          total,
          vat_rate: product.vat_rate ?? 21,
          appointment_id: detailOrder.appointment?.id ?? null,
        });

        if (error) {
          toast.error(
            `${t("orders.error.addItemFailed")}: ${error.message}`,
          );
          return;
        }

        await reconcileOrderTotals(detailOrder.id);
        await refreshDetailOrder(detailOrder.id);
        toast.success(t("orders.success.itemAdded"), { duration: 1200 });
        setShowAddItemsDialog(false);
      } catch (error) {
        console.error("Error adding product line:", error);
        toast.error(t("orders.error.addItemFailed"));
      } finally {
        setIsAddingOrderItem(false);
      }
    },
    [
      companyId,
      detailOrder,
      reconcileOrderTotals,
      refreshDetailOrder,
      t,
    ],
  );

  const handleAddTreatmentLine = useCallback(
    async (
      treatment: POSTreatment,
      priceOption: {
        id: string;
        name: string;
        price: number;
        duration_in_minutes: number;
        vat_rate?: number | null;
      },
    ) => {
      if (!detailOrder || !companyId) {
        toast.error(t("orderPanel.errors.missingOrderOrCompany"));
        return;
      }
      const unitPrice = Math.round((priceOption.price || 0) * 100) / 100;
      const quantity = 1;
      const total = unitPrice * quantity;
      setIsAddingOrderItem(true);
      try {
        const supabase = createClient();
        const { error } = await supabase.from("order_item").insert({
          order_id: detailOrder.id,
          company_id: companyId,
          product_id: null,
          quantity,
          unit_price: unitPrice,
          discount_amount: 0,
          total,
          vat_rate: priceOption.vat_rate ?? 21,
          appointment_id: detailOrder.appointment?.id ?? null,
          ...orderItemServiceWriteFields(treatment.id, priceOption.id),
        });

        if (error) {
          toast.error(
            `${t("orders.error.addItemFailed")}: ${error.message}`,
          );
          return;
        }

        await reconcileOrderTotals(detailOrder.id);
        await refreshDetailOrder(detailOrder.id);
        toast.success(t("orders.success.itemAdded"), { duration: 1200 });
        setShowAddItemsDialog(false);
      } catch (error) {
        console.error("Error adding treatment line:", error);
        toast.error(t("orders.error.addItemFailed"));
      } finally {
        setIsAddingOrderItem(false);
      }
    },
    [
      companyId,
      detailOrder,
      reconcileOrderTotals,
      refreshDetailOrder,
      t,
    ],
  );

  const handleDeleteOrder = useCallback(async () => {
    if (!detailOrder || !companyId) {
      toast.error(t("orderPanel.errors.missingOrderOrCompany"));
      return;
    }

    setIsDeletingOrder(true);
    try {
      const supabase = createClient();

      const { error: paymentsDeleteError } = await supabase
        .from("payment")
        .delete()
        .eq("order_id", detailOrder.id)
        .eq("company_id", companyId);

      if (paymentsDeleteError) {
        toast.error(
          `${t("orderPanel.errors.deleteOrderFailed")}: ${paymentsDeleteError.message}`,
        );
        return;
      }

      const { error: orderItemsDeleteError } = await supabase
        .from("order_item")
        .delete()
        .eq("order_id", detailOrder.id);

      if (orderItemsDeleteError) {
        toast.error(
          `${t("orderPanel.errors.deleteOrderFailed")}: ${orderItemsDeleteError.message}`,
        );
        return;
      }

      const { error: orderDeleteError } = await supabase
        .from("order")
        .delete()
        .eq("id", detailOrder.id)
        .eq("company_id", companyId);

      if (orderDeleteError) {
        toast.error(
          `${t("orderPanel.errors.deleteOrderFailed")}: ${orderDeleteError.message}`,
        );
        return;
      }

      toast.success(t("orderPanel.success.orderDeleted"));
      closeDetailSheet();
      setDetailOrder(null);
      await loadOrders();
    } catch (error) {
      console.error("Error deleting order:", error);
      toast.error(t("orderPanel.errors.deleteOrderFailed"));
    } finally {
      setIsDeletingOrder(false);
    }
  }, [closeDetailSheet, companyId, detailOrder, loadOrders, t]);

  return (
    <ProtectedRoute>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-1 flex-col gap-6 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">{t("orders.title")}</h1>
              <p className="text-muted-foreground">
                {format(currentMonth, "MMMM yyyy")}
              </p>
            </div>
          </div>

          <div className="rounded-md border">
            <div className="flex items-center justify-between p-4">
              <div className="flex flex-1 items-center space-x-2 gap-2">
                <div className="relative">
                  <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("orders.filterByOrderOrClient")}
                    value={
                      (table.getColumn("client")?.getFilterValue() as string) ??
                      ""
                    }
                    onChange={(event) =>
                      table
                        .getColumn("client")
                        ?.setFilterValue(event.target.value)
                    }
                    className={cn(
                      "peer min-w-60 ps-9",
                      Boolean(table.getColumn("client")?.getFilterValue()) &&
                        "pe-9",
                    )}
                  />
                  {Boolean(table.getColumn("client")?.getFilterValue()) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() =>
                        table.getColumn("client")?.setFilterValue("")
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
                      {selectedPaymentTypes.length === paymentTypes.length
                        ? t("orders.export.allPaymentTypes")
                        : selectedPaymentTypes.length === 0
                          ? t("orders.export.filterByPaymentType")
                          : `${selectedPaymentTypes.length} ${t(
                              "orders.export.selected",
                            )}`}
                      <ChevronDownIcon className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[180px]">
                    <DropdownMenuCheckboxItem
                      checked={selectedPaymentTypes.includes("cash")}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedPaymentTypes([
                            ...selectedPaymentTypes,
                            "cash",
                          ]);
                        } else {
                          setSelectedPaymentTypes(
                            selectedPaymentTypes.filter((t) => t !== "cash"),
                          );
                        }
                      }}
                      onSelect={(e) => e.preventDefault()}
                    >
                      {t("pos.paymentMethods.cash")}
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={selectedPaymentTypes.includes("card")}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedPaymentTypes([
                            ...selectedPaymentTypes,
                            "card",
                          ]);
                        } else {
                          setSelectedPaymentTypes(
                            selectedPaymentTypes.filter((t) => t !== "card"),
                          );
                        }
                      }}
                      onSelect={(e) => e.preventDefault()}
                    >
                      {t("pos.paymentMethods.card")}
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={selectedPaymentTypes.includes("invoice")}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedPaymentTypes([
                            ...selectedPaymentTypes,
                            "invoice",
                          ]);
                        } else {
                          setSelectedPaymentTypes(
                            selectedPaymentTypes.filter((t) => t !== "invoice"),
                          );
                        }
                      }}
                      onSelect={(e) => e.preventDefault()}
                    >
                      {t("pos.paymentMethods.invoice")}
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={selectedPaymentTypes.includes("bank_transfer")}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedPaymentTypes([
                            ...selectedPaymentTypes,
                            "bank_transfer",
                          ]);
                        } else {
                          setSelectedPaymentTypes(
                            selectedPaymentTypes.filter(
                              (t) => t !== "bank_transfer",
                            ),
                          );
                        }
                      }}
                      onSelect={(e) => e.preventDefault()}
                    >
                      {t("pos.paymentMethods.bankTransfer")}
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0">
                  <Button
                    variant="default"
                    onClick={() => void handleExportToDagontvangsten()}
                    className="rounded-r-none"
                  >
                    <DownloadIcon className="h-4 w-4 mr-2" />
                    {t("orders.export.exportToDagontvangsten")}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="default"
                        size="icon"
                        className="rounded-l-none border-l border-l-primary-foreground/20"
                      >
                        <ChevronDownIcon className="h-4 w-4" />
                        <span className="sr-only">
                          {t("orders.export.moreExportOptions")}
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleExportToExcel}>
                        {t("orders.export.exportToExcel")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
            <div
              className="border-t overflow-hidden flex flex-col"
              style={{ height: "calc(100vh - 300px)", minHeight: "400px" }}
            >
              <div className="overflow-y-auto overflow-x-hidden flex-1">
                {isMobile ? (
                  <div className="p-3 space-y-3">
                    {loading ? (
                      Array.from({ length: 5 }).map((_, index) => (
                        <div
                          key={`mobile-skeleton-${index}`}
                          className="rounded-md border p-3 space-y-2"
                        >
                          <Skeleton className="h-4 w-2/3" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-1/2" />
                        </div>
                      ))
                    ) : table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => {
                        const order = row.original;
                        return (
                          <div
                            key={row.id}
                            className="rounded-md border p-3 space-y-2 cursor-pointer"
                            onClick={() => {
                              void openOrderDetail(order);
                            }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="text-sm font-medium">
                                {getClientName(order)}
                              </div>
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                              >
                                <Checkbox
                                  checked={row.getIsSelected()}
                                  onCheckedChange={(value) =>
                                    row.toggleSelected(!!value)
                                  }
                                  aria-label={t("orders.export.selected")}
                                />
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatOrderDate(order)}
                            </div>
                            <div className="flex items-center justify-between">
                              {getPaymentStatusBadge(order)}
                              <div className="text-sm font-medium">
                                €{(order.total_amount || 0).toFixed(2)}
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {t("orders.amountPaid")}: €
                              {getTotalPaid(order).toFixed(2)}
                            </div>
                            <div>{getPaymentMethods(order)}</div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="h-24 flex items-center justify-center text-sm">
                        {t("orders.noOrdersFound")}
                      </div>
                    )}
                  </div>
                ) : (
                  <Table className="table-fixed">
                    <TableHeader className="sticky top-0 bg-background z-10">
                      {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                          {headerGroup.headers.map((header) => {
                            return (
                              <TableHead
                                key={header.id}
                                className={cn(
                                  header.id === "select" &&
                                    "w-11 px-2 text-center",
                                )}
                              >
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
                    <TableBody>
                      {loading ? (
                        // Show skeleton loaders while loading
                        Array.from({ length: 5 }).map((_, index) => (
                          <TableRow key={`skeleton-${index}`}>
                            {columns.map((_, colIndex) => (
                              <TableCell
                                key={`skeleton-${index}-${colIndex}`}
                                className={cn(colIndex === 0 && "w-11 px-2")}
                              >
                                <Skeleton className="h-4 w-full" />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                          <TableRow
                            key={row.id}
                            data-state={row.getIsSelected() && "selected"}
                            onClick={(e) => {
                              // Keep checkbox selection separate from row click.
                              const target = e.target as HTMLElement;
                              if (
                                target.closest('input[type="checkbox"]') ||
                                target.closest('[role="checkbox"]') ||
                                target.closest("button") ||
                                target.closest('[role="menuitem"]')
                              ) {
                                return;
                              }
                              void openOrderDetail(row.original);
                            }}
                            className="cursor-pointer"
                          >
                            {row.getVisibleCells().map((cell) => (
                              <TableCell
                                key={cell.id}
                                className={cn(
                                  cell.column.id === "select" &&
                                    "w-11 px-2 text-center",
                                )}
                              >
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext(),
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
                            {t("orders.noOrdersFound")}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between border-t p-4">
              <div className="flex items-center gap-4">
                <div className="text-sm font-medium">
                  {t("orders.export.total")}:{" "}
                  <span className="font-bold">€{totalAmount.toFixed(2)}</span>
                  <span className="mx-2 text-muted-foreground">|</span>
                  <span className="text-xs text-muted-foreground">
                    {t("orders.export.totalExclVat")}:{" "}
                    <span className="font-medium tabular-nums">
                      €{Math.max(totalAmount - totalTaxAmount, 0).toFixed(2)}
                    </span>
                  </span>
                </div>
                {selectedRows.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    {selectedRows.length} {t("orders.export.selected")}
                  </div>
                )}
              </div>
              <div className="space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                  {t("common.previous")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                  {t("common.next")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>

      <Sheet
        open={isDetailSheetOpen}
        onOpenChange={(open) => {
          setIsDetailSheetOpen(open);
          if (!open) {
            setIsEditMode(false);
            resetPaymentForm();
            resetItemForm();
            setShowAddPaymentForm(false);
            setShowAddItemsDialog(false);
          }
        }}
      >
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={cn(
            "[&>button:first-of-type]:hidden",
            isMobile
              ? "h-[90vh] max-h-[90vh] rounded-t-xl border-t-2 border-t-gray-200 bg-white/95 backdrop-blur-sm w-full"
              : "sm:top-4 sm:bottom-4 sm:right-4 sm:h-auto sm:max-h-[calc(100vh-2rem)] sm:rounded-2xl sm:border sm:border-border sm:overflow-hidden",
            isMobile
              ? "w-full max-w-full !gap-0 !p-0"
              : "w-full sm:w-[560px] sm:max-w-[560px] !gap-0 !p-0",
          )}
        >
          {detailOrder && (
            <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
              {isMobile ? (
                <div className="flex justify-center pt-3 pb-2">
                  <div className="h-1 w-12 rounded-full bg-gray-300" />
                </div>
              ) : null}
              <SheetHeader className="space-y-0 border-b p-0 text-left">
                <div className="flex w-full items-center justify-between gap-3 p-4 pb-3">
                  <div className="min-w-0">
                    <SheetTitle className="truncate text-xl font-semibold text-gray-900">
                      {detailOrder.order_number
                        ? `${t("orders.orderNumber")} #${detailOrder.order_number}`
                        : `${t("orders.orderNumber")} #${detailOrder.id.slice(0, 8)}`}
                    </SheetTitle>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {new Date(
                        getOrderDisplayDate(detailOrder),
                      ).toLocaleString()}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={closeDetailSheet}
                    className="h-8 w-8 shrink-0 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                    aria-label={tAppt("sheet.actions.close")}
                  >
                    <RiCloseLargeLine size={18} />
                  </Button>
                </div>
              </SheetHeader>

              <div className="min-h-0 flex-1 overflow-y-auto bg-white">
                  {/* Order overview: line items (payment-style rows) + compact totals */}
                  <section className="px-6 py-5">
                    {(() => {
                      const subtotalFromOrder =
                        typeof detailOrder.subtotal === "number"
                          ? detailOrder.subtotal
                          : null;
                      const computedSubtotal = orderItems.reduce(
                        (sum, item) =>
                          sum + (item.unit_price || 0) * (item.quantity || 1),
                        0,
                      );
                      const subtotal = subtotalFromOrder ?? computedSubtotal;
                      const discountTotal = orderItems.reduce(
                        (sum, item) => sum + (item.discount_amount || 0),
                        0,
                      );
                      const tax = detailOrder.tax_amount || 0;
                      const total =
                        detailOrder.total_amount ??
                        Math.max(subtotal - discountTotal + tax, 0);
                      const totalExclVat = Math.max(total - tax, 0);
                      const paid = getTotalPaid(detailOrder, orderPayments);
                      const remaining = total - paid;

                      return (
                        <>
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-base font-semibold">
                              {t("orders.detail.summaryTitle")}
                            </h3>
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              {getPaymentStatusBadge(detailOrder)}
                              {isEditMode ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  disabled={isAddingOrderItem}
                                  title={tAppt("sheet.actions.addItems")}
                                  aria-label={tAppt("sheet.actions.addItems")}
                                  onClick={() => {
                                    setShowAddItemsDialog(true);
                                    void fetchItemsForAddDialog();
                                  }}
                                >
                                  {isAddingOrderItem ? (
                                    <RiLoader4Line
                                      size={16}
                                      className="animate-spin"
                                      aria-hidden
                                    />
                                  ) : (
                                    <RiAddLine size={16} aria-hidden />
                                  )}
                                </Button>
                              ) : null}
                            </div>
                          </div>

                          {isLoadingOrderItems ? (
                            <div className="flex justify-center py-6">
                              <Loader2Icon className="h-4 w-4 animate-spin text-gray-400" />
                            </div>
                          ) : orderItems.length ? (
                            <div className="divide-y">
                              {orderItems.map((item) => {
                                const quantity = item.quantity || 1;
                                const lineTotal =
                                  item.total ??
                                  (item.unit_price || 0) * quantity;
                                const discountAmount =
                                  item.discount_amount || 0;
                                const itemName = resolveItemName(item);
                                const subtitleParts = isEditMode
                                  ? [
                                      item.service_variant?.name,
                                      discountAmount > 0
                                        ? `${t("pos.discount")} −€${discountAmount.toFixed(2)}`
                                        : null,
                                    ].filter(Boolean)
                                  : [
                                      `€${(item.unit_price || 0).toFixed(2)} × ${quantity}`,
                                      item.service_variant?.name,
                                      discountAmount > 0
                                        ? `${t("pos.discount")} −€${discountAmount.toFixed(2)}`
                                        : null,
                                    ].filter(Boolean);

                                return (
                                  <div
                                    key={item.id}
                                    className="py-3 first:pt-0 last:pb-0"
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="flex min-w-0 items-center gap-3">
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-gray-50 text-muted-foreground">
                                          <PackageIcon
                                            className="h-4 w-4"
                                            aria-hidden
                                          />
                                        </span>
                                        <div className="min-w-0">
                                          <div className="text-sm font-medium leading-snug">
                                            {itemName}
                                          </div>
                                          {subtitleParts.length > 0 ? (
                                            <div className="text-xs text-muted-foreground">
                                              {subtitleParts.join(" · ")}
                                            </div>
                                          ) : null}
                                        </div>
                                      </div>
                                      <div className="flex shrink-0 items-center gap-2">
                                        {isEditMode ? (
                                          <div className="flex shrink-0 items-center gap-1">
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              className="h-8 w-8 p-0"
                                              disabled={
                                                quantity <= 1 ||
                                                adjustingQtyItemId ===
                                                  item.id ||
                                                savingItemId === item.id
                                              }
                                              title={t("pos.quantity")}
                                              aria-label={t(
                                                "orders.quantityDecrease",
                                              )}
                                              onClick={() =>
                                                void handleAdjustItemQuantity(
                                                  item,
                                                  -1,
                                                )
                                              }
                                            >
                                              <MinusIcon
                                                size={12}
                                                aria-hidden
                                              />
                                            </Button>
                                            <span className="w-6 text-center text-sm">
                                              {adjustingQtyItemId ===
                                              item.id ? (
                                                <Loader2Icon className="mx-auto inline-block h-3.5 w-3.5 animate-spin text-muted-foreground" />
                                              ) : (
                                                quantity
                                              )}
                                            </span>
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              className="h-8 w-8 p-0"
                                              disabled={
                                                adjustingQtyItemId ===
                                                  item.id ||
                                                savingItemId === item.id
                                              }
                                              title={t("pos.quantity")}
                                              aria-label={t(
                                                "orders.quantityIncrease",
                                              )}
                                              onClick={() =>
                                                void handleAdjustItemQuantity(
                                                  item,
                                                  1,
                                                )
                                              }
                                            >
                                              <PlusIcon
                                                size={12}
                                                aria-hidden
                                              />
                                            </Button>
                                          </div>
                                        ) : null}
                                        <span className="text-sm font-semibold tabular-nums">
                                          €{lineTotal.toFixed(2)}
                                        </span>
                                        {isEditMode ? (
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                            onClick={() =>
                                              setPendingDeleteTarget({
                                                type: "item",
                                                id: item.id,
                                              })
                                            }
                                            disabled={
                                              deletingItemId === item.id ||
                                              savingItemId === item.id
                                            }
                                            aria-label={t(
                                              "orderPanel.actions.deleteItem",
                                            )}
                                          >
                                            {deletingItemId === item.id ? (
                                              <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                              <Trash2Icon className="h-3.5 w-3.5" />
                                            )}
                                          </Button>
                                        ) : null}
                                      </div>
                                    </div>
                                    {isEditMode ? (
                                      <div className="mt-2 flex flex-wrap items-center gap-3 pl-11">
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                          <span>{t("orders.price")}</span>
                                          <Input
                                            key={`ip-${item.id}-${item.unit_price}-${item.discount_amount}-${quantity}`}
                                            ref={(el) => {
                                              if (el) {
                                                itemPriceInputRefs.current.set(
                                                  item.id,
                                                  el,
                                                );
                                              } else {
                                                itemPriceInputRefs.current.delete(
                                                  item.id,
                                                );
                                              }
                                            }}
                                            defaultValue={(
                                              item.unit_price || 0
                                            ).toFixed(2)}
                                            disabled={
                                              adjustingQtyItemId === item.id ||
                                              savingItemId === item.id
                                            }
                                            className="h-8 w-20 text-right"
                                            inputMode="decimal"
                                            onFocus={(e) => e.target.select()}
                                            onBlur={() =>
                                              void persistOrderItemLine(
                                                item.id,
                                              )
                                            }
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                (
                                                  e.target as HTMLInputElement
                                                ).blur();
                                              }
                                            }}
                                          />
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                          <span>{t("pos.discount")}</span>
                                          <Input
                                            key={`idisc-${item.id}-${item.unit_price}-${item.discount_amount}-${quantity}`}
                                            ref={(el) => {
                                              if (el) {
                                                itemDiscountInputRefs.current.set(
                                                  item.id,
                                                  el,
                                                );
                                              } else {
                                                itemDiscountInputRefs.current.delete(
                                                  item.id,
                                                );
                                              }
                                            }}
                                            defaultValue={(
                                              item.discount_amount || 0
                                            ).toFixed(2)}
                                            disabled={
                                              adjustingQtyItemId === item.id ||
                                              savingItemId === item.id
                                            }
                                            className="h-8 w-20 text-right"
                                            inputMode="decimal"
                                            onFocus={(e) => e.target.select()}
                                            onBlur={() =>
                                              void persistOrderItemLine(
                                                item.id,
                                              )
                                            }
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                (
                                                  e.target as HTMLInputElement
                                                ).blur();
                                              }
                                            }}
                                          />
                                        </div>
                                        {savingItemId === item.id ? (
                                          <Loader2Icon className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                                        ) : null}
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              {t("orders.noItems")}
                            </p>
                          )}

                          <div className="mt-3 space-y-1.5 border-t pt-3 text-sm">
                            <div className="flex justify-between gap-3 text-muted-foreground">
                              <span>{t("orders.detail.subtotal")}</span>
                              <span className="shrink-0 tabular-nums">
                                €{subtotal.toFixed(2)}
                              </span>
                            </div>
                            {discountTotal > 0 ? (
                              <div className="flex justify-between gap-3 text-muted-foreground">
                                <span>{t("orders.detail.discount")}</span>
                                <span className="tabular-nums">
                                  −€{discountTotal.toFixed(2)}
                                </span>
                              </div>
                            ) : null}
                            {tax > 0 ? (
                              <div className="flex justify-between gap-3 text-muted-foreground">
                                <span>{t("orders.detail.totalExclVat")}</span>
                                <span className="tabular-nums">
                                  €{totalExclVat.toFixed(2)}
                                </span>
                              </div>
                            ) : null}
                            {tax > 0 ? (
                              <div className="flex justify-between gap-3 text-muted-foreground">
                                <span>{t("orders.detail.tax")}</span>
                                <span className="tabular-nums">
                                  €{tax.toFixed(2)}
                                </span>
                              </div>
                            ) : null}
                            <div className="flex justify-between gap-3 border-t border-border pt-2 font-semibold">
                              <span>{t("orders.detail.total")}</span>
                              <span className="tabular-nums">
                                €{total.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between gap-3 text-muted-foreground">
                              <span>{t("orders.detail.paidByCustomer")}</span>
                              <span className="tabular-nums">
                                €{paid.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between gap-3">
                              <span className="text-muted-foreground">
                                {t("orders.detail.amountDue")}
                              </span>
                              <span
                                className={cn(
                                  "font-semibold tabular-nums",
                                  remaining < 0
                                    ? "text-red-600"
                                    : Math.abs(remaining) < 0.0001
                                      ? "text-green-600"
                                      : "text-amber-600",
                                )}
                              >
                                €{remaining.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled
                            >
                              {t("orders.detail.sendInvoice")}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={
                                isSendingPayLink ||
                                remaining <= 0.005 ||
                                (detailOrder.payment_status === "paid" &&
                                  remaining <= 0.005)
                              }
                              onClick={() =>
                                void handleSendPayLink(detailOrder, remaining)
                              }
                            >
                              {isSendingPayLink
                                ? t("common.loading")
                                : t("orders.detail.sendPayLink")}
                            </Button>
                          </div>
                        </>
                      );
                    })()}
                  </section>

                  <hr />

                  {/* Customer — w-14 avatar aligns with name + contact rows; type scale matches other sheet sections */}
                  <section className="px-6 py-5">
                    {(() => {
                      const client =
                        detailOrder.appointment?.client ?? detailOrder.client;
                      if (!client) {
                        return (
                          <p className="text-sm text-muted-foreground">
                            {t("common.notAvailable")}
                          </p>
                        );
                      }

                      const first = client.first_name?.trim() ?? "";
                      const last = client.last_name?.trim() ?? "";
                      const displayName =
                        `${first} ${last}`.trim() ||
                        getClientName(detailOrder);
                      const initials =
                        `${first[0]?.toUpperCase() ?? ""}${last[0]?.toUpperCase() ?? ""}` ||
                        "?";

                      return (
                        <div className="flex items-start gap-4">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gray-200 text-base font-semibold text-gray-700">
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="mb-2 text-base font-semibold text-gray-900">
                              {displayName}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                              {client.phone ? (
                                <>
                                  <RiPhoneLine
                                    size={16}
                                    className="flex-shrink-0 text-gray-400"
                                    aria-hidden
                                  />
                                  <button
                                    type="button"
                                    className="hover:text-gray-900"
                                    title={tAppt(
                                      "sheet.actions.clickToCopy",
                                    )}
                                    onClick={() =>
                                      copyContactToClipboard(client.phone!)
                                    }
                                  >
                                    {client.phone}
                                  </button>
                                </>
                              ) : null}
                              {client.phone && client.email ? (
                                <span className="text-gray-400" aria-hidden>
                                  •
                                </span>
                              ) : null}
                              {client.email ? (
                                <>
                                  <RiMailLine
                                    size={16}
                                    className="flex-shrink-0 text-gray-400"
                                    aria-hidden
                                  />
                                  <button
                                    type="button"
                                    className="truncate hover:text-gray-900"
                                    title={tAppt(
                                      "sheet.actions.clickToCopy",
                                    )}
                                    onClick={() =>
                                      copyContactToClipboard(client.email!)
                                    }
                                  >
                                    {client.email}
                                  </button>
                                </>
                              ) : null}
                              {!client.phone && !client.email ? (
                                <span className="text-muted-foreground">
                                  {t("common.notAvailable")}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </section>

                  <hr />

                  {/* Payments */}
                  <section ref={paymentsSectionRef} className="px-6 py-5">
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="text-base font-semibold">
                        {t("orderPanel.paymentsTitle")}
                      </h4>
                      {!showAddPaymentForm ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-sm text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setShowAddPaymentForm(true);
                          }}
                        >
                          <PlusIcon className="mr-1 h-4 w-4" />
                          {t("orderPanel.addPayment")}
                        </Button>
                      ) : null}
                    </div>
                    {isLoadingOrderPayments ? (
                      <div className="flex justify-center py-6">
                        <Loader2Icon className="h-4 w-4 animate-spin text-gray-400" />
                      </div>
                    ) : orderPayments.length ? (
                      <div className="divide-y">
                        {orderPayments.map((payment) => (
                          <div
                            key={payment.id}
                            className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-gray-50 text-muted-foreground">
                                {payment.payment_method
                                  ? getPaymentMethodIcon(payment.payment_method)
                                  : null}
                              </span>
                              <div className="min-w-0">
                                <div className="text-sm font-medium">
                                  {payment.payment_method
                                    ? getPaymentMethodLabel(
                                        payment.payment_method,
                                      )
                                    : t("common.notAvailable")}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {payment.created_at
                                    ? new Date(
                                        payment.created_at,
                                      ).toLocaleString()
                                    : ""}
                                </div>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              {isEditMode ? (
                                <div className="flex items-center gap-1.5">
                                  <Input
                                    key={`pay-${payment.id}-${payment.amount_gross}`}
                                    defaultValue={(
                                      payment.amount_gross || 0
                                    ).toFixed(2)}
                                    className="h-8 w-24 text-right"
                                    inputMode="decimal"
                                    disabled={
                                      savingPaymentId === payment.id ||
                                      deletingPaymentId === payment.id
                                    }
                                    onFocus={(e) => e.target.select()}
                                    onBlur={(e) =>
                                      void persistExistingPaymentAmount(
                                        payment,
                                        e.target.value,
                                      )
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        (
                                          e.target as HTMLInputElement
                                        ).blur();
                                      }
                                    }}
                                  />
                                  {savingPaymentId === payment.id ? (
                                    <Loader2Icon className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
                                  ) : null}
                                </div>
                              ) : (
                                <span className="text-sm font-semibold tabular-nums">
                                  €{(payment.amount_gross || 0).toFixed(2)}
                                </span>
                              )}
                              {isEditMode ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  onClick={() =>
                                    setPendingDeleteTarget({
                                      type: "payment",
                                      id: payment.id,
                                    })
                                  }
                                  disabled={
                                    deletingPaymentId === payment.id ||
                                    savingPaymentId === payment.id
                                  }
                                  aria-label={t(
                                    "orderPanel.actions.deletePayment",
                                  )}
                                >
                                  {deletingPaymentId === payment.id ? (
                                    <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2Icon className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {t("orderPanel.noPayments")}
                      </p>
                    )}

                    {showAddPaymentForm ? (
                      <div className="mt-4 border-t pt-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label>{t("orderPanel.fields.method")}</Label>
                            <Select
                              value={newPaymentMethod}
                              onValueChange={setNewPaymentMethod}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cash">
                                  {t("pos.paymentMethods.cash")}
                                </SelectItem>
                                <SelectItem value="card">
                                  {t("pos.paymentMethods.card")}
                                </SelectItem>
                                <SelectItem value="invoice">
                                  {t("pos.paymentMethods.invoice")}
                                </SelectItem>
                                <SelectItem value="bank_transfer">
                                  {t("pos.paymentMethods.bankTransfer")}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label>{t("orderPanel.fields.amount")}</Label>
                            <Input
                              value={newPaymentAmount}
                              onChange={(event) =>
                                setNewPaymentAmount(event.target.value)
                              }
                              onFocus={(event) => event.target.select()}
                              onClick={(event) =>
                                (event.target as HTMLInputElement).select()
                              }
                              onBlur={() => void persistNewPayment()}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  void persistNewPayment();
                                }
                              }}
                              disabled={isSavingOrderPayment}
                              inputMode="decimal"
                            />
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </section>

                  <div className="h-6" />
                </div>

                {!isEditMode ? (
                  <SheetFooter
                    className={cn(
                      "flex-shrink-0 flex-row border-t border-gray-200 sm:justify-between",
                      isMobile ? "px-4 py-4" : "px-6 py-4",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          setPendingDeleteTarget({ type: "order" })
                        }
                        disabled={isDeletingOrder}
                        aria-label={t("orderPanel.actions.deleteOrder")}
                      >
                        {isDeletingOrder ? (
                          <RiLoader4Line
                            size={16}
                            className="animate-spin"
                            aria-hidden
                          />
                        ) : (
                          <RiDeleteBinLine size={16} aria-hidden />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setIsEditMode(true)}
                        aria-label={t("common.edit")}
                      >
                        <RiEditLine size={16} aria-hidden />
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeDetailSheet}
                    >
                      {tAppt("sheet.actions.close")}
                    </Button>
                  </SheetFooter>
                ) : (
                  <SheetFooter
                    className={cn(
                      "flex-shrink-0 flex-row border-t border-gray-200 sm:justify-between",
                      isMobile ? "px-4 py-4" : "px-6 py-4",
                    )}
                  >
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setPendingDeleteTarget({ type: "order" })
                      }
                      disabled={isDeletingOrder}
                      aria-label={t("orderPanel.actions.deleteOrder")}
                    >
                      {isDeletingOrder ? (
                        <RiLoader4Line
                          size={16}
                          className="animate-spin"
                          aria-hidden
                        />
                      ) : (
                        <RiDeleteBinLine size={16} aria-hidden />
                      )}
                    </Button>
                    <div className="flex flex-1 justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsEditMode(false);
                          resetPaymentForm();
                          resetItemForm();
                          setShowAddPaymentForm(false);
                        }}
                      >
                        {t("common.cancel")}
                      </Button>
                    </div>
                  </SheetFooter>
                )}
              </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog
        open={showAddItemsDialog}
        onOpenChange={setShowAddItemsDialog}
      >
        <DialogContent className="flex h-[850px] !max-w-[1000px] !w-[1000px] flex-col overflow-hidden p-0">
          <DialogHeader className="px-6 pb-4 pt-6">
            <DialogTitle>{tAppt("sheet.addItemsDialog.title")}</DialogTitle>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center gap-2 border-b px-6 pb-4">
              <Button
                variant={
                  selectedItemCategory === "products" ? "default" : "outline"
                }
                size="sm"
                className={cn(
                  "flex items-center gap-2",
                  selectedItemCategory === "products" &&
                    "bg-primary text-primary-foreground",
                )}
                onClick={() => setSelectedItemCategory("products")}
              >
                <span>{tAppt("sheet.addItemsDialog.products")}</span>
              </Button>
              <Button
                variant={
                  selectedItemCategory === "treatments" ? "default" : "outline"
                }
                size="sm"
                className={cn(
                  "flex items-center gap-2",
                  selectedItemCategory === "treatments" &&
                    "bg-primary text-primary-foreground",
                )}
                onClick={() => setSelectedItemCategory("treatments")}
              >
                <span>{tAppt("sheet.addItemsDialog.treatments")}</span>
              </Button>
            </div>

            {selectedItemCategory === "treatments" &&
            posTreatments.length > 0 ? (
              <div className="flex items-center gap-2 overflow-x-auto border-b bg-gray-50 px-6 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {posTreatments.map((tr) => (
                  <button
                    key={tr.id}
                    type="button"
                    onClick={() => {
                      setSelectedTreatmentNav(tr.id);
                      const el = treatmentScrollRefs.current.get(tr.id);
                      el?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className={cn(
                      "flex-shrink-0 whitespace-nowrap rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium transition-colors",
                      selectedTreatmentNav === tr.id
                        ? "bg-primary text-primary-foreground"
                        : "text-gray-700 hover:bg-gray-100",
                    )}
                  >
                    {tr.name}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              {loadingItems ? (
                <div className="flex items-center justify-center py-12">
                  <RiLoader4Line
                    className="animate-spin text-gray-400"
                    size={24}
                  />
                </div>
              ) : selectedItemCategory === "products" ? (
                posProducts.length === 0 ? (
                  <div className="py-12 text-center text-gray-500">
                    <p className="text-sm">
                      {tAppt("sheet.addItemsDialog.noProductsFound")}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {posProducts.map((product) => {
                      const grossPrice =
                        Math.round((product.price_gross || 0) * 100) / 100;
                      return (
                        <div
                          key={product.id}
                          role="button"
                          tabIndex={0}
                          className={cn(
                            "cursor-pointer rounded-lg border border-gray-200 bg-white transition-all hover:border-primary hover:shadow-md",
                            isAddingOrderItem && "pointer-events-none opacity-60",
                          )}
                          onClick={() => void handleAddProductLine(product)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              void handleAddProductLine(product);
                            }
                          }}
                        >
                          <div className="flex aspect-square items-center justify-center rounded-t-lg bg-gray-50">
                            <span className="text-3xl">🛍️</span>
                          </div>
                          <div className="p-4">
                            <h3 className="mb-1 line-clamp-2 text-sm font-semibold">
                              {product.name || tAppt("sheet.unnamedProduct")}
                            </h3>
                            <p className="text-lg font-bold text-primary">
                              €{grossPrice.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : posTreatments.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <p className="text-sm">
                    {tAppt("sheet.addItemsDialog.noTreatmentsFound")}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {posTreatments.map((treatment) => {
                    const options = treatment.price_options || [];
                    if (options.length === 0) return null;
                    return (
                      <div
                        key={treatment.id}
                        ref={(el) => {
                          if (el) {
                            treatmentScrollRefs.current.set(treatment.id, el);
                          } else {
                            treatmentScrollRefs.current.delete(treatment.id);
                          }
                        }}
                        className="scroll-mt-4"
                      >
                        <h3 className="mb-3 px-1 text-base font-semibold text-gray-900">
                          {treatment.name}
                        </h3>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                          {options.map((option) => {
                            const grossPrice =
                              Math.round((option.price || 0) * 100) / 100;
                            return (
                              <div
                                key={option.id}
                                role="button"
                                tabIndex={0}
                                className={cn(
                                  "cursor-pointer rounded-lg border border-gray-200 bg-white transition-all hover:border-primary hover:shadow-md",
                                  isAddingOrderItem &&
                                    "pointer-events-none opacity-60",
                                )}
                                onClick={() =>
                                  void handleAddTreatmentLine(
                                    treatment,
                                    option,
                                  )
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    void handleAddTreatmentLine(
                                      treatment,
                                      option,
                                    );
                                  }
                                }}
                              >
                                <div className="flex aspect-square items-center justify-center rounded-t-lg bg-gray-50">
                                  <span className="text-3xl">💆</span>
                                </div>
                                <div className="p-4">
                                  <h4 className="mb-1 line-clamp-2 text-sm font-semibold">
                                    {option.name}
                                  </h4>
                                  <p className="mb-2 text-xs text-gray-500">
                                    {option.duration_in_minutes} min
                                  </p>
                                  <span className="text-lg font-bold text-primary">
                                    €{grossPrice.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pendingDeleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDeleteTarget?.type === "order"
                ? t("orderPanel.actions.deleteOrder")
                : pendingDeleteTarget?.type === "item"
                  ? t("orderPanel.actions.deleteItem")
                  : t("orderPanel.actions.deletePayment")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteTarget?.type === "order"
                ? t("orderPanel.confirm.deleteOrder")
                : pendingDeleteTarget?.type === "item"
                  ? t("orderPanel.confirm.deleteItem")
                  : t("orderPanel.confirm.deletePayment")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const target = pendingDeleteTarget;
                setPendingDeleteTarget(null);
                if (!target) return;
                if (target.type === "order") {
                  await handleDeleteOrder();
                  return;
                }
                if (target.type === "item") {
                  await handleDeleteItem(target.id);
                  return;
                }
                await handleDeletePayment(target.id);
              }}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProtectedRoute>
  );
}
