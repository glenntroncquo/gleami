"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  RiCalendarLine,
  RiDeleteBinLine,
  RiCloseLargeLine,
  RiLoader4Line,
  RiAddLine,
  RiEditLine,
  RiPhoneLine,
  RiMailLine,
  RiUserLine,
  RiCashLine,
  RiArrowDownSLine,
  RiArrowRightSLine,
} from "@remixicon/react";
import { isBefore } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { loadResolvedOrderItems } from "@/lib/api/orders/load-resolved-order-items";
import { toast } from "sonner";
import { useCompanyId, useLocationId } from "@/lib/company-util";
import {
  asLocationClient,
  fetchServiceIdsForLocation,
  fetchStaffIdsForLocation,
  offeredServiceIdsForLocation,
  staffIdsForLocationScope,
  withLocationId,
} from "@/lib/location";
import { useAuth } from "@/providers/auth-provider";
import { resolveLocationScopeIds } from "@/lib/async/fail-closed";
import { useTranslations } from "next-intl";
import { useIsMobile } from "@/hooks/use-mobile";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useClientSearch, type ClientSearchResult } from "@/hooks/use-client-search";
import { cn } from "@/lib/utils";

import type { CalendarEvent } from "@/components/event-calendar";
import { DefaultStartHour } from "@/components/event-calendar/constants";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  ImagePlusIcon,
  XIcon,
} from "lucide-react";
import { ChevronDownIcon, SearchIcon } from "lucide-react";
import { CartItem as CartItemComponent } from "@/app/[locale]/pos/components/cart-item";
import {
  PaymentSection,
  getDefaultOrderDateTime,
  type SplitPayment,
} from "@/app/[locale]/pos/components/payment-section";
import { buildOrderCreatePayments } from "@/app/[locale]/pos/components/payment-methods";
import type {
  CartItem as CartItemType,
  Product as POSProduct,
  Service as POSService,
} from "@/app/[locale]/pos/components/types";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getSubtotal as calculateSubtotal,
  getTax as calculateTax,
  getDiscount as calculateDiscount,
  getTotal as calculateTotal,
} from "@/app/[locale]/pos/components/utils";
import type { CreateOrderWithPaymentV3Response } from "@/lib/api/pos/mutations/create-order";
import {
  EmbeddedPosSession,
  mapAppointmentSegmentsToInput,
  useAppointmentOrderStatus,
} from "@/components/embedded-pos";
import type { EmbeddedPosServiceInput } from "@/components/embedded-pos";
import {
  fetchClientHistory as fetchClientHistoryById,
  type ClientHistory,
} from "@/lib/api/client/queries/fetch-client-history";
import {
  formatHistoryAppointmentTitle,
  formatHistoryOrderItemName,
  getHistoryPaymentVisualState as getHistoryOrderPaymentVisualState,
} from "@/lib/client-history/history-display-utils";
import { saveStaffAppointment } from "@/lib/api/calendar/mutations/save-staff-appointment";
import { cancelStaffAppointment } from "@/lib/api/calendar/mutations/cancel-staff-appointment";
import {
  createStaffAppointment,
  fileToImageData,
} from "@/lib/api/calendar/mutations/create-staff-appointment";
import {
  eligibleStaffFor,
  staffIdIfEligible,
  staffOptionsForSelect,
  type StaffServiceLink,
  type StaffServiceVariantLink,
} from "@/lib/api/calendar/staff-eligibility";

interface AppointmentSheetProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: CalendarEvent) => void;
  onDelete: (eventId: string) => void;
  onRefresh?: () => void;
}

interface Staff {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

interface ServiceVariant {
  id: string;
  name: string;
  price: number;
  duration_in_minutes: number;
  actual_duration_in_minutes?: number | null;
  vat_rate?: number | null;
}

interface SelectedService {
  id: string;
  serviceId: string;
  serviceVariantId: string;
  staffId: string;
  service: Service;
  serviceVariant: ServiceVariant;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  company_id: string;
  service_variant: ServiceVariant[];
}

interface OrderPaymentEntry {
  id: string;
  payment_method: "cash" | "card" | "invoice" | "bank_transfer" | null;
  amount: number | null;
  amount_gross: number | null;
  status: string | null;
  payment_status: string | null;
  created_at: string | null;
}

interface OrderDialogData {
  id: string;
  order_number: string | null;
  total_amount: number | null;
  payment_status: string | null;
  fallback_item_labels?: string[];
  items: Array<{
    id: string;
    quantity: number | null;
    unit_price: number | null;
    total: number | null;
    discount_amount: number | null;
    product: { id: string; name: string | null } | null;
    service: { id: string; name: string | null } | null;
    service_variant:
      | {
          id: string;
          name: string | null;
          service: { id: string; name: string | null } | null;
        }
      | null;
  }>;
}

type AppointmentPickerProduct = POSProduct & {
  barcode?: string | null;
  product_line_id?: string | null;
  product_category_id?: string | null;
  product_line?: { id: string; name: string | null } | null;
  product_category?: { id: string; name: string | null } | null;
};

function formatClockTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function AppointmentSheet({
  event,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onRefresh,
}: AppointmentSheetProps) {
  const t = useTranslations("appointments");
  const tPos = useTranslations();
  const isMobile = useIsMobile();
  const companyId = useCompanyId();
  const locationId = useLocationId();
  const { multiLocationEnabled } = useAuth();
  const appointmentRecordId = event?.appointmentId || "";

  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState(`${DefaultStartHour}:00`);
  const [endTime, setEndTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [staffServiceLinks, setStaffServiceLinks] = useState<StaffServiceLink[]>(
    [],
  );
  const [staffServiceVariantLinks, setStaffServiceVariantLinks] = useState<
    StaffServiceVariantLink[]
  >([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [services, setServices] = useState<Service[]>([]);
  const [appointmentServices, setAppointmentServices] = useState<
    SelectedService[]
  >([]);
  const [editingIndex, setEditingIndex] = useState<number>(0);
  const [clientEmail, setClientEmail] = useState<string>("");
  const [clientFirstName, setClientFirstName] = useState<string>("");
  const [clientLastName, setClientLastName] = useState<string>("");
  const [clientPhone, setClientPhone] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [staffNotes, setStaffNotes] = useState<string>("");
  const [staffImagePath, setStaffImagePath] = useState<string | null>(null);
  const [clientImagePath, setClientImagePath] = useState<string | null>(null);
  const [isStaffImageOpen, setIsStaffImageOpen] = useState<boolean>(false);
  const [isClientImageOpen, setIsClientImageOpen] = useState<boolean>(false);
  const [expandedHistoryImages, setExpandedHistoryImages] = useState<
    Set<string>
  >(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastSaveTime, setLastSaveTime] = useState<number>(0);
  const [lastFormData, setLastFormData] = useState<string>("");

  // File upload configuration
  const maxSizeMB = 5;
  const maxSize = maxSizeMB * 1024 * 1024; // 5MB

  const [
    { files, isDragging, errors: uploadErrors },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      removeFile,
      getInputProps,
    },
  ] = useFileUpload({
    accept: "image/*",
    maxSize,
  });

  const clientSearch = useClientSearch({ companyId });

  // View/Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);

  // History panel states
  const [clientHistory, setClientHistory] = useState<ClientHistory | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  type PosSessionState =
    | { mode: "checkout"; services: EmbeddedPosServiceInput[] }
    | { mode: "order"; order: OrderDialogData };

  const [posSession, setPosSession] = useState<PosSessionState | null>(null);

  const orderStatus = useAppointmentOrderStatus(appointmentRecordId || undefined);

  // Cart panel states (legacy; POS UI uses EmbeddedPosSession)
  const [showCart, setShowCart] = useState(false);
  const [cart, setCart] = useState<CartItemType[]>([]);
  const [editingPriceIndex, setEditingPriceIndex] = useState<number | null>(
    null,
  );
  const [editingDiscountIndex, setEditingDiscountIndex] = useState<
    number | null
  >(null);
  const [priceInputWidths, setPriceInputWidths] = useState<
    Record<number, number>
  >({});
  const [discountInputWidths, setDiscountInputWidths] = useState<
    Record<number, number>
  >({});
  const priceSpanRefs = useRef<Map<number, HTMLSpanElement>>(new Map());
  const discountSpanRefs = useRef<Map<number, HTMLSpanElement>>(new Map());
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    "cash" | "card" | "invoice" | "bank_transfer"
  >("bank_transfer");
  const [splitPayments, setSplitPayments] = useState<SplitPayment[]>([
    { id: "payment-1", method: "bank_transfer", amount: 0 },
  ]);
  const [orderDateTime, setOrderDateTime] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  const [showProcessButton, setShowProcessButton] = useState(false);
  const [showSimulateButton, setShowSimulateButton] = useState(false);
  const [orderResult, setOrderResult] =
    useState<CreateOrderWithPaymentV3Response | null>(null);
  const [pendingCardIntentIds, setPendingCardIntentIds] = useState<string[]>(
    [],
  );
  const companyReaderId: string | null = null;
  const [readerId, setReaderId] = useState<string>("");
  const [hasOrder, setHasOrder] = useState<boolean>(false);
  const [currentAppointmentOrder, setCurrentAppointmentOrder] =
    useState<OrderDialogData | null>(null);
  const [rightPanelMode, setRightPanelMode] = useState<"cart" | "order">(
    "cart",
  );
  const [selectedOrderDetail, setSelectedOrderDetail] =
    useState<OrderDialogData | null>(null);
  const [orderPayments, setOrderPayments] = useState<OrderPaymentEntry[]>([]);
  const [isLoadingOrderPayments, setIsLoadingOrderPayments] =
    useState<boolean>(false);
  const [isSavingOrderPayment, setIsSavingOrderPayment] =
    useState<boolean>(false);
  const [isDeletingOrder, setIsDeletingOrder] = useState<boolean>(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(
    null,
  );
  const [pendingDeleteTarget, setPendingDeleteTarget] = useState<
    { type: "order" } | { type: "payment"; paymentId: string } | null
  >(null);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editingPaymentAmount, setEditingPaymentAmount] = useState<string>("");
  const [newPaymentMethod, setNewPaymentMethod] = useState<
    "cash" | "card" | "invoice" | "bank_transfer"
  >("cash");
  const [newPaymentAmount, setNewPaymentAmount] = useState<string>("");

  // Add Items Dialog states
  const [showAddItemsDialog, setShowAddItemsDialog] = useState(false);
  const [posProducts, setPosProducts] = useState<AppointmentPickerProduct[]>([]);
  const [posServices, setPosServices] = useState<POSService[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [selectedItemCategory, setSelectedItemCategory] = useState<
    "products" | "treatments"
  >("products");
  const [selectedServiceNav, setSelectedServiceNav] = useState<
    string | null
  >(null);
  const treatmentScrollRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const editingPaymentInputRef = useRef<HTMLInputElement | null>(null);

  // Get the currently editing treatment
  const currentService = appointmentServices[editingIndex];
  const selectedServiceId = currentService?.serviceId || "";
  const selectedServiceVariantId = currentService?.serviceVariantId || "";

  const visitStaffOptions = staffOptionsForSelect(
    eligibleStaffFor(
      staffList,
      selectedServiceId,
      selectedServiceVariantId,
      staffServiceLinks,
      staffServiceVariantLinks,
    ),
    staffList,
    selectedStaffId,
  );

  // Check if all required fields are filled and not loading (email, name, last name are optional)
  const isFormValid = useMemo(() => {
    const hasValidTreatments =
      appointmentServices.length > 0 &&
      appointmentServices.every((t) => t.serviceId && t.serviceVariantId && (t.staffId || selectedStaffId));

    return (
      !isLoading &&
      hasValidTreatments &&
      startTime &&
      endTime
    );
  }, [isLoading, selectedStaffId, appointmentServices, startTime, endTime]);

  // Debug log to check what event is being passed
  useEffect(() => {
    console.log("AppointmentSheet received event:", event);
    if (event) {
      console.log("Event details:", {
        id: event.id,
        title: event.title,
        serviceId: event.serviceId,
        staff: event.staff,
        client: event.client,
        service: event.service,
        start: event.start,
        end: event.end,
      });
      console.log("Event ID type:", typeof event.id, "Value:", event.id);
      console.log("Is this an edit operation?", !!event.id);
    } else {
      console.log("No event provided - this is a create operation");
    }
  }, [event]);

  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (
        startDateOpen &&
        !target.closest("#date-picker") &&
        !target.closest(".calendar-container")
      ) {
        setStartDateOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [startDateOpen]);

  useEffect(() => {
    console.log("here", event);
    if (event) {
      const start = new Date(event.visitStart ?? event.start);
      const end = new Date(event.visitEnd ?? event.end);
      setStartDate(start);
      setEndDate(end);
      setStartTime(formatClockTime(start));
      setEndTime(formatClockTime(end));
      setError(null); // Reset error when opening sheet
    } else {
      resetForm();
    }
  }, [event]);

  // Reset edit mode and cart when sheet closes
  useEffect(() => {
    if (!isOpen) {
      setIsEditMode(false); // Reset to view mode when closing
      setShowCart(false); // Close cart panel when sheet closes
    } else if (appointmentRecordId) {
      // For existing appointments, start in view mode
      setIsEditMode(false);
    } else {
      // For new appointments, start in edit mode
      setIsEditMode(true);
    }
  }, [isOpen, appointmentRecordId]);

  // Fetch client history
  const fetchClientHistory = useCallback(async (email: string) => {
    if (!email || !email.trim()) {
      setClientHistory(null);
      return;
    }

    setIsLoadingHistory(true);
    try {
      const supabase = createClient();
      const { data: clientData, error: clientError } = await supabase
        .from("client")
        .select("id")
        .eq("email", email.trim())
        .single();

      if (clientError || !clientData) {
        setClientHistory(null);
        return;
      }

      const { data, error } = await fetchClientHistoryById(
        clientData.id,
        companyId ?? undefined,
        locationId,
      );

      if (error || !data) {
        setClientHistory(null);
        return;
      }

      setClientHistory(data);
    } catch (error) {
      console.error("Error fetching client history:", error);
      setClientHistory(null);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [companyId, locationId]);

  // Fetch history when clientEmail is available
  useEffect(() => {
    if (clientEmail.trim()) {
      fetchClientHistory(clientEmail);
    }
  }, [clientEmail, fetchClientHistory]);

  const getHistoryPaymentVisualState = useCallback(
    (
      appointment: {
        is_canceled: boolean | null;
        order: {
          payment_status: string | null;
        } | null;
      },
    ) => {
      if (appointment.is_canceled) {
        return {
          dotContainer: "bg-red-100 border-red-500",
          dot: "bg-red-500",
          label: tPos("appointments.cancel"),
          labelClass: "text-red-600",
        };
      }

      if (appointment.order?.payment_status === "paid") {
        return {
          dotContainer: "bg-green-100 border-green-500",
          dot: "bg-green-500",
          label: tPos("orders.statusLabels.paid"),
          labelClass: "text-green-600",
        };
      }

      if (appointment.order) {
        return {
          dotContainer: "bg-yellow-100 border-yellow-500",
          dot: "bg-yellow-500",
          label: tPos("orders.statusLabels.partial"),
          labelClass: "text-yellow-600",
        };
      }

      return {
        dotContainer: "bg-blue-100 border-blue-500",
        dot: "bg-blue-500",
        label: tPos("common.notAvailable"),
        labelClass: "text-gray-600",
      };
    },
    [tPos],
  );

  const clientDisplayName =
    clientFirstName && clientLastName
      ? { first_name: clientFirstName, last_name: clientLastName }
      : null;

  useEffect(() => {
    setPosSession(null);
  }, [event?.id]);

  const loadOrderPayments = useCallback(async (orderId: string) => {
    setIsLoadingOrderPayments(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("payment")
        .select(
          "id, payment_method, amount_gross, status, payment_status, created_at",
        )
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });

      if (error) {
        toast.error(t("orderPanel.errors.loadPaymentsFailed"));
        setOrderPayments([]);
        return;
      }

      setOrderPayments((data || []) as OrderPaymentEntry[]);
    } catch (error) {
      console.error("Error loading order payments:", error);
      toast.error(t("orderPanel.errors.loadPaymentsFailed"));
      setOrderPayments([]);
    } finally {
      setIsLoadingOrderPayments(false);
    }
  }, [t]);

  const resetOrderPaymentForm = useCallback(() => {
    setEditingPaymentId(null);
    setEditingPaymentAmount("");
    setNewPaymentMethod("cash");
    setNewPaymentAmount("");
  }, []);

  const loadOrderItems = useCallback(async (orderId: string) => {
    return loadResolvedOrderItems(orderId);
  }, []);

  const openOrderDetailPanel = useCallback(
    async (order: OrderDialogData) => {
      const fullItems = await loadOrderItems(order.id);
      setSelectedOrderDetail(order);
      if (fullItems.length > 0) {
        setSelectedOrderDetail((prev) =>
          prev ? { ...prev, items: fullItems } : prev,
        );
      }
      setRightPanelMode("order");
      setShowCart(true);
      resetOrderPaymentForm();
      await loadOrderPayments(order.id);
    },
    [loadOrderItems, loadOrderPayments, resetOrderPaymentForm, setShowCart],
  );

  const handleEditOrderPayment = useCallback((payment: OrderPaymentEntry) => {
    setEditingPaymentId(payment.id);
    setEditingPaymentAmount((payment.amount_gross || 0).toFixed(2));
  }, []);

  useEffect(() => {
    if (!editingPaymentId) return;
    const timeout = window.setTimeout(() => {
      const input = editingPaymentInputRef.current;
      if (!input) return;
      input.focus();
      input.select();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [editingPaymentId]);


  const getOrderPaymentsTotalPaid = useCallback(() => {
    return orderPayments.reduce((sum, p) => sum + (p.amount_gross || 0), 0);
  }, [orderPayments]);

  const parseMoneyInput = useCallback((value: string): number | null => {
    const normalized = value.trim().replace(",", ".");
    if (!normalized) return null;
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) return null;
    return Math.round(parsed * 100) / 100;
  }, []);

  const getRemainingPreview = useCallback(() => {
    if (!selectedOrderDetail) return 0;
    const totalAmount = selectedOrderDetail.total_amount || 0;
    const totalPaid = getOrderPaymentsTotalPaid();
    if (editingPaymentId) {
      const parsedEditAmount = parseMoneyInput(editingPaymentAmount);
      const safeDraftAmount =
        parsedEditAmount !== null && parsedEditAmount >= 0
          ? parsedEditAmount
          : 0;
      const editingAmount =
        orderPayments.find((p) => p.id === editingPaymentId)?.amount_gross || 0;
      return totalAmount - (totalPaid - editingAmount + safeDraftAmount);
    }

    const draftNewAmount = parseMoneyInput(newPaymentAmount);
    const safeNewAmount =
      draftNewAmount !== null && draftNewAmount >= 0
        ? draftNewAmount
        : 0;
    return totalAmount - (totalPaid + safeNewAmount);
  }, [
    selectedOrderDetail,
    getOrderPaymentsTotalPaid,
    parseMoneyInput,
    editingPaymentAmount,
    newPaymentAmount,
    editingPaymentId,
    orderPayments,
  ]);

  const handleSaveOrderPayment = useCallback(async () => {
    if (!selectedOrderDetail || !companyId) {
      toast.error(t("orderPanel.errors.missingOrderOrCompany"));
      return;
    }

    setIsSavingOrderPayment(true);
    try {
      const supabase = createClient();

      if (editingPaymentId) {
        if (!editingPaymentAmount.trim()) {
          toast.error(tPos("orders.error.invalidAmount"));
          return;
        }

        const amount = parseMoneyInput(editingPaymentAmount);
        if (amount === null || amount <= 0) {
          toast.error(tPos("orders.error.invalidAmount"));
          return;
        }

        const originalAmount =
          orderPayments.find((p) => p.id === editingPaymentId)?.amount_gross || 0;
        if (Math.abs(originalAmount - amount) < 0.0001) {
          return;
        }

        const { data: updatedPayment, error: updateError } = await supabase
          .from("payment")
          .update({
            amount_gross: amount,
          })
          .eq("id", editingPaymentId)
          .eq("order_id", selectedOrderDetail.id)
          .eq("company_id", companyId)
          .select("id, amount_gross")
          .single();

        if (updateError) {
          toast.error(
            `${tPos("orders.error.paymentFailed")}: ${updateError.message}`,
          );
          return;
        }

        if (!updatedPayment) {
          toast.error(t("orderPanel.errors.updateNotApplied"));
          return;
        }
      } else {
        if (!newPaymentAmount.trim()) {
          toast.error(tPos("orders.error.invalidAmount"));
          return;
        }

        const amount = parseMoneyInput(newPaymentAmount);
        if (amount === null || amount <= 0) {
          toast.error(tPos("orders.error.invalidAmount"));
          return;
        }

        const { error: insertError } = await supabase
          .from("payment")
          .insert({
            order_id: selectedOrderDetail.id,
            company_id: companyId,
            payment_method: newPaymentMethod,
            amount_gross: amount,
            status: "completed",
            payment_status: "completed",
            created_at: new Date().toISOString(),
          } as unknown as {
            order_id: string;
            company_id: string;
            payment_method: string;
            amount_gross: number;
            status: string;
            payment_status: string;
            created_at: string;
          });

        if (insertError) {
          toast.error(
            `${tPos("orders.error.paymentFailed")}: ${insertError.message}`,
          );
          return;
        }
      }

      await loadOrderPayments(selectedOrderDetail.id);

      const supabaseAfter = createClient();
      const { data: refreshedPayments } = await supabaseAfter
        .from("payment")
        .select("amount_gross")
        .eq("order_id", selectedOrderDetail.id);

      const totalPaid = (refreshedPayments || []).reduce(
        (sum, p) => sum + (p.amount_gross || 0),
        0,
      );
      const totalAmount = selectedOrderDetail.total_amount || 0;
      const nextPaymentStatus = totalPaid >= totalAmount ? "paid" : "partial";

      await supabaseAfter
        .from("order")
        .update({
          amount_paid: totalPaid,
          payment_status: nextPaymentStatus,
        })
        .eq("id", selectedOrderDetail.id);

      setSelectedOrderDetail((prev) =>
        prev
          ? {
              ...prev,
              payment_status: nextPaymentStatus,
            }
          : prev,
      );

      resetOrderPaymentForm();
      if (clientEmail.trim()) {
        await fetchClientHistory(clientEmail);
      }
    } catch (error) {
      console.error("Error saving order payment:", error);
      toast.error(tPos("orders.error.paymentFailed"));
    } finally {
      setIsSavingOrderPayment(false);
    }
  }, [
    selectedOrderDetail,
    companyId,
    editingPaymentAmount,
    newPaymentAmount,
    editingPaymentId,
    newPaymentMethod,
    orderPayments,
    t,
    tPos,
    parseMoneyInput,
    loadOrderPayments,
    resetOrderPaymentForm,
    clientEmail,
    fetchClientHistory,
  ]);

  const handleDeleteOrderPayment = useCallback(
    async (paymentId: string) => {
      if (!selectedOrderDetail || !companyId) {
        toast.error(t("orderPanel.errors.missingOrderOrCompany"));
        return;
      }

      setDeletingPaymentId(paymentId);
      try {
        const supabase = createClient();
        const { error: deleteError } = await supabase
          .from("payment")
          .delete()
          .eq("id", paymentId)
          .eq("order_id", selectedOrderDetail.id)
          .eq("company_id", companyId);

        if (deleteError) {
          toast.error(
            `${t("orderPanel.errors.deletePaymentFailed")}: ${deleteError.message}`,
          );
          return;
        }

        await loadOrderPayments(selectedOrderDetail.id);

        const { data: refreshedPayments } = await supabase
          .from("payment")
          .select("amount_gross")
          .eq("order_id", selectedOrderDetail.id);

        const totalPaid = (refreshedPayments || []).reduce(
          (sum, p) => sum + (p.amount_gross || 0),
          0,
        );
        const totalAmount = selectedOrderDetail.total_amount || 0;
        const nextPaymentStatus = totalPaid >= totalAmount ? "paid" : "partial";

        await supabase
          .from("order")
          .update({
            amount_paid: totalPaid,
            payment_status: nextPaymentStatus,
          })
          .eq("id", selectedOrderDetail.id);

        setSelectedOrderDetail((prev) =>
          prev
            ? {
                ...prev,
                payment_status: nextPaymentStatus,
              }
            : prev,
        );

        if (editingPaymentId === paymentId) {
          setEditingPaymentId(null);
          setEditingPaymentAmount("");
        }

        if (clientEmail.trim()) {
          await fetchClientHistory(clientEmail);
        }
      } catch (error) {
        console.error("Error deleting payment:", error);
        toast.error(t("orderPanel.errors.deletePaymentFailed"));
      } finally {
        setDeletingPaymentId(null);
      }
    },
    [
      selectedOrderDetail,
      companyId,
      t,
      loadOrderPayments,
      editingPaymentId,
      clientEmail,
      fetchClientHistory,
    ],
  );

  const handleDeleteOrder = useCallback(async () => {
    if (!selectedOrderDetail || !companyId) {
      toast.error(t("orderPanel.errors.missingOrderOrCompany"));
      return;
    }

    setIsDeletingOrder(true);
    try {
      const supabase = createClient();

      const { error: paymentsDeleteError } = await supabase
        .from("payment")
        .delete()
        .eq("order_id", selectedOrderDetail.id)
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
        .eq("order_id", selectedOrderDetail.id);

      if (orderItemsDeleteError) {
        toast.error(
          `${t("orderPanel.errors.deleteOrderFailed")}: ${orderItemsDeleteError.message}`,
        );
        return;
      }

      const { error: orderDeleteError } = await supabase
        .from("order")
        .delete()
        .eq("id", selectedOrderDetail.id)
        .eq("company_id", companyId);

      if (orderDeleteError) {
        toast.error(
          `${t("orderPanel.errors.deleteOrderFailed")}: ${orderDeleteError.message}`,
        );
        return;
      }

      setOrderPayments([]);
      setSelectedOrderDetail(null);
      setCurrentAppointmentOrder(null);
      setHasOrder(false);
      setRightPanelMode("cart");
      setShowCart(false);
      resetOrderPaymentForm();

      onRefresh?.();
      if (clientEmail.trim()) {
        await fetchClientHistory(clientEmail);
      }
    } catch (error) {
      console.error("Error deleting order:", error);
      toast.error(t("orderPanel.errors.deleteOrderFailed"));
    } finally {
      setIsDeletingOrder(false);
    }
  }, [
    selectedOrderDetail,
    companyId,
    t,
    resetOrderPaymentForm,
    onRefresh,
    clientEmail,
    fetchClientHistory,
    setShowCart,
  ]);

  // Cart management functions
  const removeFromCart = useCallback((index: number) => {
    setCart((prev) => {
      const target = prev[index];
      if (target?.appointmentSegmentId || target?.isAppointmentItem) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const updateQuantity = useCallback(
    (index: number, newQuantity: number) => {
      if (newQuantity <= 0) {
        setCart((prev) => {
          const target = prev[index];
          if (target?.appointmentSegmentId || target?.isAppointmentItem) return prev;
          return prev.filter((_, i) => i !== index);
        });
      } else {
        setCart((prev) =>
          prev.map((item, i) =>
            i === index ? { ...item, quantity: newQuantity } : item,
          ),
        );
      }
    },
    [],
  );

  const updatePrice = useCallback((index: number, newPrice: number) => {
    if (newPrice < 0) return;
    const roundedPrice = Math.round(newPrice * 100) / 100;
    setCart((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, price: roundedPrice } : item,
      ),
    );
  }, []);

  const updateDiscount = useCallback(
    (
      index: number,
      discountValue: number,
      discountType: "percentage" | "fixed",
    ) => {
      setCart((prev) => {
        const item = prev[index];
        if (!item) return prev;

        if (discountType === "percentage") {
          if (discountValue < 0 || discountValue > 100) return prev;
          const roundedDiscount = Math.round(discountValue * 10) / 10;
          return prev.map((item, i) =>
            i === index
              ? {
                  ...item,
                  discountType: "percentage",
                  discountPercentage: roundedDiscount,
                  discountAmount: undefined,
                }
              : item,
          );
        } else {
          // Fixed amount - cannot exceed item price
          const maxDiscount = item.price * item.quantity;
          if (discountValue < 0 || discountValue > maxDiscount) return prev;
          const roundedDiscount = Math.round(discountValue * 100) / 100;
          return prev.map((item, i) =>
            i === index
              ? {
                  ...item,
                  discountType: "fixed",
                  discountAmount: roundedDiscount,
                  discountPercentage: undefined,
                }
              : item,
          );
        }
      });
    },
    [],
  );

  const clearCart = useCallback(() => {
    setCart((prev) =>
      prev.filter((item) => item.appointmentSegmentId || item.isAppointmentItem),
    );
  }, []);

  // Fetch products and treatments for Add Items dialog
  const fetchItems = useCallback(async () => {
    if (!companyId) return;

    setLoadingItems(true);
    try {
      const supabase = createClient();
      const offeredIds = await offeredServiceIdsForLocation(
        asLocationClient(supabase),
        locationId,
      );

      const servicesQuery = supabase
        .from("service")
        .select(
          `
          id,
          name,
          service_variants:service_variant(id, name, price, client_duration_minutes, vat_rate)
        `,
        )
        .eq("is_active", true)
        .eq("is_deleted", false)
        .eq("company_id", companyId);

      const [productsRes, treatmentsRes] = await Promise.all([
        supabase
          .from("product")
          .select(
            "id, name, price_gross, stock_qty, sku, vat_rate, barcode, product_line_id, product_category_id, product_line(id, name), product_category(id, name)",
          )
          .eq("active", true)
          .eq("company_id", companyId)
          .order("name"),
        offeredIds && offeredIds.length === 0
          ? Promise.resolve({ data: [] })
          : offeredIds
            ? servicesQuery.in("id", offeredIds)
            : servicesQuery,
      ]);

      setPosProducts((productsRes.data || []) as AppointmentPickerProduct[]);
      // Transform treatments data to match POSService type
      const transformedTreatments: POSService[] = (
        treatmentsRes.data || []
      ).map(
        (t: {
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
          service_variants?: Array<{
            id: string;
            name: string;
            price: number;
            client_duration_minutes: number;
            vat_rate: number | null;
          }>;
        }) => ({
          id: t.id,
          name: t.name,
          service_variants: (t.service_variants || t.price_options || []).map(
            (option) => ({
              id: option.id,
              name: option.name,
              price: option.price,
              vat_rate: option.vat_rate,
              duration_in_minutes: Number(
                option.client_duration_minutes ??
                  ("duration_in_minutes" in option
                    ? option.duration_in_minutes
                    : 0) ??
                  0,
              ),
            }),
          ),
        }),
      );
      setPosServices(transformedTreatments);
    } catch (error) {
      console.error("Error fetching items:", error);
      toast.error("Failed to load items");
    } finally {
      setLoadingItems(false);
    }
  }, [companyId, locationId]);

  // Add product to cart
  const handleAddProductToCart = useCallback(
    (product: AppointmentPickerProduct) => {
      const grossPrice = Math.round((product.price_gross || 0) * 100) / 100;

      const existingItem = cart.find(
        (item) => item.id === product.id && item.type === "product",
      );

      if (existingItem) {
        const index = cart.findIndex(
          (item) => item.id === product.id && item.type === "product",
        );
        updateQuantity(index, existingItem.quantity + 1);
      } else {
        setCart((prev) => [
          ...prev,
          {
            id: product.id,
            name: product.name || t("sheet.unnamedProduct"),
            price: grossPrice,
            quantity: 1,
            type: "product",
            stockQty: product.stock_qty || 0,
            vatRate: product.vat_rate || 21,
          },
        ]);
      }

    },
    [cart, updateQuantity, t],
  );

  // Add treatment to cart
  const handleAddServiceToCart = useCallback(
    (
      treatment: POSService,
      serviceVariant: {
        id: string;
        name: string;
        price: number;
        vat_rate?: number | null;
      },
    ) => {
      const grossPrice = Math.round((serviceVariant.price || 0) * 100) / 100;

      const existingItem = cart.find(
        (item) => item.serviceVariantId === serviceVariant.id,
      );

      if (existingItem) {
        const index = cart.findIndex(
          (item) => item.serviceVariantId === serviceVariant.id,
        );
        updateQuantity(index, existingItem.quantity + 1);
      } else {
        setCart((prev) => [
          ...prev,
          {
            id: treatment.id,
            name: `${treatment.name} - ${serviceVariant.name}`,
            price: grossPrice,
            quantity: 1,
            type: "service",
            serviceVariantId: serviceVariant.id,
            vatRate: serviceVariant.vat_rate || 21,
            appointmentId: appointmentRecordId || undefined,
          },
        ]);
      }
    },
    [cart, updateQuantity, event?.id],
  );

  // Cart calculation functions
  const getSubtotal = useCallback(() => {
    return calculateSubtotal(cart);
  }, [cart]);

  const getTax = useCallback(() => {
    return calculateTax(cart);
  }, [cart]);

  const getDiscount = useCallback(() => {
    return calculateDiscount(cart);
  }, [cart]);

  const getTotal = useCallback(() => {
    return calculateTotal(cart);
  }, [cart]);

  const cartTotal = getTotal();
  const previousCartTotalRef = useRef<number | null>(null);

  useEffect(() => {
    if (previousCartTotalRef.current === null) {
      previousCartTotalRef.current = cartTotal;
      return;
    }

    const totalChanged =
      Math.abs(previousCartTotalRef.current - cartTotal) > 0.0001;
    previousCartTotalRef.current = cartTotal;
    if (!totalChanged) return;

    setSplitPayments((prev) => {
      if (prev.length !== 1) return prev;
      const current = prev[0];
      if (!current) return prev;
      if (Math.abs((current.amount || 0) - cartTotal) < 0.0001) return prev;
      return [{ ...current, amount: cartTotal }];
    });
  }, [cartTotal]);

  // Payment processing functions
  const handleCompleteSale = useCallback(async () => {
    if (!companyId) {
      toast.error("Company ID not found. Please try refreshing the page.");
      return;
    }

    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    const { splitHasPayLinkAmount: saleHasPayLink } = await import(
      "@/app/[locale]/pos/components/payment-methods"
    );
    if (saleHasPayLink(splitPayments) && !clientEmail.trim()) {
      toast.error("A client email is required to send a pay link.");
      return;
    }

    setProcessing(true);
    try {
      const { createOrderWithPaymentV3 } =
        await import("@/lib/api/pos/mutations/create-order");

      const getItemDiscountAmount = (item: CartItemType): number => {
        const lineBase = (item.price || 0) * (item.quantity || 0);
        if (lineBase <= 0) return 0;

        const discount =
          item.discountType === "percentage"
            ? lineBase * ((item.discountPercentage || 0) / 100)
            : item.discountType === "fixed"
              ? item.discountAmount || 0
              : 0;

        const clamped = Math.min(Math.max(discount, 0), lineBase);
        return Math.round(clamped * 100) / 100;
      };

      // Prepare treatments - use stored gross prices directly
      const treatments = cart
        .filter((item) => item.type === "service")
        .map((item) => ({
          appointment_segment_id: item.appointmentSegmentId,
          service_id: item.id,
          service_variant_id: item.serviceVariantId!,
          quantity: item.quantity,
          unit_price: item.price,
          vat_rate: item.vatRate,
          discount_amount: getItemDiscountAmount(item),
        }));

      // Prepare products - use stored gross prices directly
      const products = cart
        .filter((item) => item.type === "product")
        .map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price,
          vat_rate: item.vatRate,
          discount_amount: getItemDiscountAmount(item),
        }));

      const payments = buildOrderCreatePayments(splitPayments);

      if (payments.length === 0) {
        toast.error("Please add at least one payment amount greater than 0.");
        return;
      }

      if (treatments.length === 0 && products.length === 0) {
        toast.error("Please add at least one treatment or product.");
        return;
      }

      const result = await createOrderWithPaymentV3({
        company_id: companyId,
        ...(locationId ? { location_id: locationId } : {}),
        date: orderDateTime || getDefaultOrderDateTime(),
        appointment_id: appointmentRecordId || undefined,
        treatments: treatments.length > 0 ? treatments : undefined,
        products: products.length > 0 ? products : undefined,
        payments,
        currency: "eur",
      });

      if (result.success && result.data) {
        setOrderResult(result);
        // Update hasOrder status if order was created for this appointment
        if (appointmentRecordId) {
          setHasOrder(true);
        }
        const { resolveCardSaleFollowup } = await import(
          "@/lib/api/pos/card-checkout"
        );
        const {
          splitHasPayLinkAmount,
          splitHasTerminalAmount,
          splitPayLinkAmount,
        } = await import("@/app/[locale]/pos/components/payment-methods");
        const {
          buildPayLinkReturnUrls,
          createPaymentCheckout,
          isClientEmailRequiredError,
          readClientEmail,
        } = await import("@/lib/api/pos/mutations/payment-create-checkout");

        const email = readClientEmail(clientEmail);
        if (splitHasPayLinkAmount(splitPayments)) {
          if (!email) {
            toast.error("A client email is required to send a pay link.");
            return;
          }
          const locale = window.location.pathname.split("/").filter(Boolean)[0] || "nl";
          const urls = buildPayLinkReturnUrls(window.location.origin, locale);
          const checkout = await createPaymentCheckout({
            company_id: companyId,
            order_id: result.data.order_id,
            success_url: urls.success_url,
            cancel_url: urls.cancel_url,
            amount: splitPayLinkAmount(splitPayments),
            client_email: email,
            ...(locationId ? { location_id: locationId } : {}),
          });
          if (isClientEmailRequiredError(checkout)) {
            toast.error("A client email is required to send a pay link.");
            return;
          }
          if (!checkout.success) {
            toast.error(
              checkout.message || checkout.error || "Could not send the pay link.",
            );
            return;
          }
        }

        const followup = resolveCardSaleFollowup({
          requestedTerminal: splitHasTerminalAmount(splitPayments),
          data: result.data,
        });

        if (followup.kind === "terminal") {
          setPendingCardIntentIds(followup.intentIds);
          setShowProcessButton(true);
          return;
        }

        clearCart();
        setOrderResult(null);
        setPendingCardIntentIds([]);
        if (onRefresh) onRefresh();
        onClose();
      } else {
        toast.error(
          `Error creating order: ${result.error}${
            result.message ? ` - ${result.message}` : ""
          }`,
        );
      }
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("Failed to create order. Please try again.");
    } finally {
      setProcessing(false);
    }
  }, [
    cart,
    companyId,
    event?.id,
    orderDateTime,
    splitPayments,
    clientEmail,
    locationId,
    clearCart,
    onRefresh,
    onClose,
    setOrderResult,
  ]);

  const handleProcessPayment = useCallback(async () => {
    if (!orderResult?.data?.order_id) {
      toast.error("Missing order ID");
      return;
    }

    if (pendingCardIntentIds.length === 0) {
      setShowProcessButton(false);
      return;
    }

    setProcessing(true);
    try {
      const { processPayment } =
        await import("@/lib/api/pos/mutations/create-order");

      if (!companyReaderId) {
        toast.error("No terminal reader configured for this company.");
        return;
      }

      const failedIntentIds: string[] = [];

      for (const paymentIntentId of pendingCardIntentIds) {
        const result = await processPayment(companyReaderId, paymentIntentId);

        if (!result.success) {
          failedIntentIds.push(paymentIntentId);
          continue;
        }

        const readerData = result.data as { id?: string } | undefined;
        if (readerData?.id) {
          setReaderId(readerData.id);
        } else {
          setReaderId(companyReaderId);
        }
      }

      setPendingCardIntentIds(failedIntentIds);

      if (failedIntentIds.length > 0) {
        setShowProcessButton(true);
        toast.error(
          `${failedIntentIds.length} card payment(s) failed to start. Please retry processing.`,
        );
        return;
      }

      clearCart();
      setShowProcessButton(false);
      setShowSimulateButton(false);
      setOrderResult(null);
      setPendingCardIntentIds([]);
      if (onRefresh) onRefresh();
      onClose();
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error("Failed to process payment. Please try again.");
    } finally {
      setProcessing(false);
    }
  }, [
    orderResult,
    pendingCardIntentIds,
    companyReaderId,
    clearCart,
    onRefresh,
    onClose,
    setShowSimulateButton,
    setReaderId,
    setShowProcessButton,
    setOrderResult,
  ]);

  const handleSimulatePayment = useCallback(async () => {
    if (!readerId || pendingCardIntentIds.length === 0) {
      toast.error("Reader ID not found");
      return;
    }

    if (!companyId) {
      toast.error("Company ID not found. Please try refreshing the page.");
      return;
    }

    const cardNumber = prompt(
      "Enter test card number (e.g., 4242424242424242):",
    );
    if (!cardNumber) {
      return;
    }

    setProcessing(true);
    try {
      const { simulatePayment } =
        await import("@/lib/api/pos/mutations/create-order");

      const result = await simulatePayment(
        companyId,
        readerId,
        pendingCardIntentIds[0]!,
        cardNumber,
      );

      if (result.success) {
        // Update hasOrder status
        if (appointmentRecordId) {
          setHasOrder(true);
        }
        clearCart();
        setShowProcessButton(false);
        setShowSimulateButton(false);
        setReaderId("");
        setOrderResult(null);
        setPendingCardIntentIds([]);
        if (onRefresh) onRefresh();
        onClose();
      } else {
        let errorMessage = "Payment simulation failed. Please try again.";
        if (result.code) {
          errorMessage = `Error: ${result.code}${
            result.message ? ` - ${result.message}` : ""
          }`;
        } else if (result.message) {
          errorMessage = result.message;
        }
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Error simulating payment:", error);
      toast.error("Failed to simulate payment. Please try again.");
    } finally {
      setProcessing(false);
    }
  }, [
    readerId,
    pendingCardIntentIds,
    companyId,
    event?.id,
    clearCart,
    onRefresh,
    onClose,
    setShowProcessButton,
    setShowSimulateButton,
    setReaderId,
    setOrderResult,
  ]);

  const resetForm = () => {
    setStartDate(new Date());
    setEndDate(new Date());
    setStartTime(`${DefaultStartHour}:00`);
    setEndTime("");
    setError(null);
    setSelectedStaffId("");
    setAppointmentServices([
      {
        id: `new-${Date.now()}-0`,
        serviceId: "",
        serviceVariantId: "",
        staffId: "",
        service: null as unknown as Service,
        serviceVariant: null as unknown as ServiceVariant,
      },
    ]);
    setEditingIndex(0);
    setClientEmail("");
    setClientFirstName("");
    setClientLastName("");
    setClientPhone("");
    setNotes("");
    setStaffNotes("");
    setStaffImagePath(null);
    setClientImagePath(null);
    setIsLoading(false);
    // Clear any uploaded files
    if (files.length > 0) {
      removeFile(files[0].id);
    }
    setLastSaveTime(0);
    setLastFormData("");

    // Reset client search states
    clientSearch.clear();

    // Reset history states
    setClientHistory(null);
    setIsLoadingHistory(false);

    // Reset cart states
    setCart([]);
    setShowCart(false);
    setRightPanelMode("cart");
    setSelectedOrderDetail(null);
    setCurrentAppointmentOrder(null);
    setOrderPayments([]);
    setEditingPaymentId(null);
    setEditingPaymentAmount("");

    // Reset appointment POS / product picker state (prevent leakage on reopen)
    setShowAddItemsDialog(false);
    setSelectedItemCategory("products");
    setSelectedServiceNav(null);
    setLoadingItems(false);
    setPosProducts([]);
    setPosServices([]);
  };

  // Update current treatment with selected values.
  // If the visit staff cannot perform the new catalog selection, clear them
  // instead of toasting — the Personeel field stays visible so they can re-pick.
  const updateCurrentTreatment = (
    serviceId?: string,
    serviceVariantId?: string,
  ) => {
    const current = appointmentServices[editingIndex];
    const newTreatmentId = serviceId ?? current?.serviceId ?? "";
    const newPriceOptionId = serviceVariantId ?? current?.serviceVariantId ?? "";
    const nextStaffId = staffIdIfEligible(
      selectedStaffId || current?.staffId || "",
      eligibleStaffFor(
        staffList,
        newTreatmentId,
        newPriceOptionId,
        staffServiceLinks,
        staffServiceVariantLinks,
      ),
    );

    if (nextStaffId !== selectedStaffId) {
      setSelectedStaffId(nextStaffId);
    }

    setAppointmentServices((prev) => {
      const updated = [...prev];
      const row = updated[editingIndex] || {
        id: `treatment-${editingIndex}`,
        serviceId: "",
        serviceVariantId: "",
        staffId: nextStaffId,
        service: null as unknown as Service,
        serviceVariant: null as unknown as ServiceVariant,
      };

      const treatment = newTreatmentId
        ? services.find((t) => t.id === newTreatmentId)
        : null;
      const serviceVariant =
        treatment && newPriceOptionId
          ? treatment.service_variant?.find((p) => p.id === newPriceOptionId)
          : null;

      const nextRow: SelectedService = {
        id: row.id,
        serviceId: newTreatmentId,
        serviceVariantId: newPriceOptionId,
        staffId: nextStaffId,
        service: treatment || (null as unknown as Service),
        serviceVariant: serviceVariant || (null as unknown as ServiceVariant),
      };

      const withVisitStaff = updated.map((item, index) =>
        index === editingIndex ? nextRow : { ...item, staffId: nextStaffId },
      );

      calculateEndTime(withVisitStaff);

      return withVisitStaff;
    });
  };

  // Calculate end time based on selected treatments
  const calculateEndTime = useCallback(
    (segments: SelectedService[]) => {
      const validServices = segments.filter(
        (t) => t.serviceId && t.serviceVariantId && t.serviceVariant,
      );

      if (validServices.length === 0) {
        // If no valid treatments, leave end time empty
        setEndTime("");
        return;
      }

      // Calculate total duration in minutes
      const totalDuration = validServices.reduce(
        (sum, t) => sum + (t.serviceVariant?.duration_in_minutes || 0),
        0,
      );

      // Parse start time
      const [startHours, startMinutes] = startTime.split(":").map(Number);
      const startDateTime = new Date(startDate);
      startDateTime.setHours(startHours, startMinutes, 0, 0);

      // Add total duration
      const endDate = new Date(startDateTime.getTime() + totalDuration * 60000);

      // Format end time
      const endHours = endDate.getHours().toString().padStart(2, "0");
      const endMinutes = endDate.getMinutes().toString().padStart(2, "0");
      setEndTime(`${endHours}:${endMinutes}`);

      // Also update the end date if the treatment spans multiple days
      setEndDate(endDate);
    },
    [startTime, startDate],
  );

  // Add a new treatment slot
  const addNewTreatment = () => {
    const newIndex = appointmentServices.length;
    setAppointmentServices((prev) => {
      const updated = [
        ...prev,
        {
          id: `new-${Date.now()}-${newIndex}`,
          serviceId: "",
          serviceVariantId: "",
          staffId: selectedStaffId,
          service: null as unknown as Service,
          serviceVariant: null as unknown as ServiceVariant,
        },
      ];
      // Recalculate end time with new treatment
      calculateEndTime(updated);
      return updated;
    });
    setEditingIndex(newIndex);
  };

  // Remove a treatment
  const removeTreatment = (index: number) => {
    if (appointmentServices.length <= 1) return; // Keep at least one

    setAppointmentServices((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      // Recalculate end time after removing treatment
      calculateEndTime(updated);
      return updated;
    });

    // Adjust editing index if needed
    if (editingIndex >= appointmentServices.length - 1) {
      setEditingIndex(Math.max(0, appointmentServices.length - 2));
    }
  };

  // Set which treatment is being edited
  const setEditingTreatment = (index: number) => {
    setEditingIndex(index);
  };

  // Handle client selection
  const selectClient = async (client: ClientSearchResult) => {
    setClientEmail(client.email);
    setClientFirstName(client.first_name || "");
    setClientLastName(client.last_name || "");
    clientSearch.setSearchTerm(client.email);
    clientSearch.setShowDropdown(false);
    clientSearch.setResults([]);

    // Fetch client phone number
    try {
      const supabase = createClient();
      const { data: clientData } = await supabase
        .from("client")
        .select("phone")
        .eq("id", client.id)
        .single();

      if (clientData?.phone) {
        setClientPhone(clientData.phone);
      }
    } catch (error) {
      console.error("Error fetching client phone:", error);
    }
  };

  // Helper function to ensure time strings are properly formatted
  const formatTimeString = (timeString: string): string => {
    const [hours, minutes] = timeString.split(":");
    return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
  };

  // Validation function to ensure time format is correct
  const validateTimeFormat = (timeString: string): boolean => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(timeString);
  };

  // Copy to clipboard function
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleSave = async () => {
    // Validate that all treatments have both treatment and price option selected
    const validServices = appointmentServices.filter(
      (t) => t.serviceId && t.serviceVariantId && t.service && t.serviceVariant,
    );

    const missingStaff = validServices.some(
      (t) => !(t.staffId || selectedStaffId),
    );

    if (validServices.length === 0 || missingStaff) {
      setError(t("error.missingFields"));
      return;
    }

    // Prevent rapid successive saves (debounce)
    const now = Date.now();
    if (now - lastSaveTime < 2000) {
      // 2 second debounce
      console.warn("Save attempt blocked by debounce");
      toast.error("Please wait before saving again.");
      return;
    }
    setLastSaveTime(now);

    // Check if form data has actually changed
    const currentFormData = JSON.stringify({
      selectedStaffId,
      selectedServiceId,
      selectedServiceVariantId,
      clientEmail,
      notes,
      staffNotes,
      startDate: startDate.toISOString(),
      startTime,
      endTime,
    });

    if (currentFormData === lastFormData && appointmentRecordId) {
      console.warn("Form data unchanged, skipping save");
      return;
    }
    setLastFormData(currentFormData);

    // Clear previous errors and set loading
    setError(null);
    setIsLoading(true);

    // Calculate endTime if it's empty but we have valid treatments
    let finalEndTime = endTime;
    if (!finalEndTime && validServices.length > 0) {
      // Calculate end time from treatments
      const totalDuration = validServices.reduce(
        (sum, t) => sum + (t.serviceVariant?.duration_in_minutes || 0),
        0,
      );
      const [startHours, startMinutes] = startTime.split(":").map(Number);
      const startDateTime = new Date(startDate);
      startDateTime.setHours(startHours, startMinutes, 0, 0);
      const calculatedEndDate = new Date(
        startDateTime.getTime() + totalDuration * 60000,
      );
      const endHours = calculatedEndDate.getHours().toString().padStart(2, "0");
      const endMinutes = calculatedEndDate
        .getMinutes()
        .toString()
        .padStart(2, "0");
      finalEndTime = `${endHours}:${endMinutes}`;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Validate time format
    if (
      !validateTimeFormat(startTime) ||
      (finalEndTime && !validateTimeFormat(finalEndTime))
    ) {
      setError(t("error.timeError", { start: 0, end: 23 }));
      setIsLoading(false);
      return;
    }

    if (!finalEndTime) {
      setError("End time is required");
      setIsLoading(false);
      return;
    }

    const [startHours = 0, startMinutes = 0] = startTime.split(":").map(Number);
    const [endHours = 0, endMinutes = 0] = finalEndTime.split(":").map(Number);

    if (startHours < 0 || startHours > 23 || endHours < 0 || endHours > 23) {
      setError(t("error.timeError", { start: 0, end: 23 }));
      setIsLoading(false);
      return;
    }

    start.setHours(startHours, startMinutes, 0);
    end.setHours(endHours, endMinutes, 0);

    // Validate that end date is not before start date
    if (isBefore(end, start)) {
      setError(t("error.dateError"));
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const firstName = clientFirstName.trim() || "";
      const lastName = clientLastName.trim() || "";
      const email = clientEmail.trim() || "";

      if (!companyId) {
        toast.error(t("error.companyIdNotFound"));
        setIsLoading(false);
        return;
      }

      const visitStaffId =
        validServices[0].staffId || selectedStaffId;
      const totalPrice = validServices.reduce(
        (sum, t) => sum + t.serviceVariant.price,
        0,
      );
      const segments = validServices.map((segment) => ({
        serviceId: segment.serviceId,
        serviceVariantId: segment.serviceVariantId,
        staffId: segment.staffId || selectedStaffId,
        price: segment.serviceVariant.price,
        clientDurationMinutes: segment.serviceVariant.duration_in_minutes,
        staffDurationMinutes: segment.serviceVariant.actual_duration_in_minutes,
      }));

      const { data: saved, error: saveError } = appointmentRecordId
        ? await saveStaffAppointment({
            appointmentId: appointmentRecordId,
            companyId,
            locationId: locationId || event?.locationId || null,
            client: {
              id: event?.client?.id,
              email,
              firstName,
              lastName,
              phone: clientPhone,
            },
            start,
            notes,
            staffNotes,
            staffImagePath,
            segments,
          })
        : await createStaffAppointment({
            start,
            staffId: visitStaffId,
            companyId,
            locationId: locationId || event?.locationId || undefined,
            services: segments.map((segment) => ({
              serviceId: segment.serviceId,
              serviceVariantId: segment.serviceVariantId,
              staffId: segment.staffId,
            })),
            price: totalPrice,
            firstName,
            lastName,
            email,
            notes,
            staffNotes,
            imageData:
              files[0]?.file && files[0].file instanceof File
                ? await fileToImageData(files[0].file)
                : null,
          });

      if (saveError || !saved) {
        console.error("Error saving appointment:", saveError);
        toast.error(saveError || t("error.createFailed"));
        setIsLoading(false);
        return;
      }

      if (
        appointmentRecordId &&
        files[0]?.file &&
        files[0].file instanceof File &&
        saved.id
      ) {
        try {
          const fileExtension =
            files[0].file.name.split(".").pop()?.toLowerCase() || "jpg";
          const imagePath = `${companyId}/appointments/${saved.id}.${fileExtension}`;
          const { error: uploadError } = await supabase.storage
            .from("company")
            .upload(imagePath, files[0].file, {
              cacheControl: "3600",
              upsert: true,
            });
          if (uploadError) {
            console.error("Error uploading image:", uploadError);
            toast.error(t("error.resultImageUploadFailed"));
          } else {
            await supabase
              .from("appointment")
              .update({ staff_image_path: imagePath })
              .eq("id", saved.id);
          }
        } catch (uploadError) {
          console.error("Error during image upload:", uploadError);
          toast.error("Result image upload failed");
        }
      }

      const startDateString = saved.start;
      const endDateString = saved.end;

      // Create timezone-naive Date objects for the calendar
      const calendarStartDate = new Date(startDateString);
      const calendarEndDate = new Date(endDateString);

      // Create/update event object
      const primaryTreatment = validServices[0];
      const visitStaff = staffList.find((s) => s.id === visitStaffId);
      const treatmentNames = validServices
        .map((t) => t.service.name)
        .join(", ");

      const updatedEvent: CalendarEvent = {
        id: saved.id,
        appointmentId: saved.id,
        locationId: locationId || event?.locationId || null,
        title: `${treatmentNames}`,
        description: `Client: ${[firstName, lastName].filter(Boolean).join(" ") || "-"}\nTreatment${
          validServices.length > 1 ? "s" : ""
        }: ${treatmentNames}\nTotal Price: €${totalPrice}${
          notes ? `\nNotes: ${notes}` : ""
        }${staffNotes ? `\nStaff Notes: ${staffNotes}` : ""}`,
        staff_notes: staffNotes || null,
        start: calendarStartDate,
        end: calendarEndDate,
        color: "blue",
        location: visitStaff?.first_name || t("form.staff"),
        serviceId: primaryTreatment.serviceId,
        serviceIds: validServices.map((t) => t.serviceId),
        staff: {
          id: visitStaffId,
          first_name: visitStaff?.first_name || "",
          last_name: visitStaff?.last_name || "",
        },
        client: {
          id: saved.clientId || event?.client?.id || "",
          email: email,
          first_name: firstName,
          last_name: lastName,
        },
        service: {
          id: primaryTreatment.serviceId,
          name: primaryTreatment.service.name,
          serviceVariant: {
            id: primaryTreatment.serviceVariantId,
            name: primaryTreatment.serviceVariant.name,
            price: primaryTreatment.serviceVariant.price,
            durationInMinutes: primaryTreatment.serviceVariant.duration_in_minutes,
          },
        },
        services: validServices.map((t) => ({
          id: t.serviceId,
          name: t.service.name,
          staffId: t.staffId || selectedStaffId,
          serviceVariant: {
            id: t.serviceVariantId,
            name: t.serviceVariant.name,
            price: t.serviceVariant.price,
            durationInMinutes: t.serviceVariant.duration_in_minutes,
          },
        })),
      };

      // Call onSave with the updated event data
      onSave(updatedEvent);

      // Refresh calendar data to show the updated appointment
      if (onRefresh) {
        onRefresh();
      }

      // Close the sheet immediately on success
      setIsLoading(false);
      handleClose();
    } catch (error) {
      console.error("Error saving appointment:", error);
      toast.error(t("error.createFailed"));
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!appointmentRecordId) {
      toast.error(t("error.deleteFailed"));
      return;
    }
    if (!companyId) {
      toast.error(t("error.companyIdNotFound"));
      return;
    }

    try {
      setIsLoading(true);

      const { error } = await cancelStaffAppointment({
        appointmentId: appointmentRecordId,
        companyId,
        clientId: event?.client?.id,
        locationId: locationId || event?.locationId || null,
      });

      if (error) {
        console.error("Error canceling appointment:", error);
        toast.error(t("error.deleteFailed"));
        setIsLoading(false);
        return;
      }

      toast.success(t("success.cancelled"));
      onDelete(appointmentRecordId);

      if (onRefresh) {
        onRefresh();
      }

      setIsLoading(false);
      handleClose();
    } catch (error) {
      console.error("Error canceling appointment:", error);
      toast.error(t("error.deleteFailed"));
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setPosSession(null);
    resetForm();
    onClose();
  };

  // Fetch staff and treatments when sheet opens
  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();

      let staffQuery = supabase
        .from("staff")
        .select("id, first_name, last_name");
      let skipStaffQuery = false;
      if (locationId) {
        const scopedIds = staffIdsForLocationScope(
          await resolveLocationScopeIds(
            () => fetchStaffIdsForLocation(asLocationClient(supabase), locationId),
            "appointment staff location scope",
          ),
          multiLocationEnabled,
        );
        if (scopedIds) {
          if (scopedIds.length === 0) {
            setStaffList([]);
            skipStaffQuery = true;
          } else {
            staffQuery = staffQuery.in("id", scopedIds);
          }
        }
      }
      if (!skipStaffQuery) {
        const { data: staff, error: staffError } = await staffQuery;
        if (!staffError && staff) {
          setStaffList(staff);
        }
      }

      const [{ data: serviceLinks }, { data: variantLinks }] = await Promise.all([
        withLocationId(
          supabase.from("staff_service").select("staff_id, service_id"),
          locationId,
        ),
        withLocationId(
          supabase
            .from("staff_service_variant")
            .select("staff_id, service_variant_id"),
          locationId,
        ),
      ]);
      setStaffServiceLinks((serviceLinks || []) as StaffServiceLink[]);
      setStaffServiceVariantLinks(
        (variantLinks || []) as StaffServiceVariantLink[],
      );

      let servicesQuery = supabase
        .from("service")
        .select(
          `
          id,
          name,
          description,
          company_id,
          service_variant (
            id,
            name,
            price,
            client_duration_minutes,
            staff_duration_minutes
          )
        `,
        )
        .eq("is_active", true)
        .eq("is_deleted", false)
        .order("name");

      if (locationId) {
        const offeredIds = await resolveLocationScopeIds(
          () =>
            fetchServiceIdsForLocation(asLocationClient(supabase), locationId),
          "appointment service location scope",
        );
        if (offeredIds) {
          if (offeredIds.length === 0) {
            setServices([]);
            return;
          }
          servicesQuery = servicesQuery.in("id", offeredIds);
        }
      }

      const { data: treatmentsData, error: treatmentsError } = await servicesQuery;

      if (!treatmentsError && treatmentsData) {
        setServices(
          treatmentsData.map((service) => ({
            ...service,
            service_variant: (service.service_variant || []).map((option) => ({
              id: option.id,
              name: option.name,
              price: Number(option.price),
              duration_in_minutes: Number(option.client_duration_minutes),
              actual_duration_in_minutes: option.staff_duration_minutes,
            })),
          })),
        );
      }
    }
    if (isOpen) {
      void fetchData();
    }
  }, [isOpen, locationId, multiLocationEnabled]);

  // Recalculate end time when start time or services change in the editor.
  // View mode keeps the stored visit window (do not add catalog minutes onto
  // the clicked segment's start — that produced 10:45–13:45 on multi-segment).
  useEffect(() => {
    if (appointmentRecordId && !isEditMode) return;
    if (appointmentServices.length > 0) {
      calculateEndTime(appointmentServices);
    }
  }, [
    startTime,
    calculateEndTime,
    appointmentServices,
    appointmentRecordId,
    isEditMode,
  ]);

  // Set selected staff and treatment when event changes
  useEffect(() => {
    if (event) {
      // Handle multiple treatments if available
      if (event.services && event.services.length > 0) {
        const loadedTreatments: SelectedService[] = [];

        event.services.forEach((eventTreatment, index) => {
          const treatment = services.find((t) => t.id === eventTreatment.id);
          const serviceVariant = treatment?.service_variant?.find(
            (p) => p.id === eventTreatment.serviceVariant?.id,
          );

          if (treatment && serviceVariant && eventTreatment.serviceVariant) {
            loadedTreatments.push({
              id: `existing-${eventTreatment.id}-${eventTreatment.serviceVariant.id}-${index}`,
              serviceId: eventTreatment.id,
              serviceVariantId: eventTreatment.serviceVariant.id,
              staffId: eventTreatment.staffId || event.staff?.id || "",
              service: treatment,
              serviceVariant,
            });
          }
        });

        setAppointmentServices(loadedTreatments);
        setEditingIndex(0); // Edit the first treatment by default
      } else if (event.serviceId) {
        // Fallback to single treatment for backward compatibility
        const treatment = services.find((t) => t.id === event.serviceId);
        const serviceVariant = treatment?.service_variant?.find(
          (p) => p.id === event.service?.serviceVariant?.id,
        );

        if (treatment && serviceVariant) {
          setAppointmentServices([
            {
              id: `existing-${event.serviceId}`,
              serviceId: event.serviceId,
              serviceVariantId: event.service!.serviceVariant!.id,
              staffId: event.staff?.id || "",
              service: treatment,
              serviceVariant,
            },
          ]);
        }
        setEditingIndex(0);
      }

      // Set staff if available
      if (event.staff?.id) {
        setSelectedStaffId(event.staff.id);
      }

      // Set client email if available
      if (event.client?.email) {
        setClientEmail(event.client.email);
        clientSearch.setSearchTerm(event.client.email);
      }

      // Set client names if available
      if (event.client?.first_name) {
        setClientFirstName(event.client.first_name);
      }
      if (event.client?.last_name) {
        setClientLastName(event.client.last_name);
      }

      // Fetch client phone number if client ID is available
      if (event.client?.id) {
        const fetchClientPhone = async () => {
          try {
            const supabase = createClient();
            const { data } = await supabase
              .from("client")
              .select("phone")
              .eq("id", event.client!.id)
              .single();

            if (data?.phone) {
              setClientPhone(data.phone);
            }
          } catch (error: unknown) {
            console.error("Error fetching client phone:", error);
          }
        };
        fetchClientPhone();
      }

      // Fetch notes, staff_notes, staff_image_path, and image_path directly from database if event has an ID
      if (appointmentRecordId) {
        const fetchAppointmentData = async () => {
          try {
            const supabase = createClient();
            const { data } = await supabase
              .from("appointment")
              .select("notes, staff_notes, staff_image_path, image_path")
              .eq("id", appointmentRecordId)
              .single();

            if (data) {
              setNotes(data.notes || "");
              setStaffNotes(data.staff_notes || "");
              setStaffImagePath(data.staff_image_path || null);
              setClientImagePath(data.image_path || null);
            }
          } catch (error) {
            console.error("Error fetching appointment data:", error);
            // Fallback to event data if database fetch fails
            const eventData = event as CalendarEvent & {
              notes?: string | null;
              staff_notes?: string | null;
              staff_image_path?: string | null;
              image_path?: string | null;
            };
            if (eventData.notes) {
              setNotes(eventData.notes);
            }
            if (eventData.staff_notes) {
              setStaffNotes(eventData.staff_notes);
            }
            if (eventData.staff_image_path) {
              setStaffImagePath(eventData.staff_image_path);
            }
            if (eventData.image_path) {
              setClientImagePath(eventData.image_path);
            }
          }
        };
        fetchAppointmentData();
      } else {
        // For new appointments, clear all
        setNotes("");
        setStaffNotes("");
        setStaffImagePath(null);
        setClientImagePath(null);
        // Clear any uploaded files
        if (files.length > 0) {
          removeFile(files[0].id);
        }
      }
    }
  }, [event, services]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "[&>button:first-of-type]:hidden",
          isMobile
            ? "h-[90vh] max-h-[90vh] rounded-t-xl border-t-2 border-t-gray-200 bg-white/95 backdrop-blur-sm w-full"
            : "sm:top-4 sm:bottom-4 sm:right-4 sm:h-auto sm:max-h-[calc(100vh-2rem)] sm:rounded-2xl sm:border sm:border-border sm:overflow-hidden transition-all duration-300 ease-out",
          isMobile
            ? "w-full max-w-full"
            : posSession
              ? "w-[864px] sm:max-w-[864px]"
              : "w-full sm:w-[480px] sm:max-w-[480px]",
          "!gap-0 !p-0",
        )}
      >
        {/* Dual Panel Container */}
        <div className="flex h-full min-h-0 overflow-hidden bg-white">
          {/* Appointment Details Panel */}
          <div
            className={cn(
              "flex flex-col h-full min-h-0 overflow-hidden bg-white flex-shrink-0",
              isMobile ? "w-full" : "w-full sm:w-[480px]",
            )}
          >
            <div className="border-b-1">
              {isMobile && (
                <div className="flex justify-center pt-3 pb-2">
                  <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
                </div>
              )}
              <SheetHeader>
                <div className="flex justify-between items-center w-full p-2 pb-3">
                  <SheetTitle className="text-xl font-semibold text-gray-900">
                    {appointmentRecordId && !isEditMode
                      ? t("sheet.titleDetails")
                      : appointmentRecordId
                        ? t("edit")
                        : t("create")}
                  </SheetTitle>

                  <div className="flex items-center gap-2">
                    {appointmentRecordId && !isEditMode && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            if (posSession) {
                              setPosSession(null);
                              return;
                            }

                            if (!orderStatus.hasOrder) {
                              const treatments = mapAppointmentSegmentsToInput(
                                appointmentServices
                                  .filter(
                                    (tr) =>
                                      tr.serviceId &&
                                      tr.serviceVariantId &&
                                      tr.service &&
                                      tr.serviceVariant,
                                  )
                                  .map((tr) => ({
                                    serviceId: tr.serviceId,
                                    service: {
                                      id: tr.service.id,
                                      name: tr.service.name,
                                    },
                                    serviceVariant: {
                                      id: tr.serviceVariant.id,
                                      name: tr.serviceVariant.name,
                                      price: tr.serviceVariant.price,
                                      vat_rate: tr.serviceVariant.vat_rate,
                                    },
                                  })),
                              );
                              setPosSession({ mode: "checkout", services: treatments });
                              return;
                            }

                            if (orderStatus.currentAppointmentOrder) {
                              setPosSession({
                                mode: "order",
                                order: orderStatus.currentAppointmentOrder,
                              });
                              return;
                            }

                            const fetched = await orderStatus.fetchOrderForAppointment(
                              appointmentRecordId,
                            );
                            if (fetched) {
                              setPosSession({ mode: "order", order: fetched });
                            } else {
                              toast.error(t("orderPanel.errors.orderNotFound"));
                            }
                          }}
                          className={cn(
                            "h-8 w-8",
                            orderStatus.hasOrder &&
                              orderStatus.currentAppointmentOrder?.payment_status ===
                                "paid"
                              ? "text-green-600 hover:text-green-700 hover:bg-green-100"
                              : orderStatus.hasOrder
                                ? "text-yellow-600 hover:text-yellow-700 hover:bg-yellow-100"
                                : "text-gray-500 hover:text-gray-900 hover:bg-gray-100",
                          )}
                          aria-label={t("sheet.actions.viewCart")}
                          title={
                            orderStatus.hasOrder
                              ? t("orderPanel.actions.openOrder")
                              : t("orderPanel.actions.viewOrderItems")
                          }
                        >
                          <RiCashLine size={18} />
                        </Button>
                        {orderStatus.hasOrder && (
                          <span
                            className={cn(
                              "text-xs font-medium",
                              orderStatus.currentAppointmentOrder?.payment_status ===
                                "paid"
                                ? "text-green-600"
                                : "text-yellow-600",
                            )}
                          >
                            {orderStatus.currentAppointmentOrder?.payment_status ===
                            "paid"
                              ? tPos("orders.statusLabels.paid")
                              : tPos("orders.statusLabels.partial")}
                          </span>
                        )}
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleClose}
                      className="h-8 w-8 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                      aria-label="Close"
                    >
                      <RiCloseLargeLine size={18} />
                    </Button>
                  </div>
                </div>
              </SheetHeader>
            </div>

            {error && (
              <div className="bg-destructive/15 text-destructive rounded-md px-3 py-2 text-sm mx-4">
                {error}
              </div>
            )}

            <div
              className={cn(
                "flex-1 overflow-y-auto min-h-0",
                isMobile ? "px-4" : "px-6",
              )}
            >
              {appointmentRecordId && !isEditMode ? (
                // Summary/View Mode - Clean Layout
                <div className={cn("space-y-8", isMobile ? "py-4" : "py-6")}>
                  {/* Client Info */}
                  <div className="flex items-start gap-4">
                    {/* Avatar with initials */}
                    <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-semibold text-lg flex-shrink-0">
                      {clientFirstName?.[0]?.toUpperCase() || ""}
                      {clientLastName?.[0]?.toUpperCase() || ""}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        {clientFirstName} {clientLastName}
                      </h4>
                      {/* Phone and Email on same line with separator */}
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        {clientPhone && (
                          <>
                            <RiPhoneLine size={16} className="text-gray-400" />
                            <span
                              onClick={() =>
                                copyToClipboard(clientPhone)
                              }
                              className="cursor-pointer hover:text-gray-900 transition-colors"
                              title={t("sheet.actions.clickToCopy")}
                            >
                              {clientPhone}
                            </span>
                          </>
                        )}
                        {clientPhone && clientEmail && (
                          <span className="text-gray-400">•</span>
                        )}
                        {clientEmail && (
                          <>
                            <RiMailLine size={16} className="text-gray-400" />
                            <span
                              onClick={() =>
                                copyToClipboard(clientEmail)
                              }
                              className="cursor-pointer hover:text-gray-900 transition-colors truncate"
                              title={t("sheet.actions.clickToCopy")}
                            >
                              {clientEmail}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Treatment */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-2 block">
                      {t("sheet.treatment")}
                    </label>
                    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                      <div className="text-sm text-gray-700 leading-relaxed space-y-2">
                        {appointmentServices.length > 0 ? (
                          appointmentServices.map((treatment) => (
                            <div key={treatment.id}>
                              <span className="font-medium">
                                {treatment.service?.name ||
                                  t("sheet.noTreatment")}
                              </span>
                              {treatment.serviceVariant && (
                                <span className="text-gray-600 ml-2">
                                  ({treatment.serviceVariant.name} - €
                                  {treatment.serviceVariant.price},{" "}
                                  {treatment.serviceVariant.duration_in_minutes}{" "}
                                  min)
                                </span>
                              )}
                              {treatment.staffId && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {staffList.find((s) => s.id === treatment.staffId)
                                    ?.first_name || ""}{" "}
                                  {staffList.find((s) => s.id === treatment.staffId)
                                    ?.last_name || ""}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <span className="text-gray-500">
                            {t("sheet.noServicesSelected")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Booking Information */}
                  <div className="space-y-4">
                    {/* Date & Time */}
                    <div className="flex items-start gap-3">
                      <RiCalendarLine
                        size={18}
                        className="text-gray-400 mt-0.5 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
                          {startDate?.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {startTime} - {endTime}
                        </p>
                      </div>
                    </div>

                    {/* Staff */}
                    {selectedStaffId && (
                      <div className="flex items-start gap-3">
                        <RiUserLine
                          size={18}
                          className="text-gray-400 mt-0.5 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">
                            {staffList.find((s) => s.id === selectedStaffId)
                              ?.first_name || ""}{" "}
                            {staffList.find((s) => s.id === selectedStaffId)
                              ?.last_name || ""}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Client Notes */}
                  {notes && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-2 block">
                        {t("form.clientNotes")}
                      </label>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {notes}
                      </p>
                    </div>
                  )}

                  {/* Staff Notes */}
                  {staffNotes && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-2 block">
                        {t("form.staffNotes")}
                      </label>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {staffNotes}
                      </p>
                    </div>
                  )}

                  {/* Result Image */}
                  {staffImagePath && (
                    <Collapsible
                      open={isStaffImageOpen}
                      onOpenChange={setIsStaffImageOpen}
                    >
                      <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                        {isStaffImageOpen ? (
                          <RiArrowDownSLine className="h-4 w-4 text-gray-500" />
                        ) : (
                          <RiArrowRightSLine className="h-4 w-4 text-gray-500" />
                        )}
                        <label className="text-xs font-medium text-gray-500">
                          {t("form.resultImage")}
                        </label>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="relative w-full max-w-md mt-2">
                          <img
                            src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/company/${staffImagePath}`}
                            alt="Result"
                            className="w-full h-auto rounded-lg border border-gray-200"
                          />
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  {/* Client Image */}
                  {clientImagePath && (
                    <Collapsible
                      open={isClientImageOpen}
                      onOpenChange={setIsClientImageOpen}
                    >
                      <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                        {isClientImageOpen ? (
                          <RiArrowDownSLine className="h-4 w-4 text-gray-500" />
                        ) : (
                          <RiArrowRightSLine className="h-4 w-4 text-gray-500" />
                        )}
                        <label className="text-xs font-medium text-gray-500">
                          {t("form.clientImage")}
                        </label>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="relative w-full max-w-md mt-2">
                          <img
                            src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/company/${clientImagePath}`}
                            alt="Client Image"
                            className="w-full h-auto rounded-lg border border-gray-200"
                          />
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  {/* History Section */}
                  {clientEmail.trim() && (
                    <div className="pt-6 border-t border-gray-200">
                      <h3 className="text-base font-semibold text-gray-900 mb-4">
                        {t("sheet.clientHistory")}
                      </h3>
                      {isLoadingHistory ? (
                        <div className="flex items-center justify-center py-8">
                          <RiLoader4Line
                            size={24}
                            className="animate-spin text-gray-400"
                          />
                        </div>
                      ) : clientHistory ? (
                        <div className="space-y-4 max-h-96 overflow-y-auto overflow-x-hidden overscroll-x-none pr-1">
                          {clientHistory.timeline.length > 0 ? (
                            clientHistory.timeline.map((entry, index) => {
                              if (entry.type === "order") {
                                const order = entry.order;
                                const orderDate = new Date(order.date);
                                const formattedDate = orderDate.toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  },
                                );
                                const formattedTime = orderDate.toLocaleTimeString(
                                  "en-US",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: false,
                                  },
                                );
                                const paymentVisual =
                                  getHistoryOrderPaymentVisualState({ order });
                                const itemSummary = order.orderItems
                                  .map((item) =>
                                    formatHistoryOrderItemName(
                                      item,
                                      tPos("common.unknown"),
                                    ),
                                  )
                                  .filter(Boolean)
                                  .join(", ");

                                return (
                                  <div key={`order-${order.id}`} className="relative">
                                    {index < clientHistory.timeline.length - 1 && (
                                      <div className="absolute left-2.5 top-8 bottom-0 w-px bg-gray-200" />
                                    )}
                                    <div className="flex gap-3 min-w-0">
                                      <div className="relative z-10 mt-1">
                                        <div
                                          className={cn(
                                            "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                                            paymentVisual.dotContainer,
                                          )}
                                        >
                                          <div
                                            className={cn(
                                              "w-1.5 h-1.5 rounded-full",
                                              paymentVisual.dot,
                                            )}
                                          />
                                        </div>
                                      </div>
                                      <div className="flex-1 min-w-0 pb-6">
                                        <div className="text-sm font-medium text-gray-900 mb-1 break-words">
                                          {itemSummary || t("sheet.standaloneSale")}
                                        </div>
                                        <div className="text-xs text-gray-500 mb-2">
                                          {formattedDate} {t("sheet.at")}{" "}
                                          {formattedTime}
                                        </div>
                                        <div
                                          className="space-y-2 mb-2 cursor-pointer rounded-md p-2 bg-gray-50 overflow-x-hidden"
                                          onClick={() =>
                                            setPosSession({
                                              mode: "order",
                                              order: {
                                                id: order.id,
                                                order_number: order.order_number,
                                                total_amount: order.total_amount,
                                                payment_status: order.payment_status,
                                                items: order.orderItems.map(
                                                  (item) => ({
                                                    ...item,
                                                    discount_amount:
                                                      item.discount_amount ??
                                                      null,
                                                  }),
                                                ),
                                              },
                                            })
                                          }
                                        >
                                          {order.order_number && (
                                            <div className="text-[9px] text-gray-500 break-all">
                                              {order.order_number}
                                            </div>
                                          )}
                                          {order.orderItems.length > 0 && (
                                            <div className="space-y-1 mt-2 p-2 bg-gray-50 rounded-md overflow-x-hidden">
                                              <div className="text-xs font-medium text-gray-700 mb-1">
                                                {t("sheet.items")}:
                                              </div>
                                              {order.orderItems.map((item, idx) => {
                                                const itemName =
                                                  formatHistoryOrderItemName(
                                                    item,
                                                    tPos("common.unknown"),
                                                  );
                                                const quantity = item.quantity || 1;
                                                const unitPrice = item.unit_price || 0;
                                                const discountAmount =
                                                  item.discount_amount || 0;
                                                const total =
                                                  item.total || unitPrice * quantity;
                                                return (
                                                  <div key={item.id || idx}>
                                                    <div className="text-xs text-gray-600 flex justify-between items-center gap-2 min-w-0">
                                                      <span className="min-w-0 break-words">
                                                        {quantity}x {itemName}
                                                      </span>
                                                      <span className="font-medium shrink-0">
                                                        €{total.toFixed(2)}
                                                      </span>
                                                    </div>
                                                    {discountAmount > 0 && (
                                                      <div className="text-[11px] text-green-700 flex justify-between items-center gap-2 pl-4 min-w-0">
                                                        <span>{tPos("pos.discount")}</span>
                                                        <span className="shrink-0">
                                                          -€{discountAmount.toFixed(2)}
                                                        </span>
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                          <div className="text-xs text-gray-500 font-medium">
                                            {t("sheet.total")}: €
                                            {order.total_amount?.toFixed(2) ||
                                              t("common.notAvailable")}
                                          </div>
                                          <div className="text-xs text-gray-500 font-medium">
                                            {t("orderPanel.summary.paid")}: €
                                            {order.amount_paid.toFixed(2)}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }

                              const appointment = entry.appointment;
                              const appointmentDate = new Date(
                                appointment.start,
                              );
                                const appointmentEnd = new Date(
                                  appointment.end,
                                );
                                const formattedDate =
                                  appointmentDate.toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  });
                                const formattedTime =
                                  appointmentDate.toLocaleTimeString("en-US", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: false,
                                  });
                                const formattedEndTime =
                                  appointmentEnd.toLocaleTimeString("en-US", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: false,
                                  });
                                const paymentVisual =
                                  getHistoryPaymentVisualState(appointment);

                                return (
                                  <div
                                    key={appointment.id}
                                    className="relative"
                                  >
                                    {index < clientHistory.timeline.length - 1 && (
                                      <div className="absolute left-2.5 top-8 bottom-0 w-px bg-gray-200" />
                                    )}
                                    <div className="flex gap-3 min-w-0">
                                      <div className="relative z-10 mt-1">
                                        <div
                                          className={cn(
                                            "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                                            paymentVisual.dotContainer,
                                          )}
                                        >
                                          <div
                                            className={cn(
                                              "w-1.5 h-1.5 rounded-full",
                                              paymentVisual.dot,
                                            )}
                                          />
                                        </div>
                                      </div>
                                      <div className="flex-1 min-w-0 pb-6">
                                        <div className="text-sm font-medium text-gray-900 mb-1 break-words">
                                          {formatHistoryAppointmentTitle(
                                            appointment,
                                            t("sheet.noTreatment"),
                                          )}
                                        </div>
                                        <div className="text-xs text-gray-500 mb-2">
                                          {formattedDate} {t("sheet.at")} {formattedTime} -{" "}
                                          {formattedEndTime}
                                        </div>
                                        {appointment.staff && (
                                          <div className="text-xs text-gray-500 mb-2">
                                            {t("form.staff")}:{" "}
                                            {appointment.staff.first_name}{" "}
                                            {appointment.staff.last_name}
                                          </div>
                                        )}
                                        {appointment.order && (
                                          <div
                                            className="space-y-2 mb-2 cursor-pointer rounded-md p-2 bg-gray-50 overflow-x-hidden"
                                            onClick={() =>
                                              setPosSession({
                                                mode: "order",
                                                order: {
                                                  id: appointment.order!.id,
                                                  order_number:
                                                    appointment.order!
                                                      .order_number,
                                                  total_amount:
                                                    appointment.order!
                                                      .total_amount,
                                                  payment_status:
                                                    appointment.order!
                                                      .payment_status,
                                                  fallback_item_labels:
                                                    appointment.services.map(
                                                      (treatment) =>
                                                        treatment.serviceVariant?.name
                                                          ? `${treatment.serviceName} - ${treatment.serviceVariant.name}`
                                                          : treatment.serviceName,
                                                    ),
                                                  items: (appointment.orderItems || []).map(
                                                    (item) => ({
                                                      ...item,
                                                      discount_amount:
                                                        item.discount_amount ??
                                                        null,
                                                    }),
                                                  ),
                                                },
                                              })
                                            }
                                          >
                                            {appointment.order.order_number && (
                                              <div className="text-[9px] text-gray-500 break-all">
                                                {appointment.order.order_number}
                                              </div>
                                            )}
                                            {/* Order Items */}
                                            {appointment.orderItems &&
                                              appointment.orderItems.length >
                                                0 && (
                                                <div className="space-y-1 mt-2 p-2 bg-gray-50 rounded-md overflow-x-hidden">
                                                  <div className="text-xs font-medium text-gray-700 mb-1">
                                                    {t("sheet.items")}:
                                                  </div>
                                                  {appointment.orderItems.map(
                                                    (
                                                      item: {
                                                        id: string;
                                                        quantity: number | null;
                                                        unit_price:
                                                          | number
                                                          | null;
                                                        total: number | null;
                                                        discount_amount:
                                                          | number
                                                          | null;
                                                        product: {
                                                          id: string;
                                                          name: string | null;
                                                        } | null;
                                                        service: {
                                                          id: string;
                                                          name: string | null;
                                                        } | null;
                                                        service_variant: {
                                                          id: string;
                                                          name: string | null;
                                                          service?: {
                                                            id: string;
                                                            name:
                                                              | string
                                                              | null;
                                                          } | null;
                                                        } | null;
                                                      },
                                                      idx: number,
                                                    ) => {
                                                      const itemName =
                                                        item.product?.name ||
                                                        (item.service?.name &&
                                                        item.service_variant?.name
                                                          ? `${item.service.name} - ${item.service_variant.name}`
                                                          : item.service_variant
                                                                ?.service
                                                                ?.name &&
                                                              item
                                                                .service_variant
                                                                ?.name
                                                            ? `${item.service_variant.service.name} - ${item.service_variant.name}`
                                                          : item.service?.name ||
                                                            item.service_variant?.name) ||
                                                        tPos("common.unknown");
                                                      const quantity =
                                                        item.quantity || 1;
                                                      const unitPrice =
                                                        item.unit_price || 0;
                                                      const discountAmount =
                                                        item.discount_amount || 0;
                                                      const total =
                                                        item.total ||
                                                        unitPrice * quantity;

                                                      return (
                                                        <div key={item.id || idx}>
                                                          <div
                                                            className="text-xs text-gray-600 flex justify-between items-center gap-2 min-w-0"
                                                          >
                                                            <span className="min-w-0 break-words">
                                                              {quantity}x{" "}
                                                              {itemName}
                                                            </span>
                                                            <span className="font-medium shrink-0">
                                                              €{total.toFixed(2)}
                                                            </span>
                                                          </div>
                                                          {discountAmount > 0 && (
                                                            <div className="text-[11px] text-green-700 flex justify-between items-center gap-2 pl-4 min-w-0">
                                                              <span>
                                                                {tPos(
                                                                  "pos.discount",
                                                                )}
                                                              </span>
                                                              <span className="shrink-0">
                                                                -€
                                                                {discountAmount.toFixed(
                                                                  2,
                                                                )}
                                                              </span>
                                                            </div>
                                                          )}
                                                        </div>
                                                      );
                                                    },
                                                  )}
                                                </div>
                                              )}
                                            <div className="text-xs text-gray-500 font-medium">
                                              {t("sheet.total")}: €
                                              {appointment.order.total_amount?.toFixed(
                                                2,
                                              ) || t("common.notAvailable")}
                                            </div>
                                            <div className="text-xs text-gray-500 font-medium">
                                              {t("orderPanel.summary.paid")}: €
                                              {(appointment.order.amount_paid || 0).toFixed(2)}
                                            </div>
                                            {appointment.order
                                              .payment_status && (
                                              <div className="text-xs">
                                                <span className="text-gray-500">
                                                  {t("sheet.status")}:{" "}
                                                </span>
                                                <span
                                                  className={cn(
                                                    "font-medium",
                                                    paymentVisual.labelClass,
                                                  )}
                                                >
                                                  {paymentVisual.label}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                        {appointment.notes && (
                                          <div className="mt-2">
                                            <div className="text-xs font-medium text-gray-500 mb-1">
                                              {t("form.clientNotes")}:
                                            </div>
                                            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                              {appointment.notes}
                                            </div>
                                          </div>
                                        )}
                                        {appointment.staff_notes && (
                                          <div className="mt-2">
                                            <div className="text-xs font-medium text-gray-500 mb-1">
                                              {t("form.staffNotes")}:
                                            </div>
                                            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                              {appointment.staff_notes}
                                            </div>
                                          </div>
                                        )}
                                        {appointment.staff_image_path && (
                                          <Collapsible
                                            open={expandedHistoryImages.has(
                                              appointment.id,
                                            )}
                                            onOpenChange={(open) => {
                                              const newSet = new Set(
                                                expandedHistoryImages,
                                              );
                                              if (open) {
                                                newSet.add(appointment.id);
                                              } else {
                                                newSet.delete(appointment.id);
                                              }
                                              setExpandedHistoryImages(newSet);
                                            }}
                                          >
                                            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left mt-2">
                                              {expandedHistoryImages.has(
                                                appointment.id,
                                              ) ? (
                                                <RiArrowDownSLine className="h-4 w-4 text-gray-500" />
                                              ) : (
                                                <RiArrowRightSLine className="h-4 w-4 text-gray-500" />
                                              )}
                                              <div className="text-xs font-medium text-gray-500">
                                                {t("form.resultImage")}
                                              </div>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent>
                                              <div className="relative mt-2 h-40 w-40">
                                                <img
                                                  src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/company/${appointment.staff_image_path}`}
                                                  alt="Result"
                                                  className="h-full w-full rounded-lg border border-gray-200 object-cover"
                                                />
                                              </div>
                                            </CollapsibleContent>
                                          </Collapsible>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              },
                            )
                          ) : (
                            <div className="text-center py-8 text-gray-500 text-sm">
                              {t("sheet.noClientHistory")}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center py-8">
                          <div className="text-center text-gray-500">
                            <p className="text-sm">
                              {t("sheet.noClientData")}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                // Edit Mode (Form)
                <div className={cn("space-y-6", isMobile ? "py-4" : "py-6")}>
                  {/* Treatments Section */}
                  <div className="space-y-3 min-w-0">
                    <div className="space-y-2 min-w-0">
                      {appointmentServices.map((treatment, index) => (
                        <div
                          key={treatment.id}
                          className={`p- rounded-lg overflow-hidden ${
                            index === editingIndex ? "bg-" : "bg-gray-50"
                          }`}
                        >
                          {index === editingIndex ? (
                            // Editable treatment
                            <div className="space-y-3 min-w-0">
                              <div className="space-y-2 min-w-0">
                                <Label>{t("form.treatment")}</Label>
                                <Select
                                  value={selectedServiceId}
                                  onValueChange={(value) => {
                                    updateCurrentTreatment(value, ""); // Clear price option when treatment changes
                                  }}
                                >
                                  <SelectTrigger className="w-full max-w-full min-w-0">
                                    <SelectValue
                                      placeholder={t("form.selectTreatment")}
                                      className="truncate text-ellipsis overflow-hidden whitespace-nowrap"
                                    />
                                  </SelectTrigger>
                                  <SelectContent className="max-w-[var(--radix-select-trigger-width)]">
                                    {services.map((treatment) => (
                                      <SelectItem
                                        key={treatment.id}
                                        value={treatment.id}
                                        className="truncate max-w-full"
                                      >
                                        <span
                                          className="truncate block max-w-full"
                                          title={treatment.name}
                                        >
                                          {treatment.name}
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {selectedServiceId && (
                                <div className="space-y-2">
                                  <Label>{t("form.service")}</Label>
                                  <Select
                                    value={selectedServiceVariantId}
                                    onValueChange={(value) => {
                                      updateCurrentTreatment(undefined, value);
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue
                                        placeholder={t("form.selectService")}
                                      />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {(() => {
                                        const treatmentData = services.find(
                                          (t) => t.id === selectedServiceId,
                                        );
                                        const priceOptions =
                                          treatmentData?.service_variant || [];

                                        return priceOptions.map((option) => (
                                          <SelectItem
                                            key={option.id}
                                            value={option.id}
                                          >
                                            {option.name} - €{option.price} (
                                            {option.duration_in_minutes} min)
                                          </SelectItem>
                                        ));
                                      })()}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </div>
                          ) : (
                            // Non-editable treatment card
                            <div className="flex items-center justify-between">
                              <div
                                className="flex-1 cursor-pointer min-w-0"
                                onClick={() => setEditingTreatment(index)}
                              >
                                <div
                                  className="font-medium text-sm truncate"
                                  title={treatment.service?.name}
                                >
                                  {treatment.service?.name ||
                                    t("form.selectTreatment")}
                                </div>
                                {treatment.serviceVariant && (
                                  <div className="text-xs text-gray-600">
                                    {treatment.serviceVariant.name} - €
                                    {treatment.serviceVariant.price} (
                                    {treatment.serviceVariant.duration_in_minutes}{" "}
                                    min)
                                    {treatment.staffId
                                      ? ` · ${staffList.find((s) => s.id === treatment.staffId)?.first_name || ""} ${staffList.find((s) => s.id === treatment.staffId)?.last_name || ""}`.trim()
                                      : ""}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingTreatment(index)}
                                  className="h-8 w-8 p-0"
                                >
                                  <RiEditLine size={14} />
                                </Button>
                                {appointmentServices.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeTreatment(index)}
                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                  >
                                    <RiDeleteBinLine size={14} />
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      {/* Add Treatment Button */}
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addNewTreatment}
                          className="flex items-center cursor-pointer !text-sm gap-2 bg-blue-50 hover:bg-blue-100 hover:text-blue-600 text-blue-600 border-blue-200 border-0"
                        >
                          <RiAddLine size={16} />
                          {t("sheet.actions.addTreatment")}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="*:not-first:mt-1.5 relative">
                    <Label>{t("form.clientEmail")}</Label>
                    <div className="relative">
                      <Input
                        type="email"
                        placeholder={t("form.searchPlaceholder")}
                        value={clientSearch.searchTerm}
                        onChange={(e) => {
                          const value = e.target.value;
                          clientSearch.handleChange(value);
                          setClientEmail(value);
                        }}
                        onFocus={() => {
                          if (clientSearch.results.length > 0) {
                            clientSearch.setShowDropdown(true);
                          }
                        }}
                        onBlur={() => {
                          // Delay hiding to allow for click selection
                          setTimeout(
                            () => clientSearch.setShowDropdown(false),
                            200,
                          );
                        }}
                        className="text-base"
                      />
                      {clientSearch.isSearching && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <RiLoader4Line
                            size={16}
                            className="animate-spin text-gray-400"
                          />
                        </div>
                      )}
                    </div>

                    {/* Client search dropdown */}
                    {clientSearch.showDropdown &&
                      clientSearch.results.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {clientSearch.results.map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                            onClick={() => selectClient(client)}
                          >
                            <div className="font-medium text-sm">
                              {client.first_name} {client.last_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {client.email}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* No results message */}
                    {clientSearch.showDropdown &&
                      clientSearch.results.length === 0 &&
                      clientSearch.searchTerm.length >= 2 &&
                      !clientSearch.isSearching && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-4 text-center text-gray-500 text-sm">
                          No clients found
                        </div>
                      )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="*:not-first:mt-1.5">
                      <Label>{t("form.clientFirstName")}</Label>
                      <Input
                        type="text"
                        placeholder={t("form.firstNamePlaceholder")}
                        value={clientFirstName}
                        onChange={(e) => setClientFirstName(e.target.value)}
                        className="text-base"
                      />
                    </div>
                    <div className="*:not-first:mt-1.5">
                      <Label>{t("form.clientLastName")}</Label>
                      <Input
                        type="text"
                        placeholder={t("form.lastNamePlaceholder")}
                        value={clientLastName}
                        onChange={(e) => setClientLastName(e.target.value)}
                        className="text-base"
                      />
                    </div>
                  </div>

                  <div className="*:not-first:mt-1.5">
                    <Label>{t("form.staff")}</Label>
                    <Select
                      value={selectedStaffId || undefined}
                      onValueChange={(value) => {
                        setSelectedStaffId(value);
                        setAppointmentServices((prev) =>
                          prev.map((item) => ({ ...item, staffId: value })),
                        );
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("form.selectStaff")} />
                      </SelectTrigger>
                      <SelectContent>
                        {visitStaffOptions.map((staff) => (
                          <SelectItem key={staff.id} value={staff.id}>
                            {staff.first_name || ""} {staff.last_name || ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="*:not-first:mt-1.5">
                    <Label htmlFor="date-picker" className="px-1">
                      {t("form.startDate")}
                    </Label>
                    <Button
                      variant="outline"
                      id="date-picker"
                      className="w-full justify-between font-normal"
                      onClick={() => setStartDateOpen(!startDateOpen)}
                    >
                      {startDate
                        ? startDate.toLocaleDateString()
                        : t("form.selectDate")}
                      <RiCalendarLine size={16} />
                    </Button>
                    {startDateOpen && (
                      <div
                        className="fixed bg-white border rounded-md shadow-lg p-3 calendar-container"
                        style={{
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          zIndex: 9999,
                        }}
                      >
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={(date) => {
                            if (date) {
                              setStartDate(date);
                              if (isBefore(endDate, date)) {
                                setEndDate(date);
                              }
                              setError(null);
                              setStartDateOpen(false);
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="*:not-first:mt-1.5">
                      <Label htmlFor="start-time" className="px-1">
                        {t("form.startTime")}
                      </Label>
                      <Input
                        id="start-time"
                        type="text"
                        placeholder="HH:MM"
                        value={startTime}
                        onChange={(e) => {
                          let value = e.target.value.replace(/[^\d]/g, "");

                          if (value.length >= 2) {
                            const hours = value.slice(0, 2);
                            const minutes = value.slice(2, 4);

                            if (Number.parseInt(hours) > 23) {
                              value = "23" + minutes;
                            }

                            if (minutes && Number.parseInt(minutes) > 59) {
                              value = hours + "59";
                            }

                            if (value.length > 2) {
                              value =
                                value.slice(0, 2) + ":" + value.slice(2, 4);
                            }
                          }

                          if (value.length <= 5) {
                            setStartTime(value);
                          }
                        }}
                        className="font-mono text-base"
                        maxLength={5}
                      />
                    </div>
                    <div className="*:not-first:mt-1.5">
                      <Label htmlFor="end-time" className="px-1">
                        {t("form.endTime")}
                      </Label>
                      <Input
                        id="end-time"
                        type="text"
                        placeholder="HH:MM"
                        value={endTime}
                        onChange={(e) => {
                          let value = e.target.value.replace(/[^\d]/g, "");

                          if (value.length >= 2) {
                            const hours = value.slice(0, 2);
                            const minutes = value.slice(2, 4);

                            if (Number.parseInt(hours) > 23) {
                              value = "23" + minutes;
                            }

                            if (minutes && Number.parseInt(minutes) > 59) {
                              value = hours + "59";
                            }

                            if (value.length > 2) {
                              value =
                                value.slice(0, 2) + ":" + value.slice(2, 4);
                            }
                          }

                          if (value.length <= 5) {
                            setEndTime(value);
                          }
                        }}
                        className="font-mono text-base"
                        maxLength={5}
                      />
                    </div>
                  </div>

                  <div className="*:not-first:mt-1.5">
                    <Label>{t("form.clientNotes")}</Label>
                    <Input
                      placeholder={t("form.notesPlaceholder")}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="text-base"
                    />
                  </div>

                  <div className="*:not-first:mt-1.5">
                    <Label>{t("form.staffNotes")}</Label>
                    <Input
                      placeholder={t("form.staffNotesPlaceholder")}
                      value={staffNotes}
                      onChange={(e) => setStaffNotes(e.target.value)}
                      className="text-base"
                    />
                  </div>

                  {/* Result Image Upload */}
                  <div className="*:not-first:mt-1.5">
                    <Label>{t("form.resultImage")}</Label>
                    <div className="space-y-2">
                      {/* Image Upload Area */}
                      <div
                        role="button"
                        onClick={openFileDialog}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        data-dragging={isDragging || undefined}
                        className={cn(
                          "relative flex h-32 w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:border-gray-400 hover:bg-gray-100 data-[dragging=true]:border-blue-400 data-[dragging=true]:bg-blue-50",
                        )}
                      >
                        <input
                          {...getInputProps()}
                          className="sr-only"
                          aria-label="Upload result image"
                        />

                        {/* Show uploaded image preview */}
                        {files[0]?.preview ? (
                          <img
                            src={files[0].preview}
                            alt="Result preview"
                            className="h-full w-full object-cover"
                          />
                        ) : staffImagePath ? (
                          /* Show existing image from database */
                          <img
                            src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/company/${staffImagePath}`}
                            alt="Result"
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-gray-500">
                            <ImagePlusIcon className="h-8 w-8 mb-2" />
                            <span className="text-sm">
                              {t("form.resultImageUpload")}
                            </span>
                            <span className="text-xs text-gray-400 mt-1">
                              {t("form.resultImageMaxSize", {
                                size: maxSizeMB,
                              })}
                            </span>
                          </div>
                        )}

                        {/* Upload icon overlay */}
                        {!files[0]?.preview && staffImagePath && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity hover:opacity-100">
                            <ImagePlusIcon className="h-6 w-6 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Remove button for uploaded files */}
                      {(files[0]?.preview || staffImagePath) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            // Remove from UI state
                            if (files[0]?.preview) {
                              removeFile(files[0].id);
                            }

                            // Delete from storage if there's an existing image path
                            if (staffImagePath && appointmentRecordId) {
                              try {
                                const supabase = createClient();
                                const { error: deleteError } =
                                  await supabase.storage
                                    .from("company")
                                    .remove([staffImagePath]);

                                if (deleteError) {
                                  console.warn(
                                    "Could not delete image from storage:",
                                    deleteError,
                                  );
                                  toast.error(
                                    t("error.resultImageDeleteFailed"),
                                  );
                                } else {
                                  // Update the appointment to remove the image path
                                  await supabase
                                    .from("appointment")
                                    .update({ staff_image_path: null })
                                    .eq("id", appointmentRecordId);
                                }
                              } catch (error) {
                                console.error("Error deleting image:", error);
                                toast.error(t("error.resultImageDeleteError"));
                              }
                            }

                            setStaffImagePath(null);
                          }}
                          className="w-full"
                        >
                          <XIcon className="h-4 w-4 mr-2" />
                          {t("form.removeImage")}
                        </Button>
                      )}

                      {/* Upload errors */}
                      {uploadErrors.length > 0 && (
                        <div className="text-destructive text-xs">
                          {uploadErrors[0]}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {isEditMode || !appointmentRecordId ? (
              <SheetFooter
                className={cn(
                  "flex-row sm:justify-between flex-shrink-0 border-t border-gray-200",
                  isMobile ? "px-4 py-4" : "px-6 py-4",
                )}
              >
                {appointmentRecordId && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleDelete}
                    disabled={isLoading}
                    aria-label="Delete"
                  >
                    {isLoading ? (
                      <RiLoader4Line
                        size={16}
                        className="animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <RiDeleteBinLine size={16} aria-hidden="true" />
                    )}
                  </Button>
                )}
                <div
                  className={cn(
                    "flex flex-1 justify-end gap-2",
                    isMobile ? "gap-3" : "",
                  )}
                >
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (appointmentRecordId) {
                        setIsEditMode(false);
                      } else {
                        handleClose();
                      }
                    }}
                  >
                    {tPos("common.cancel")}
                  </Button>
                  <Button
                    variant="default"
                    onClick={handleSave}
                    disabled={!isFormValid}
                    className="min-w-20"
                  >
                    {isLoading ? (
                      <RiLoader4Line size={16} className="animate-spin mr-2" />
                    ) : null}
                    {tPos("common.save")}
                  </Button>
                </div>
              </SheetFooter>
            ) : (
              // View Mode Footer
              <SheetFooter
                className={cn(
                  "flex-row sm:justify-between flex-shrink-0 border-t border-gray-200",
                  isMobile ? "px-4 py-4" : "px-6 py-4",
                )}
              >
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleDelete}
                    disabled={isLoading}
                    aria-label="Delete"
                  >
                    {isLoading ? (
                      <RiLoader4Line
                        size={16}
                        className="animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <RiDeleteBinLine size={16} aria-hidden="true" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsEditMode(true)}
                    aria-label="Edit"
                  >
                    <RiEditLine size={16} />
                  </Button>
                </div>
                <Button variant="outline" onClick={handleClose}>
                  {t("sheet.actions.close")}
                </Button>
              </SheetFooter>
            )}
          </div>

          {posSession && appointmentRecordId && !isMobile && (
            <EmbeddedPosSession
              key={`${appointmentRecordId}-${posSession.mode}`}
              companyId={companyId}
              appointmentId={appointmentRecordId}
              clientId={clientHistory?.client?.id}
              clientEmail={clientEmail}
              clientDisplayName={clientDisplayName}
              mode={posSession.mode}
              services={
                posSession.mode === "checkout" ? posSession.services : undefined
              }
              order={posSession.mode === "order" ? posSession.order : undefined}
              onSaleComplete={() => {
                onRefresh?.();
                void orderStatus.refreshOrderStatus();
                handleClose();
              }}
              onHistoryRefresh={async () => {
                if (clientEmail.trim()) {
                  await fetchClientHistory(clientEmail);
                }
                await orderStatus.refreshOrderStatus();
              }}
              onRequestClose={() => setPosSession(null)}
            />
          )}
        </div>
      </SheetContent>

      {/* Add Items Dialog */}
      <Dialog open={showAddItemsDialog} onOpenChange={setShowAddItemsDialog}>
        <DialogContent className="!w-[1000px] !max-w-[1000px] h-[850px] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>{t("sheet.addItemsDialog.title")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col flex-1 min-h-0">
            {/* Main Category Navigation */}
            <div className="flex items-center gap-2 px-6 pb-4 border-b">
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
                <span>🛍️</span>
                <span>{t("sheet.addItemsDialog.products")}</span>
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
                <span>💆</span>
                <span>{t("sheet.addItemsDialog.treatments")}</span>
              </Button>
            </div>

            {/* Treatment Navigation Bar - Horizontal Scrollable */}
            {selectedItemCategory === "treatments" &&
              posServices.length > 0 && (
                <div className="flex items-center gap-2 px-6 py-3 border-b bg-gray-50 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {posServices.map((treatment) => (
                    <button
                      key={treatment.id}
                      onClick={() => {
                        setSelectedServiceNav(treatment.id);
                        const element = treatmentScrollRefs.current.get(
                          treatment.id,
                        );
                        if (element) {
                          element.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                        }
                      }}
                      className={cn(
                        "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
                        selectedServiceNav === treatment.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200",
                      )}
                    >
                      {treatment.name}
                    </button>
                  ))}
                </div>
              )}

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
              {loadingItems ? (
                <div className="flex items-center justify-center py-12">
                  <RiLoader4Line
                    className="animate-spin text-gray-400"
                    size={24}
                  />
                </div>
              ) : selectedItemCategory === "products" ? (
                posProducts.length === 0 ? (
                  <div className="text-center text-gray-500 py-12">
                    <div className="text-4xl mb-4">🔍</div>
                    <p className="text-sm">
                      {t("sheet.addItemsDialog.noProductsFound")}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {posProducts.map((product) => {
                      const grossPrice =
                        Math.round((product.price_gross || 0) * 100) / 100;
                      const stockQty = product.stock_qty || 0;

                      return (
                        <div
                          key={product.id}
                          className="bg-white rounded-lg border border-gray-200 hover:border-primary hover:shadow-md transition-all cursor-pointer group"
                          onClick={() => handleAddProductToCart(product)}
                        >
                          <div className="aspect-square bg-gray-50 rounded-t-lg flex items-center justify-center">
                            <span className="text-3xl">🛍️</span>
                          </div>
                          <div className="p-4">
                            <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                              {product.name || t("sheet.unnamedProduct")}
                            </h3>
                            <p className="text-xs text-gray-500 mb-2">
                              {product.sku || t("common.notAvailable")}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-bold text-primary">
                                €{grossPrice.toFixed(2)}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <div
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    stockQty <= 0
                                      ? "bg-red-500"
                                      : stockQty <= 5
                                        ? "bg-orange-500"
                                        : "bg-green-500",
                                  )}
                                />
                                <span
                                  className={cn(
                                    "text-xs",
                                    stockQty <= 0
                                      ? "text-red-600"
                                      : stockQty <= 5
                                        ? "text-orange-600"
                                        : "text-gray-600",
                                  )}
                                >
                                  {stockQty}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : posServices.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  <div className="text-4xl mb-4">🔍</div>
                  <p className="text-sm">
                    {t("sheet.addItemsDialog.noTreatmentsFound")}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {posServices.map((treatment) => {
                    const hasPriceOptions =
                      treatment.service_variants &&
                      treatment.service_variants.length > 0;
                    if (!hasPriceOptions) return null;

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
                        <h3 className="font-semibold text-base text-gray-900 mb-3 px-1">
                          {treatment.name}
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          {treatment.service_variants?.map((option) => {
                            const grossPrice =
                              Math.round((option.price || 0) * 100) / 100;

                            return (
                              <div
                                key={option.id}
                                className="bg-white rounded-lg border border-gray-200 hover:border-primary hover:shadow-md transition-all cursor-pointer group"
                                onClick={() =>
                                  handleAddServiceToCart(treatment, option)
                                }
                              >
                                <div className="aspect-square bg-gray-50 rounded-t-lg flex items-center justify-center">
                                  <span className="text-3xl">💆</span>
                                </div>
                                <div className="p-4">
                                  <h4 className="font-semibold text-sm mb-1 line-clamp-2">
                                    {option.name}
                                  </h4>
                                  <p className="text-xs text-gray-500 mb-2">
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
    </Sheet>
  );
}
