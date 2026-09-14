"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { useConnectCharges } from "@/lib/api/billing/use-connect-charges";
import { createClient } from "@/lib/supabase/client";
import { useLocationId } from "@/lib/company-util";
import { asLocationClient, offeredServiceIdsForLocation } from "@/lib/location";
import type { CartItem as CartItemType, Product as POSProduct, Service as POSService } from "@/app/[locale]/pos/components/types";
import { getDefaultOrderDateTime } from "@/app/[locale]/pos/components/payment-section";
import {
  buildOrderCreatePayments,
  splitHasCardAmount,
  splitHasPayLinkAmount,
  splitHasTerminalAmount,
  splitPayLinkAmount,
  type PaymentMethod,
  type SplitPayment,
} from "@/app/[locale]/pos/components/payment-methods";
import { resolveCardSaleFollowup } from "@/lib/api/pos/card-checkout";
import {
  buildPayLinkReturnUrls,
  createPaymentCheckout,
  isClientEmailRequiredError,
  readClientEmail,
} from "@/lib/api/pos/mutations/payment-create-checkout";
import {
  getSubtotal as calculateSubtotal,
  getTax as calculateTax,
  getDiscount as calculateDiscount,
  getTotal as calculateTotal,
} from "@/app/[locale]/pos/components/utils";
import type { CreateOrderWithPaymentV3Response } from "@/lib/api/pos/mutations/create-order";
import { isChargesNotEnabledError } from "@/lib/api/pos/mutations/order-create-response";
import {
  FILTER_NO_PRODUCT_LINE,
} from "@/lib/product-taxonomy";
import { fetchAppointmentOrderData, loadOrderItemsForOrder } from "./fetch-appointment-order";
import { mapAppointmentSegmentsToInput } from "./map-appointment-segments";
import type {
  EmbeddedPosClientDisplay,
  EmbeddedPosServiceInput,
  OrderDialogData,
  OrderPaymentEntry,
} from "./types";

type PickerProduct = POSProduct & {
  barcode?: string | null;
  product_line_id?: string | null;
  product_category_id?: string | null;
  product_line?: { id: string; name: string | null } | null;
  product_category?: { id: string; name: string | null } | null;
};

export type UseEmbeddedPosOptions = {
  companyId: string | null;
  clientId?: string | null;
  appointmentId?: string | null;
  clientEmail?: string | null;
  clientDisplayName?: EmbeddedPosClientDisplay;
  onSaleComplete?: () => void;
  onHistoryRefresh?: () => void | Promise<void>;
  /** When true, order status is managed externally (e.g. useAppointmentOrderStatus). */
  skipAppointmentOrderSync?: boolean;
};

export function useEmbeddedPos({
  companyId,
  clientId,
  appointmentId,
  clientEmail = null,
  clientDisplayName = null,
  onSaleComplete,
  onHistoryRefresh,
  skipAppointmentOrderSync = false,
}: UseEmbeddedPosOptions) {
  const t = useTranslations("appointments");
  const tPos = useTranslations();
  const locale = useLocale();
  const locationId = useLocationId();
  const { chargesEnabled } = useConnectCharges(companyId);

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [rightPanelMode, setRightPanelMode] = useState<"cart" | "order">("cart");
  const [checkoutAppointmentId, setCheckoutAppointmentId] = useState<string | null>(null);
  const [checkoutTreatments, setCheckoutTreatments] = useState<EmbeddedPosServiceInput[]>([]);

  const [cart, setCart] = useState<CartItemType[]>([]);
  const [editingPriceIndex, setEditingPriceIndex] = useState<number | null>(null);
  const [editingDiscountIndex, setEditingDiscountIndex] = useState<number | null>(null);
  const [priceInputWidths, setPriceInputWidths] = useState<Record<number, number>>({});
  const [discountInputWidths, setDiscountInputWidths] = useState<Record<number, number>>({});
  const priceSpanRefs = useRef<Map<number, HTMLSpanElement>>(new Map());
  const discountSpanRefs = useRef<Map<number, HTMLSpanElement>>(new Map());

  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>("bank_transfer");
  const [splitPayments, setSplitPayments] = useState<SplitPayment[]>([
    { id: "payment-1", method: "bank_transfer", amount: 0 },
  ]);
  const [orderDateTime, setOrderDateTime] = useState("");
  const [processing, setProcessing] = useState(false);
  const [showProcessButton, setShowProcessButton] = useState(false);
  const [showSimulateButton, setShowSimulateButton] = useState(false);
  const [orderResult, setOrderResult] = useState<CreateOrderWithPaymentV3Response | null>(null);
  const [pendingCardIntentIds, setPendingCardIntentIds] = useState<string[]>([]);
  const companyReaderId: string | null = null;
  const [readerId, setReaderId] = useState("");

  const [hasOrder, setHasOrder] = useState(false);
  const [currentAppointmentOrder, setCurrentAppointmentOrder] = useState<OrderDialogData | null>(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<OrderDialogData | null>(null);
  const [orderPayments, setOrderPayments] = useState<OrderPaymentEntry[]>([]);
  const [isLoadingOrderPayments, setIsLoadingOrderPayments] = useState(false);
  const [isSavingOrderPayment, setIsSavingOrderPayment] = useState(false);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [pendingDeleteTarget, setPendingDeleteTarget] = useState<
    { type: "order" } | { type: "payment"; paymentId: string } | null
  >(null);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editingPaymentAmount, setEditingPaymentAmount] = useState("");
  const [newPaymentMethod, setNewPaymentMethod] =
    useState<PaymentMethod>("cash");
  const [newPaymentAmount, setNewPaymentAmount] = useState("");

  const [posProducts, setPosProducts] = useState<PickerProduct[]>([]);
  const [posServices, setPosServices] = useState<POSService[]>([]);
  const [showInlineProductPicker, setShowInlineProductPicker] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const productSearchInputRef = useRef<HTMLInputElement | null>(null);
  const inlinePickerContainerRef = useRef<HTMLDivElement | null>(null);
  const editingPaymentInputRef = useRef<HTMLInputElement | null>(null);
  const [recentProductIds, setRecentProductIds] = useState<string[]>([]);
  const [collapsedPickerLineKeys, setCollapsedPickerLineKeys] = useState<Record<string, boolean>>({});
  const [collapsedPickerTreatmentKeys, setCollapsedPickerTreatmentKeys] = useState<
    Record<string, boolean>
  >({});
  const [loadingItems, setLoadingItems] = useState(false);
  const previousCartTotalRef = useRef<number | null>(null);
  const hydrationGenerationRef = useRef(0);

  const activeAppointmentId = checkoutAppointmentId ?? appointmentId ?? null;

  const resetOrderPaymentForm = useCallback(() => {
    setEditingPaymentId(null);
    setEditingPaymentAmount("");
    setNewPaymentMethod("cash");
    setNewPaymentAmount("");
  }, []);

  const resetPanelState = useCallback(() => {
    setCart([]);
    setSplitPayments([{ id: "payment-1", method: "bank_transfer", amount: 0 }]);
    setShowProcessButton(false);
    setShowSimulateButton(false);
    setOrderResult(null);
    setPendingCardIntentIds([]);
    setReaderId("");
    setSelectedOrderDetail(null);
    setRightPanelMode("cart");
    setCheckoutAppointmentId(null);
    setCheckoutTreatments([]);
    setShowInlineProductPicker(false);
    setProductSearchQuery("");
    resetOrderPaymentForm();
  }, [resetOrderPaymentForm]);

  const terminate = useCallback(() => {
    hydrationGenerationRef.current += 1;
    setIsPanelOpen(false);
    resetPanelState();
    setHasOrder(false);
    setCurrentAppointmentOrder(null);
  }, [resetPanelState]);

  const loadOrderPayments = useCallback(async (orderId: string) => {
    setIsLoadingOrderPayments(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("payment")
        .select("id, payment_method, amount, amount_gross, status, payment_status, created_at")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });

      if (error) {
        toast.error(t("orderPanel.errors.loadPaymentsFailed"));
        setOrderPayments([]);
        return;
      }
      setOrderPayments((data || []) as OrderPaymentEntry[]);
    } catch {
      toast.error(t("orderPanel.errors.loadPaymentsFailed"));
      setOrderPayments([]);
    } finally {
      setIsLoadingOrderPayments(false);
    }
  }, [t]);

  const loadOrderItems = useCallback(
    (orderId: string) => loadOrderItemsForOrder(orderId),
    [],
  );

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
      setIsPanelOpen(true);
      resetOrderPaymentForm();
      await loadOrderPayments(order.id);
    },
    [loadOrderItems, loadOrderPayments, resetOrderPaymentForm],
  );

  const fetchOrderForAppointment = useCallback(
    async (apptId: string): Promise<OrderDialogData | null> => {
      const mapped = await fetchAppointmentOrderData(apptId);
      if (mapped) {
        setHasOrder(true);
        setCurrentAppointmentOrder(mapped);
      } else {
        setHasOrder(false);
        setCurrentAppointmentOrder(null);
      }
      return mapped;
    },
    [],
  );

  const hydrateCartFromTreatments = useCallback(
    async (
      apptId: string,
      treatments: EmbeddedPosServiceInput[],
      generation: number,
    ) => {
      if (generation !== hydrationGenerationRef.current) {
        return;
      }

      if (treatments.length === 0) {
        if (generation === hydrationGenerationRef.current) {
          setCart([]);
        }
        return;
      }

      const supabase = createClient();
      const { data: appointmentTreatmentRows } = await supabase
        .from("appointment_segment")
        .select("id, service_id, service_variant_id")
        .eq("appointment_id", apptId);

      if (generation !== hydrationGenerationRef.current) {
        return;
      }

      const appointmentSegmentIdByKey = new Map<string, string[]>();
      (appointmentTreatmentRows || []).forEach((row) => {
        const key = `${row.service_id}|${row.service_variant_id}`;
        const existing = appointmentSegmentIdByKey.get(key) || [];
        existing.push(row.id);
        appointmentSegmentIdByKey.set(key, existing);
      });

      const newCartItems: CartItemType[] = treatments.map((tr) => {
        const grossPrice = Math.round((tr.serviceVariant.price || 0) * 100) / 100;
        const key = `${tr.serviceId}|${tr.serviceVariant.id}`;
        const idsForKey = appointmentSegmentIdByKey.get(key) || [];
        const appointmentSegmentId =
          tr.appointmentSegmentId || idsForKey.shift();
        appointmentSegmentIdByKey.set(key, idsForKey);

        return {
          id: tr.serviceId,
          name: `${tr.serviceName} - ${tr.serviceVariant.name}`,
          price: grossPrice,
          quantity: 1,
          type: "service" as const,
          serviceVariantId: tr.serviceVariant.id,
          vatRate: tr.serviceVariant.vat_rate || 21,
          appointmentId: apptId,
          appointmentSegmentId,
          isAppointmentItem: true,
        };
      });

      if (generation === hydrationGenerationRef.current) {
        setCart(newCartItems);
      }
    },
    [],
  );

  const openGeneralCheckout = useCallback(() => {
    setCheckoutAppointmentId(null);
    setCheckoutTreatments([]);
    setCart([]);
    setRightPanelMode("cart");
    setSelectedOrderDetail(null);
    setIsPanelOpen(true);
  }, []);

  const openAppointmentCheckout = useCallback(
    async (apptId: string, treatments: EmbeddedPosServiceInput[]) => {
      const generation = ++hydrationGenerationRef.current;
      setCart([]);
      setCheckoutAppointmentId(apptId);
      setCheckoutTreatments(treatments);
      setRightPanelMode("cart");
      setSelectedOrderDetail(null);
      setIsPanelOpen(true);
      await hydrateCartFromTreatments(apptId, treatments, generation);
    },
    [hydrateCartFromTreatments],
  );

  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
    resetPanelState();
  }, [resetPanelState]);

  useEffect(() => {
    if (!isPanelOpen) {
      setCart([]);
      setSplitPayments([{ id: "payment-1", method: "bank_transfer", amount: 0 }]);
      setShowProcessButton(false);
      setShowSimulateButton(false);
      setOrderResult(null);
      setPendingCardIntentIds([]);
      setReaderId("");
      setSelectedOrderDetail(null);
      setRightPanelMode("cart");
      resetOrderPaymentForm();
    }
  }, [isPanelOpen, resetOrderPaymentForm]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (
        !isPanelOpen ||
        rightPanelMode !== "cart" ||
        !activeAppointmentId ||
        checkoutTreatments.length === 0
      ) {
        return;
      }
      const generation = hydrationGenerationRef.current;
      await hydrateCartFromTreatments(
        activeAppointmentId,
        checkoutTreatments,
        generation,
      );
      if (cancelled) return;
    };

    if (
      isPanelOpen &&
      rightPanelMode === "cart" &&
      activeAppointmentId &&
      checkoutTreatments.length > 0
    ) {
      run();
    }

    return () => {
      cancelled = true;
    };
  }, [
    isPanelOpen,
    rightPanelMode,
    activeAppointmentId,
    checkoutTreatments,
    hydrateCartFromTreatments,
  ]);

  useEffect(() => {
    if (skipAppointmentOrderSync) {
      return;
    }
    hydrationGenerationRef.current += 1;
    resetPanelState();
    setIsPanelOpen(false);

    if (appointmentId) {
      void fetchOrderForAppointment(appointmentId);
    } else {
      setHasOrder(false);
      setCurrentAppointmentOrder(null);
    }
  }, [
    appointmentId,
    fetchOrderForAppointment,
    resetPanelState,
    skipAppointmentOrderSync,
  ]);

  const removeFromCart = useCallback((index: number) => {
    setCart((prev) => {
      const target = prev[index];
      if (target?.appointmentSegmentId || target?.isAppointmentItem) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const updateQuantity = useCallback((index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCart((prev) => {
        const target = prev[index];
        if (target?.appointmentSegmentId || target?.isAppointmentItem) return prev;
        return prev.filter((_, i) => i !== index);
      });
    } else {
      setCart((prev) =>
        prev.map((item, i) => (i === index ? { ...item, quantity: newQuantity } : item)),
      );
    }
  }, []);

  const updatePrice = useCallback((index: number, newPrice: number) => {
    if (newPrice < 0) return;
    const roundedPrice = Math.round(newPrice * 100) / 100;
    setCart((prev) =>
      prev.map((item, i) => (i === index ? { ...item, price: roundedPrice } : item)),
    );
  }, []);

  const updateDiscount = useCallback(
    (index: number, discountValue: number, discountType: "percentage" | "fixed") => {
      setCart((prev) => {
        const item = prev[index];
        if (!item) return prev;

        if (discountType === "percentage") {
          if (discountValue < 0 || discountValue > 100) return prev;
          const roundedDiscount = Math.round(discountValue * 10) / 10;
          return prev.map((it, i) =>
            i === index
              ? {
                  ...it,
                  discountType: "percentage",
                  discountPercentage: roundedDiscount,
                  discountAmount: undefined,
                }
              : it,
          );
        }

        const maxDiscount = item.price * item.quantity;
        if (discountValue < 0 || discountValue > maxDiscount) return prev;
        const roundedDiscount = Math.round(discountValue * 100) / 100;
        return prev.map((it, i) =>
          i === index
            ? {
                ...it,
                discountType: "fixed",
                discountAmount: roundedDiscount,
                discountPercentage: undefined,
              }
            : it,
        );
      });
    },
    [],
  );

  const clearCart = useCallback(() => {
    setCart((prev) =>
      prev.filter((item) => item.appointmentSegmentId || item.isAppointmentItem),
    );
  }, []);

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
          `id, name, service_variants:service_variant(id, name, price, client_duration_minutes, vat_rate)`,
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

      setPosProducts((productsRes.data || []) as PickerProduct[]);
      setPosServices(
        ((treatmentsRes.data || []) as Array<{
          id: string;
          name: string;
          service_variants?: Array<{
            id: string;
            name: string;
            price: number;
            client_duration_minutes?: number;
            vat_rate?: number | null;
          }>;
        }>).map((tr) => ({
          id: tr.id,
          name: tr.name,
          service_variants: (tr.service_variants || []).map((option) => ({
            id: option.id,
            name: option.name,
            price: option.price,
            duration_in_minutes: Number(option.client_duration_minutes || 0),
            vat_rate: option.vat_rate,
          })),
        })),
      );
    } catch (error) {
      console.error("Error fetching items:", error);
      toast.error("Failed to load items");
    } finally {
      setLoadingItems(false);
    }
  }, [companyId, locationId]);

  const handleAddProductToCart = useCallback(
    (product: PickerProduct) => {
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

      setRecentProductIds((prev) => {
        const next = [product.id, ...prev.filter((id) => id !== product.id)];
        return next.slice(0, 10);
      });
      requestAnimationFrame(() => {
        productSearchInputRef.current?.focus();
      });
    },
    [cart, updateQuantity, t],
  );

  const handleAddServiceToCart = useCallback(
    (
      service: POSService,
      serviceVariant: {
        id: string;
        name: string;
        price: number;
        vat_rate?: number | null;
      },
    ) => {
      const grossPrice = Math.round((serviceVariant.price || 0) * 100) / 100;
      const existingItem = cart.find((item) => item.serviceVariantId === serviceVariant.id);

      if (existingItem) {
        const index = cart.findIndex((item) => item.serviceVariantId === serviceVariant.id);
        updateQuantity(index, existingItem.quantity + 1);
      } else {
        setCart((prev) => [
          ...prev,
          {
            id: service.id,
            name: `${service.name} - ${serviceVariant.name}`,
            price: grossPrice,
            quantity: 1,
            type: "service",
            serviceVariantId: serviceVariant.id,
            vatRate: serviceVariant.vat_rate || 21,
            appointmentId: activeAppointmentId || undefined,
          },
        ]);
      }
    },
    [cart, updateQuantity, activeAppointmentId],
  );

  const getSubtotal = useCallback(() => calculateSubtotal(cart), [cart]);
  const getTax = useCallback(() => calculateTax(cart), [cart]);
  const getDiscount = useCallback(() => calculateDiscount(cart), [cart]);
  const getTotal = useCallback(() => calculateTotal(cart), [cart]);
  const cartTotal = getTotal();

  useEffect(() => {
    if (previousCartTotalRef.current === null) {
      previousCartTotalRef.current = cartTotal;
      return;
    }
    const totalChanged = Math.abs(previousCartTotalRef.current - cartTotal) > 0.0001;
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

  const finishSale = useCallback(() => {
    clearCart();
    setOrderResult(null);
    setPendingCardIntentIds([]);
    setShowProcessButton(false);
    setShowSimulateButton(false);
    if (activeAppointmentId) {
      setHasOrder(true);
      fetchOrderForAppointment(activeAppointmentId);
    }
    onSaleComplete?.();
    onHistoryRefresh?.();
  }, [
    clearCart,
    activeAppointmentId,
    fetchOrderForAppointment,
    onSaleComplete,
    onHistoryRefresh,
  ]);

  const handleCompleteSale = useCallback(async () => {
    if (!companyId) {
      toast.error("Company ID not found. Please try refreshing the page.");
      return;
    }
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    if (splitHasCardAmount(splitPayments) && !chargesEnabled) {
      toast.error(tPos("pos.connect.chargesNotEnabled"));
      return;
    }

    const email = readClientEmail(clientEmail);
    if (splitHasPayLinkAmount(splitPayments) && !email) {
      toast.error(tPos("pos.payLink.emailRequired"));
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
        appointment_id: activeAppointmentId || undefined,
        client_id: clientId || undefined,
        treatments: treatments.length > 0 ? treatments : undefined,
        products: products.length > 0 ? products : undefined,
        payments,
        currency: "eur",
      });

      if (result.success && result.data) {
        setOrderResult(result);

        if (splitHasPayLinkAmount(splitPayments) && email) {
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
            toast.error(tPos("pos.payLink.emailRequired"));
            return;
          }
          if (!checkout.success) {
            toast.error(
              checkout.message ||
                checkout.error ||
                tPos("pos.payLink.failed"),
            );
            return;
          }
          toast.success(
            tPos("pos.payLink.sent", {
              email: checkout.data?.email || email,
            }),
          );
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

        finishSale();
      } else if (isChargesNotEnabledError(result)) {
        toast.error(tPos("pos.connect.chargesNotEnabled"));
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
    locationId,
    activeAppointmentId,
    clientId,
    clientEmail,
    orderDateTime,
    splitPayments,
    chargesEnabled,
    locale,
    tPos,
    finishSale,
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
        setReaderId(readerData?.id || companyReaderId);
      }

      setPendingCardIntentIds(failedIntentIds);
      if (failedIntentIds.length > 0) {
        setShowProcessButton(true);
        toast.error(
          `${failedIntentIds.length} card payment(s) failed to start. Please retry processing.`,
        );
        return;
      }

      finishSale();
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error("Failed to process payment. Please try again.");
    } finally {
      setProcessing(false);
    }
  }, [orderResult, pendingCardIntentIds, companyReaderId, finishSale]);

  const handleSimulatePayment = useCallback(async () => {
    if (!readerId || pendingCardIntentIds.length === 0) {
      toast.error("Reader ID not found");
      return;
    }
    if (!companyId) {
      toast.error("Company ID not found. Please try refreshing the page.");
      return;
    }

    const cardNumber = prompt("Enter test card number (e.g., 4242424242424242):");
    if (!cardNumber) return;

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
        finishSale();
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
  }, [readerId, pendingCardIntentIds, companyId, finishSale]);

  const parseMoneyInput = useCallback((value: string): number | null => {
    const normalized = value.trim().replace(",", ".");
    if (!normalized) return null;
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) return null;
    return Math.round(parsed * 100) / 100;
  }, []);

  const getOrderPaymentsTotalPaid = useCallback(
    () => orderPayments.reduce((sum, p) => sum + (p.amount_gross || 0), 0),
    [orderPayments],
  );

  const getRemainingPreview = useCallback(() => {
    if (!selectedOrderDetail) return 0;
    const totalAmount = selectedOrderDetail.total_amount || 0;
    const totalPaid = getOrderPaymentsTotalPaid();
    if (editingPaymentId) {
      const parsedEditAmount = parseMoneyInput(editingPaymentAmount);
      const safeDraftAmount =
        parsedEditAmount !== null && parsedEditAmount >= 0 ? parsedEditAmount : 0;
      const editingAmount =
        orderPayments.find((p) => p.id === editingPaymentId)?.amount_gross || 0;
      return totalAmount - (totalPaid - editingAmount + safeDraftAmount);
    }
    const draftNewAmount = parseMoneyInput(newPaymentAmount);
    const safeNewAmount =
      draftNewAmount !== null && draftNewAmount >= 0 ? draftNewAmount : 0;
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
        if (Math.abs(originalAmount - amount) < 0.0001) return;

        const { error: updateError } = await supabase
          .from("payment")
          .update({ amount_gross: amount })
          .eq("id", editingPaymentId)
          .eq("order_id", selectedOrderDetail.id)
          .eq("company_id", companyId);

        if (updateError) {
          toast.error(`${tPos("orders.error.paymentFailed")}: ${updateError.message}`);
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

        const { error: insertError } = await supabase.from("payment").insert({
          order_id: selectedOrderDetail.id,
          company_id: companyId,
          payment_method: newPaymentMethod,
          amount_gross: amount,
          status: "completed",
          payment_status: "completed",
          created_at: new Date().toISOString(),
        } as never);

        if (insertError) {
          toast.error(`${tPos("orders.error.paymentFailed")}: ${insertError.message}`);
          return;
        }
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
        .update({ amount_paid: totalPaid, payment_status: nextPaymentStatus })
        .eq("id", selectedOrderDetail.id);

      setSelectedOrderDetail((prev) =>
        prev ? { ...prev, payment_status: nextPaymentStatus } : prev,
      );
      resetOrderPaymentForm();
      await onHistoryRefresh?.();
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
    onHistoryRefresh,
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
          .update({ amount_paid: totalPaid, payment_status: nextPaymentStatus })
          .eq("id", selectedOrderDetail.id);

        setSelectedOrderDetail((prev) =>
          prev ? { ...prev, payment_status: nextPaymentStatus } : prev,
        );

        if (editingPaymentId === paymentId) {
          setEditingPaymentId(null);
          setEditingPaymentAmount("");
        }
        await onHistoryRefresh?.();
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
      onHistoryRefresh,
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
      setIsPanelOpen(false);
      resetOrderPaymentForm();
      await onHistoryRefresh?.();
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
    onHistoryRefresh,
  ]);

  useEffect(() => {
    const q = productSearchQuery.trim();
    if (!q) return;
    setShowInlineProductPicker(true);
    if (posProducts.length === 0) fetchItems();
  }, [productSearchQuery, posProducts.length, fetchItems]);

  useEffect(() => {
    if (!showInlineProductPicker) return;
    const handlePointerDown = (event: PointerEvent) => {
      const container = inlinePickerContainerRef.current;
      if (!container) return;
      if (!(event.target instanceof Node)) return;
      if (!container.contains(event.target)) {
        setShowInlineProductPicker(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [showInlineProductPicker]);

  useEffect(() => {
    if (posProducts.length === 0) return;
    setCollapsedPickerLineKeys((prev) => {
      const next = { ...prev };
      for (const product of posProducts) {
        const lineKey = product.product_line_id ?? FILTER_NO_PRODUCT_LINE;
        if (!(lineKey in next)) {
          next[lineKey] = true;
        }
      }
      return next;
    });
  }, [posProducts]);

  useEffect(() => {
    if (posServices.length === 0) return;
    setCollapsedPickerTreatmentKeys((prev) => {
      const next = { ...prev };
      for (const service of posServices) {
        if (!(service.id in next)) {
          next[service.id] = true;
        }
      }
      return next;
    });
  }, [posServices]);

  const pickerFilteredProducts = useMemo(() => {
    const q = productSearchQuery.trim().toLowerCase();

    const next = posProducts.filter((p) => {
      if (!q) return true;
      const hay = `${p.name || ""} ${p.sku || ""} ${p.barcode || ""}`
        .toLowerCase()
        .trim();
      return hay.includes(q);
    });

    next.sort((a, b) => {
      const lineA = a.product_line?.name ?? "";
      const lineB = b.product_line?.name ?? "";
      const lineCmp = lineA.localeCompare(lineB, undefined, { sensitivity: "base" });
      if (lineCmp !== 0) return lineCmp;
      return (a.name ?? "").localeCompare(b.name ?? "", undefined, {
        sensitivity: "base",
      });
    });
    return next;
  }, [posProducts, productSearchQuery]);

  const pickerGroups = useMemo(() => {
    const groups = new Map<string, { title: string; items: PickerProduct[] }>();
    for (const p of pickerFilteredProducts) {
      const lineKey = p.product_line_id ?? FILTER_NO_PRODUCT_LINE;
      const title =
        p.product_line?.name?.trim() || t("sheet.inlinePicker.noProductLine");
      const existing = groups.get(lineKey);
      if (existing) {
        existing.items.push(p);
      } else {
        groups.set(lineKey, { title, items: [p] });
      }
    }
    return Array.from(groups.entries()).map(([lineKey, g]) => ({
      lineKey,
      title: g.title,
      items: g.items,
      count: g.items.length,
    }));
  }, [pickerFilteredProducts, t]);

  const pickerTreatmentGroups = useMemo(() => {
    const q = productSearchQuery.trim().toLowerCase();

    return posServices
      .map((service) => {
        const options = (service.service_variants || []).filter((option) => {
          if (!q) return true;
          const serviceMatches = (service.name || "")
            .toLowerCase()
            .includes(q);
          const optionMatches = (option.name || "").toLowerCase().includes(q);
          return serviceMatches || optionMatches;
        });

        if (options.length === 0) return null;

        return {
          serviceKey: service.id,
          title: service.name || t("sheet.unnamedProduct"),
          service,
          options,
          count: options.length,
        };
      })
      .filter((group): group is NonNullable<typeof group> => group !== null)
      .sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
      );
  }, [posServices, productSearchQuery, t]);

  const pickerRecentProducts = useMemo(() => {
    if (recentProductIds.length === 0) return [];
    const byId = new Map(posProducts.map((p) => [p.id, p]));
    return recentProductIds
      .map((id) => byId.get(id))
      .filter((p): p is PickerProduct => Boolean(p));
  }, [recentProductIds, posProducts]);

  return {
    isPanelOpen,
    setIsPanelOpen,
    rightPanelMode,
    setRightPanelMode,
    hasOrder,
    currentAppointmentOrder,
    openOrderDetailPanel,
    openGeneralCheckout,
    openAppointmentCheckout,
    closePanel,
    terminate,
    fetchOrderForAppointment,
    mapAppointmentSegmentsToInput,
    clientDisplayName,
    cart,
    posProducts,
    posServices,
    loadingItems,
    fetchItems,
    removeFromCart,
    updateQuantity,
    updatePrice,
    updateDiscount,
    handleAddProductToCart,
    handleAddServiceToCart,
    editingPriceIndex,
    setEditingPriceIndex,
    editingDiscountIndex,
    setEditingDiscountIndex,
    priceInputWidths,
    setPriceInputWidths,
    discountInputWidths,
    setDiscountInputWidths,
    priceSpanRefs,
    discountSpanRefs,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    splitPayments,
    setSplitPayments,
    orderDateTime,
    setOrderDateTime,
    handleCompleteSale,
    handleProcessPayment,
    handleSimulatePayment,
    companyReaderId,
    processing,
    showProcessButton,
    showSimulateButton,
    getSubtotal,
    getTax,
    getDiscount,
    getTotal,
    selectedOrderDetail,
    orderPayments,
    isLoadingOrderPayments,
    isSavingOrderPayment,
    isDeletingOrder,
    deletingPaymentId,
    pendingDeleteTarget,
    setPendingDeleteTarget,
    editingPaymentId,
    setEditingPaymentId,
    editingPaymentAmount,
    setEditingPaymentAmount,
    newPaymentMethod,
    setNewPaymentMethod,
    newPaymentAmount,
    setNewPaymentAmount,
    handleEditOrderPayment,
    handleSaveOrderPayment,
    handleDeleteOrder,
    handleDeleteOrderPayment,
    getOrderPaymentsTotalPaid,
    getRemainingPreview,
    editingPaymentInputRef,
    showInlineProductPicker,
    setShowInlineProductPicker,
    productSearchQuery,
    setProductSearchQuery,
    productSearchInputRef,
    inlinePickerContainerRef,
    pickerGroups,
    pickerRecentProducts,
    collapsedPickerLineKeys,
    setCollapsedPickerLineKeys,
    collapsedPickerTreatmentKeys,
    setCollapsedPickerTreatmentKeys,
    pickerTreatmentGroups,
    resetOrderPaymentForm,
    cartLength: cart.length,
  };
}

export type EmbeddedPosState = ReturnType<typeof useEmbeddedPos>;
