import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { useConnectCharges } from "@/lib/api/billing/use-connect-charges";
import { resolveCardSaleFollowup } from "@/lib/api/pos/card-checkout";
import {
  createOrderWithPaymentV3,
  isChargesNotEnabledError,
  processPayment,
  simulatePayment,
  type CreateOrderWithPaymentV3Response,
} from "@/lib/api/pos/mutations/create-order";
import {
  createPaymentCheckout,
  buildPayLinkReturnUrls,
  isClientEmailRequiredError,
  readClientEmail,
} from "@/lib/api/pos/mutations/payment-create-checkout";
import type { Appointment, CartItem } from "../types";
import { getDefaultOrderDateTime } from "../payment-section";
import {
  buildOrderCreatePayments,
  splitHasCardAmount,
  splitHasPayLinkAmount,
  splitHasTerminalAmount,
  splitPayLinkAmount,
  type SplitPayment,
} from "../payment-methods";

function resolveCartClient(appointments: Appointment[], selectedIds: string[]) {
  for (const id of selectedIds) {
    const appointment = appointments.find((item) => item.id === id);
    if (!appointment?.client) continue;
    return {
      clientId: appointment.client.id,
      email: readClientEmail(appointment.client.email),
    };
  }
  return { clientId: null as string | null, email: null as string | null };
}

export function usePaymentProcessing(
  companyId: string | null,
  locationId: string | null,
  companyReaderId: string | null,
  cart: CartItem[],
  selectedAppointmentIds: string[],
  appointments: Appointment[],
  clearCart: () => void,
  setSelectedAppointmentIds: React.Dispatch<React.SetStateAction<string[]>>,
  onAppointmentsRemoved?: (appointmentIds: string[]) => void
) {
  const t = useTranslations("pos");
  const locale = useLocale();
  const { chargesEnabled } = useConnectCharges(companyId);
  const [processing, setProcessing] = useState(false);
  const [orderResult, setOrderResult] =
    useState<CreateOrderWithPaymentV3Response | null>(null);
  const [showProcessButton, setShowProcessButton] = useState(false);
  const [showSimulateButton, setShowSimulateButton] = useState(false);
  const [readerId, setReaderId] = useState<string>("");
  const [pendingCardIntentIds, setPendingCardIntentIds] = useState<string[]>(
    []
  );

  const finishSale = () => {
    if (onAppointmentsRemoved) {
      onAppointmentsRemoved(selectedAppointmentIds);
    }
    clearCart();
    setSelectedAppointmentIds([]);
    setOrderResult(null);
    setPendingCardIntentIds([]);
    setShowProcessButton(false);
    setShowSimulateButton(false);
    setReaderId("");
  };

  const getItemDiscountAmount = (item: CartItem): number => {
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

  const completeSale = async (
    splitPayments: SplitPayment[],
    orderDateTime?: string
  ) => {
    if (!companyId) {
      toast.error("Company ID not found. Please try refreshing the page.");
      return;
    }

    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    if (splitHasCardAmount(splitPayments) && !chargesEnabled) {
      toast.error(t("connect.chargesNotEnabled"));
      return;
    }

    const client = resolveCartClient(appointments, selectedAppointmentIds);
    if (splitHasPayLinkAmount(splitPayments) && !client.email) {
      toast.error(t("payLink.emailRequired"));
      return;
    }

    setProcessing(true);
    try {
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

      const primaryAppointmentId =
        selectedAppointmentIds.length > 0
          ? selectedAppointmentIds[0]
          : undefined;

      const payments = buildOrderCreatePayments(splitPayments);

      if (payments.length === 0) {
        toast.error("Please add at least one payment amount greater than 0.");
        return;
      }

      const hasItems = treatments.length > 0 || products.length > 0;
      if (!hasItems) {
        toast.error("Please add at least one treatment or product.");
        return;
      }

      const result = await createOrderWithPaymentV3({
        company_id: companyId,
        ...(locationId ? { location_id: locationId } : {}),
        date: orderDateTime || getDefaultOrderDateTime(),
        appointment_id: primaryAppointmentId,
        ...(client.clientId ? { client_id: client.clientId } : {}),
        treatments: treatments.length > 0 ? treatments : undefined,
        products: products.length > 0 ? products : undefined,
        payments,
        currency: "eur",
      });

      if (result.success && result.data) {
        setOrderResult(result);

        if (splitHasPayLinkAmount(splitPayments)) {
          const urls = buildPayLinkReturnUrls(window.location.origin, locale);
          const checkout = await createPaymentCheckout({
            company_id: companyId,
            order_id: result.data.order_id,
            success_url: urls.success_url,
            cancel_url: urls.cancel_url,
            amount: splitPayLinkAmount(splitPayments),
            ...(client.email ? { client_email: client.email } : {}),
            ...(locationId ? { location_id: locationId } : {}),
          });

          if (isClientEmailRequiredError(checkout) || !client.email) {
            toast.error(t("payLink.emailRequired"));
            return;
          }
          if (!checkout.success) {
            toast.error(checkout.message || checkout.error || t("payLink.failed"));
            return;
          }
          toast.success(
            t("payLink.sent", { email: checkout.data?.email || client.email }),
          );
        }

        const followup = resolveCardSaleFollowup({
          requestedTerminal: splitHasTerminalAmount(splitPayments),
          data: result.data,
        });

        if (followup.kind === "terminal") {
          setPendingCardIntentIds(followup.intentIds);
          setShowProcessButton(true);
          toast.success(
            `Order created. ${followup.intentIds.length} card payment(s) ready for terminal processing.`
          );
          return;
        }

        toast.success(`Order created successfully.`);
        finishSale();
      } else if (isChargesNotEnabledError(result)) {
        toast.error(t("connect.chargesNotEnabled"));
      } else {
        toast.error(
          `Error creating order: ${result.error}${
            result.message ? ` - ${result.message}` : ""
          }`
        );
      }
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("Failed to create order. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleProcessPayment = async () => {
    if (!orderResult?.data?.order_id) {
      toast.error("Missing order ID");
      return;
    }

    if (pendingCardIntentIds.length === 0) {
      toast.info("No pending card payments.");
      setShowProcessButton(false);
      return;
    }

    setProcessing(true);
    try {
      const failedIntentIds: string[] = [];

      if (!companyReaderId) {
        toast.error("No terminal reader configured for this company.");
        return;
      }

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
          `${failedIntentIds.length} card payment(s) failed to start. Please retry processing.`
        );
        return;
      }

      toast.success("Card payments sent to terminal.");
      finishSale();
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error("Failed to process payment. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleSimulatePayment = async () => {
    if (!readerId || pendingCardIntentIds.length === 0) {
      toast.error("Reader ID not found");
      return;
    }

    if (!companyId) {
      toast.error("Company ID not found. Please try refreshing the page.");
      return;
    }

    const cardNumber = prompt(
      "Enter test card number (e.g., 4242424242424242):"
    );
    if (!cardNumber) {
      return;
    }

    setProcessing(true);
    try {
      const result = await simulatePayment(
        companyId,
        readerId,
        pendingCardIntentIds[0]!,
        cardNumber
      );

      if (result.success) {
        toast.success("Payment simulation successful.");
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
  };

  return {
    processing,
    orderResult,
    showProcessButton,
    showSimulateButton,
    completeSale,
    handleProcessPayment,
    handleSimulatePayment,
  };
}
