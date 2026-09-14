"use client";

import { useEffect, useState, useCallback } from "react";
import {
  RiCloseLargeLine,
  RiLoader4Line,
  RiPhoneLine,
  RiMailLine,
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiEditLine,
  RiCashLine,
} from "@remixicon/react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  fetchClientHistory,
  type ClientHistory as ClientHistoryType,
} from "@/lib/api/client/queries";
import { useLocationId } from "@/lib/company-util";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmbeddedPosPanel, useEmbeddedPos } from "@/components/embedded-pos";
import type { EmbeddedPosServiceInput } from "@/components/embedded-pos";
import {
  formatHistoryAppointmentTitle,
  formatHistoryOrderItemName,
  getHistoryPaymentVisualState,
} from "@/lib/client-history/history-display-utils";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

export type ClientDetailSheetProps = {
  clientId: string | null;
  companyId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
};

export function ClientDetailSheet({
  clientId,
  companyId,
  isOpen,
  onClose,
  onUpdated,
}: ClientDetailSheetProps) {
  const t = useTranslations("cancelAppointment");
  const tAppointments = useTranslations("appointments");
  const tCommon = useTranslations("common");
  const tClients = useTranslations("clients");
  const isMobile = useIsMobile();
  const locationId = useLocationId();

  const [history, setHistory] = useState<ClientHistoryType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [expandedHistoryImages, setExpandedHistoryImages] = useState<
    Set<string>
  >(new Set());

  const fetchHistory = useCallback(async () => {
    if (!clientId) {
      setHistory(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await fetchClientHistory(
        clientId,
        companyId ?? undefined,
        locationId,
      );
      if (fetchError) {
        setError(fetchError.message);
        setHistory(null);
        return;
      }
      setHistory(data);
    } catch (err) {
      console.error("Error fetching client history:", err);
      setError(err instanceof Error ? err.message : "Failed to load");
      setHistory(null);
    } finally {
      setLoading(false);
    }
  }, [clientId, companyId, locationId]);

  const pos = useEmbeddedPos({
    companyId,
    clientId: clientId ?? undefined,
    clientEmail: history?.client?.email ?? email,
    onSaleComplete: () => {
      void fetchHistory();
      onUpdated?.();
    },
    onHistoryRefresh: fetchHistory,
    clientDisplayName:
      history?.client?.first_name && history?.client?.last_name
        ? {
            first_name: history.client.first_name,
            last_name: history.client.last_name,
          }
        : null,
  });

  const handleCashClick = useCallback(() => {
    if (isMobile) {
      toast.error(tClients("checkoutMobileUnavailable"));
      return;
    }
    if (pos.isPanelOpen) {
      pos.closePanel();
      return;
    }
    pos.openGeneralCheckout();
  }, [isMobile, pos, tClients]);

  const handleAppointmentCheckout = useCallback(
    (appointmentId: string, services: EmbeddedPosServiceInput[]) => {
      if (isMobile) {
        toast.error(tClients("checkoutMobileUnavailable"));
        return;
      }
      void pos.openAppointmentCheckout(appointmentId, services);
    },
    [isMobile, pos, tClients],
  );

  useEffect(() => {
    if (isOpen && clientId) {
      fetchHistory();
    } else if (!isOpen) {
      setHistory(null);
      setError(null);
      setIsEditMode(false);
      setIsSaving(false);
      setExpandedHistoryImages(new Set());
    }
  }, [isOpen, clientId, fetchHistory]);

  useEffect(() => {
    if (isOpen && history?.client) {
      setFirstName(history.client.first_name ?? "");
      setLastName(history.client.last_name ?? "");
      setEmail(history.client.email ?? "");
      setPhone(history.client.phone ?? "");
    }
  }, [isOpen, history]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleEnterEditMode = useCallback(() => {
    if (!history?.client) return;
    setFirstName(history.client.first_name ?? "");
    setLastName(history.client.last_name ?? "");
    setEmail(history.client.email ?? "");
    setPhone(history.client.phone ?? "");
    setIsEditMode(true);
  }, [history]);

  const handleCancelEdit = useCallback(() => {
    if (history?.client) {
      setFirstName(history.client.first_name ?? "");
      setLastName(history.client.last_name ?? "");
      setEmail(history.client.email ?? "");
      setPhone(history.client.phone ?? "");
    }
    setIsEditMode(false);
  }, [history]);

  const copyToClipboard = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast.success(tCommon("copied"), { duration: 1200 });
      } catch (error) {
        console.error("Failed to copy:", error);
        toast.error(tCommon("errorOccurred"));
      }
    },
    [tCommon],
  );

  const handleSave = useCallback(async () => {
    if (!clientId) return;
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.error(tClients("error.missingFields"));
      return;
    }

    try {
      setIsSaving(true);
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("client")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
        })
        .eq("id", clientId);

      if (updateError) {
        console.error("Error updating client:", updateError);
        toast.error(tClients("error.updateFailed"));
        return;
      }

      toast.success(tClients("success.updated"));
      setIsEditMode(false);
      await fetchHistory();
      onUpdated?.();
    } catch (err) {
      console.error("Error updating client:", err);
      toast.error(tClients("error.updateFailed"));
    } finally {
      setIsSaving(false);
    }
  }, [
    clientId,
    email,
    fetchHistory,
    firstName,
    lastName,
    onUpdated,
    phone,
    tClients,
  ]);

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
            : pos.isPanelOpen
              ? "w-[864px] sm:max-w-[864px]"
              : "w-full sm:w-[480px] sm:max-w-[480px]",
          "!gap-0 !p-0",
        )}
      >
        <div className="flex h-full min-h-0 overflow-hidden bg-white">
          <div
            className={cn(
              "flex flex-col h-full min-h-0 overflow-hidden bg-white flex-shrink-0",
              isMobile ? "w-full" : "w-full sm:w-[480px]",
            )}
          >
            <div className="border-b-1">
              {isMobile && (
                <div className="flex justify-center pt-3 pb-2">
                  <div className="w-12 h-1 bg-gray-300 rounded-full" />
                </div>
              )}
              <SheetHeader>
                <div className="flex justify-between items-center w-full p-4 pb-3">
                  <SheetTitle className="text-xl font-semibold text-gray-900">
                    {t("clientDetails")}
                  </SheetTitle>
                  <div className="flex items-center gap-2">
                    {history && !loading && !isEditMode ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCashClick}
                        className="h-8 w-8 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                        aria-label={tClients("checkout")}
                        title={tClients("checkoutGeneral")}
                      >
                        <RiCashLine size={18} />
                      </Button>
                    ) : null}
                    {history && !loading ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          isEditMode ? handleCancelEdit() : handleEnterEditMode()
                        }
                        className="h-8 w-8 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                        aria-label={tCommon(isEditMode ? "cancel" : "edit")}
                      >
                        <RiEditLine size={18} />
                      </Button>
                    ) : null}
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
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RiLoader4Line
                    size={24}
                    className="animate-spin text-gray-400"
                  />
                </div>
              ) : history ? (
                <div className={cn("space-y-8", isMobile ? "py-4" : "py-6")}>
                  {/* Client info - same layout as appointment sheet */}
                  {!isEditMode ? (
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-semibold text-lg flex-shrink-0">
                        {history.client.first_name?.[0]?.toUpperCase() || ""}
                        {history.client.last_name?.[0]?.toUpperCase() || ""}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">
                          {history.client.first_name} {history.client.last_name}
                        </h4>
                        <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
                          {history.client.phone && (
                            <>
                              <RiPhoneLine
                                size={16}
                                className="text-gray-400 flex-shrink-0"
                              />
                              <span
                                onClick={() =>
                                  void copyToClipboard(history.client.phone!)
                                }
                                className="cursor-pointer hover:text-gray-900 transition-colors"
                                title={tAppointments("sheet.actions.clickToCopy")}
                              >
                                {history.client.phone}
                              </span>
                            </>
                          )}
                          {history.client.phone && history.client.email && (
                            <span className="text-gray-400">•</span>
                          )}
                          {history.client.email && (
                            <>
                              <RiMailLine
                                size={16}
                                className="text-gray-400 flex-shrink-0"
                              />
                              <span
                                onClick={() =>
                                  void copyToClipboard(history.client.email!)
                                }
                                className="cursor-pointer hover:text-gray-900 transition-colors truncate"
                                title={tAppointments("sheet.actions.clickToCopy")}
                              >
                                {history.client.email}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="client-edit-first-name">
                            {tAppointments("form.clientFirstName")}
                          </Label>
                          <Input
                            id="client-edit-first-name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="text-base"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="client-edit-last-name">
                            {tAppointments("form.clientLastName")}
                          </Label>
                          <Input
                            id="client-edit-last-name"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="text-base"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="client-edit-email">
                            {tCommon("email")}
                          </Label>
                          <Input
                            id="client-edit-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="text-base"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="client-edit-phone">
                            {tCommon("phone")}
                          </Label>
                          <Input
                            id="client-edit-phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="text-base"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Client History - same section as appointment sheet */}
                  <div className="pt-6 border-t border-gray-200">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">
                      {t("clientHistory")}
                    </h3>
                    {history.timeline.length > 0 ? (
                      <div className="space-y-4 max-h-96 overflow-y-auto overflow-x-hidden overscroll-x-none pr-1">
                        {history.timeline.map((entry, index) => {
                          const paymentVisual =
                            entry.type === "appointment"
                              ? getHistoryPaymentVisualState(entry.appointment)
                              : getHistoryPaymentVisualState({
                                  order: entry.order,
                                });

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
                            const itemSummary = order.orderItems
                              .map((item) =>
                                formatHistoryOrderItemName(
                                  item,
                                  tCommon("unknown"),
                                ),
                              )
                              .filter(Boolean)
                              .join(", ");

                            return (
                              <div key={`order-${order.id}`} className="relative">
                                {index < history.timeline.length - 1 && (
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
                                      {itemSummary ||
                                        tAppointments("sheet.standaloneSale")}
                                    </div>
                                    <div className="text-xs text-gray-500 mb-2">
                                      {formattedDate} {tAppointments("sheet.at")}{" "}
                                      {formattedTime}
                                    </div>
                                    <div
                                      className="space-y-2 mb-2 cursor-pointer rounded-md p-2 bg-gray-50 hover:bg-gray-100 transition-colors"
                                      onClick={() =>
                                        void pos.openOrderDetailPanel({
                                          id: order.id,
                                          order_number: order.order_number,
                                          total_amount: order.total_amount,
                                          payment_status: order.payment_status,
                                          items: order.orderItems.map((item) => ({
                                            ...item,
                                            discount_amount:
                                              item.discount_amount ?? null,
                                          })),
                                        })
                                      }
                                    >
                                      <div className="text-xs text-gray-500">
                                        {tAppointments("sheet.standaloneSale")}
                                      </div>
                                      {order.order_number && (
                                        <div className="text-xs text-gray-500 break-all">
                                          {t("orderNumber", {
                                            number: order.order_number,
                                          })}
                                        </div>
                                      )}
                                      {order.orderItems.length > 0 && (
                                        <div className="space-y-1 mt-2 p-2 bg-gray-50 rounded-md overflow-x-hidden">
                                          <div className="text-xs font-medium text-gray-700 mb-1">
                                            {t("items")}:
                                          </div>
                                          {order.orderItems.map((item, idx) => {
                                            const itemName =
                                              formatHistoryOrderItemName(
                                                item,
                                                tCommon("unknown"),
                                              );
                                            const quantity = item.quantity || 1;
                                            const unitPrice = item.unit_price || 0;
                                            const total =
                                              item.total ?? unitPrice * quantity;
                                            return (
                                              <div
                                                key={item.id || idx}
                                                className="text-xs text-gray-600 flex justify-between items-center gap-2 min-w-0"
                                              >
                                                <span className="min-w-0 break-words pr-2">
                                                  {quantity}x {itemName}
                                                </span>
                                                <span className="font-medium shrink-0">
                                                  €{total.toFixed(2)}
                                                </span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                      <div className="text-xs text-gray-500 font-medium">
                                        Total: €
                                        {order.total_amount?.toFixed(2) ??
                                          tAppointments("common.notAvailable")}
                                      </div>
                                      <div className="text-xs text-gray-500 font-medium">
                                        {tAppointments("orderPanel.summary.paid")}: €
                                        {order.amount_paid.toFixed(2)}
                                      </div>
                                      {order.payment_status && (
                                        <div className="text-xs">
                                          <span className="text-gray-500">
                                            Status:{" "}
                                          </span>
                                          <span
                                            className={cn(
                                              "font-medium",
                                              order.payment_status === "paid"
                                                ? "text-green-600"
                                                : order.payment_status ===
                                                      "unpaid" ||
                                                    order.payment_status ===
                                                      "pending"
                                                  ? "text-yellow-600"
                                                  : order.payment_status ===
                                                      "failed"
                                                    ? "text-red-600"
                                                    : "text-gray-600",
                                            )}
                                          >
                                            {order.payment_status
                                              .charAt(0)
                                              .toUpperCase() +
                                              order.payment_status.slice(1)}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          const appointment = entry.appointment;
                          const appointmentDate = new Date(appointment.start);
                          const appointmentEnd = new Date(appointment.end);
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

                          return (
                            <div
                              key={appointment.id}
                              className="relative"
                            >
                              {index < history.timeline.length - 1 && (
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
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <div className="text-sm font-medium text-gray-900 break-words min-w-0">
                                      {formatHistoryAppointmentTitle(
                                        appointment,
                                        tAppointments("sheet.noTreatment"),
                                      )}
                                    </div>
                                    {!appointment.is_canceled && !appointment.order ? (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="shrink-0 h-7 text-xs"
                                        onClick={() =>
                                          handleAppointmentCheckout(
                                            appointment.id,
                                            appointment.services,
                                          )
                                        }
                                      >
                                        {tClients("checkout")}
                                      </Button>
                                    ) : null}
                                  </div>
                                  <div className="text-xs text-gray-500 mb-2">
                                    {formattedDate} at {formattedTime} -{" "}
                                    {formattedEndTime}
                                  </div>
                                  {appointment.staff && (
                                    <div className="text-xs text-gray-500 mb-2">
                                      {tAppointments("form.staff")}:{" "}
                                      {appointment.staff.first_name}{" "}
                                      {appointment.staff.last_name}
                                    </div>
                                  )}
                                  {appointment.order && (
                                    <div
                                      className="space-y-2 mb-2 cursor-pointer rounded-md p-2 bg-gray-50 hover:bg-gray-100 transition-colors"
                                      onClick={() =>
                                        void pos.openOrderDetailPanel({
                                          id: appointment.order!.id,
                                          order_number:
                                            appointment.order!.order_number,
                                          total_amount:
                                            appointment.order!.total_amount,
                                          payment_status:
                                            appointment.order!.payment_status,
                                          items: appointment.orderItems.map(
                                            (item) => ({
                                              ...item,
                                              discount_amount: null,
                                            }),
                                          ),
                                        })
                                      }
                                    >
                                      {appointment.order.order_number && (
                                        <div className="text-xs text-gray-500 break-all">
                                          {t("orderNumber", {
                                            number: appointment.order
                                              .order_number,
                                          })}
                                        </div>
                                      )}
                                      {appointment.orderItems?.length > 0 && (
                                        <div className="space-y-1 mt-2 p-2 bg-gray-50 rounded-md overflow-x-hidden">
                                          <div className="text-xs font-medium text-gray-700 mb-1">
                                            {t("items")}:
                                          </div>
                                          {appointment.orderItems.map(
                                            (item, idx) => {
                                              const itemName =
                                                item.product?.name ||
                                                (item.service?.name &&
                                                item.service_variant?.name
                                                  ? `${item.service.name} - ${item.service_variant.name}`
                                                  : item.service_variant?.service
                                                      ?.name &&
                                                      item.service_variant?.name
                                                    ? `${item.service_variant.service.name} - ${item.service_variant.name}`
                                                    : item.service?.name ||
                                                      item.service_variant?.name) ||
                                                tCommon("unknown");
                                              const quantity =
                                                item.quantity || 1;
                                              const unitPrice =
                                                item.unit_price || 0;
                                              const total =
                                                item.total ??
                                                unitPrice * quantity;
                                              return (
                                                <div
                                                  key={item.id || idx}
                                                  className="text-xs text-gray-600 flex justify-between items-center gap-2 min-w-0"
                                                >
                                                  <span className="min-w-0 break-words pr-2">
                                                    {quantity}x {itemName}
                                                  </span>
                                                  <span className="font-medium shrink-0">
                                                    €{total.toFixed(2)}
                                                  </span>
                                                </div>
                                              );
                                            },
                                          )}
                                        </div>
                                      )}
                                      <div className="text-xs text-gray-500 font-medium">
                                        Total: €
                                        {appointment.order.total_amount?.toFixed(
                                          2,
                                        ) ?? tAppointments("common.notAvailable")}
                                      </div>
                                      <div className="text-xs text-gray-500 font-medium">
                                        {tAppointments("orderPanel.summary.paid")}: €
                                        {(appointment.order.amount_paid || 0).toFixed(2)}
                                      </div>
                                      {appointment.order.payment_status && (
                                        <div className="text-xs">
                                          <span className="text-gray-500">
                                            Status:{" "}
                                          </span>
                                          <span
                                            className={cn(
                                              "font-medium",
                                              appointment.order
                                                .payment_status === "paid"
                                                ? "text-green-600"
                                                : appointment.order
                                                    .payment_status ===
                                                    "unpaid" ||
                                                  appointment.order
                                                    .payment_status ===
                                                    "pending"
                                                ? "text-yellow-600"
                                                : appointment.order
                                                    .payment_status ===
                                                    "failed"
                                                  ? "text-red-600"
                                                  : "text-gray-600",
                                            )}
                                          >
                                            {appointment.order.payment_status
                                              .charAt(0)
                                              .toUpperCase() +
                                              appointment.order.payment_status.slice(
                                                1,
                                              )}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {appointment.notes && (
                                    <div className="mt-2">
                                      <div className="text-xs font-medium text-gray-500 mb-1">
                                        {tAppointments("form.clientNotes")}:
                                      </div>
                                      <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                        {appointment.notes}
                                      </div>
                                    </div>
                                  )}
                                  {appointment.staff_notes && (
                                    <div className="mt-2">
                                      <div className="text-xs font-medium text-gray-500 mb-1">
                                        {tAppointments("form.staffNotes")}:
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
                                        <span className="text-xs font-medium text-gray-500">
                                          {tAppointments("form.resultImage")}
                                        </span>
                                      </CollapsibleTrigger>
                                      <CollapsibleContent>
                                        <div className="relative mt-2 h-40 w-40">
                                          {SUPABASE_URL && (
                                            <img
                                              src={`${SUPABASE_URL}/storage/v1/object/public/company/${appointment.staff_image_path}`}
                                              alt="Result"
                                              className="h-full w-full rounded-lg border border-gray-200 object-cover"
                                            />
                                          )}
                                        </div>
                                      </CollapsibleContent>
                                    </Collapsible>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        {tAppointments("sheet.noClientHistory")}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500 text-sm">
                  No client data available
                </div>
              )}
            </div>

            {isEditMode ? (
              <div className="border-t border-gray-100 p-4 mt-auto">
                <div className="flex w-full gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                  >
                    {tCommon("cancel")}
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? tCommon("loading") : tCommon("save")}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          {pos.isPanelOpen && !isMobile && <EmbeddedPosPanel pos={pos} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}
