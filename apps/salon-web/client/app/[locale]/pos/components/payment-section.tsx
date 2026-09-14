import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { format } from "date-fns";
import { CalendarIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildBillingPagePath } from "@/lib/api/billing";
import { useConnectCharges } from "@/lib/api/billing/use-connect-charges";
import { useCompanyId } from "@/lib/company-util";
import { cn } from "@/lib/utils";
import {
  isStripeChargeMethod,
  paymentMethodMessageKey,
  splitHasCardAmount,
  type PaymentMethod,
  type SplitPayment,
} from "./payment-methods";

export type { PaymentMethod, SplitPayment } from "./payment-methods";
export { splitHasCardAmount } from "./payment-methods";

const pad = (value: number) => value.toString().padStart(2, "0");

export const getDefaultOrderDateTime = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate(),
  )}T${pad(now.getHours())}:${pad(now.getMinutes())}:00`;
};

const toDatePart = (dateTime: string): string => {
  const match = dateTime.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match?.[1]) return match[1];
  return getDefaultOrderDateTime().slice(0, 10);
};

const toTimePart = (dateTime: string): string => {
  const match = dateTime.match(/T(\d{2}:\d{2})/);
  if (match?.[1]) return match[1];
  return getDefaultOrderDateTime().slice(11, 16);
};

const parseDatePart = (value: string): Date | undefined => {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
};

interface PaymentSectionProps {
  selectedPaymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onCompleteSale: () => void;
  onProcessPayment: () => void;
  onSimulatePayment: () => void;
  processing: boolean;
  showProcessButton: boolean;
  showSimulateButton: boolean;
  getSubtotal: () => number;
  getTax: () => number;
  getDiscount: () => number;
  getTotal: () => number;
  cartLength: number;
  isMobile?: boolean;
  splitPayments?: SplitPayment[];
  onSplitPaymentsChange?: (payments: SplitPayment[]) => void;
  enableSplitPayments?: boolean;
  orderDateTime?: string;
  onOrderDateTimeChange?: (value: string) => void;
  terminalAvailable?: boolean;
}

export function PaymentSection({
  selectedPaymentMethod,
  onPaymentMethodChange,
  onCompleteSale,
  onProcessPayment,
  onSimulatePayment,
  processing,
  showProcessButton,
  showSimulateButton,
  getSubtotal,
  getTax,
  getDiscount,
  getTotal,
  cartLength,
  isMobile = false,
  splitPayments,
  onSplitPaymentsChange,
  enableSplitPayments = false,
  orderDateTime,
  onOrderDateTimeChange,
  terminalAvailable = false,
}: PaymentSectionProps) {
  const t = useTranslations();
  const locale = useLocale();
  const companyId = useCompanyId();
  const { chargesEnabled, statusKnown } = useConnectCharges(companyId);
  const billingHref = buildBillingPagePath(locale);
  const [amountDrafts, setAmountDrafts] = useState<Record<string, string>>({});
  const [dateValue, setDateValue] = useState<string>(() =>
    toDatePart(orderDateTime || getDefaultOrderDateTime()),
  );
  const [timeValue, setTimeValue] = useState<string>(() =>
    toTimePart(orderDateTime || getDefaultOrderDateTime()),
  );
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const discount = getDiscount();
  const total = getTotal();
  const paymentMethods: PaymentMethod[] = terminalAvailable
    ? ["cash", "card", "terminal", "pay_link", "invoice", "bank_transfer"]
    : ["cash", "card", "pay_link", "invoice", "bank_transfer"];
  const splitModeEnabled =
    enableSplitPayments && !!splitPayments && !!onSplitPaymentsChange;
  const allocatedAmount = splitModeEnabled
    ? splitPayments!.reduce((sum, p) => sum + (p.amount || 0), 0)
    : total;
  const remainingAmount = total - allocatedAmount;
  const remainingClass =
    remainingAmount < 0
      ? "text-red-600"
      : remainingAmount === 0
        ? "text-green-600"
        : "text-yellow-600";
  const hasCardAmount = splitModeEnabled
    ? splitHasCardAmount(splitPayments)
    : isStripeChargeMethod(selectedPaymentMethod);
  const cardBlocked = !chargesEnabled;
  const completeSaleBlocked = hasCardAmount && cardBlocked;

  useEffect(() => {
    const next = orderDateTime || getDefaultOrderDateTime();
    setDateValue(toDatePart(next));
    setTimeValue(toTimePart(next));
  }, [orderDateTime]);

  const getMethodLabel = (method: PaymentMethod) => {
    return t(`pos.paymentMethods.${paymentMethodMessageKey(method)}`);
  };

  const updateSplitAmount = (paymentId: string, value: string) => {
    if (!splitModeEnabled) return;
    setAmountDrafts((prev) => ({ ...prev, [paymentId]: value }));

    if (value.trim() === "") {
      const next = splitPayments!.map((p) =>
        p.id === paymentId ? { ...p, amount: 0 } : p,
      );
      onSplitPaymentsChange!(next);
      return;
    }

    const parsed = parseFloat(value);
    const nextAmount = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    const next = splitPayments!.map((p) =>
      p.id === paymentId ? { ...p, amount: nextAmount } : p,
    );
    onSplitPaymentsChange!(next);
  };

  const updateSplitMethod = (paymentId: string, method: PaymentMethod) => {
    if (!splitModeEnabled) return;
    const next = splitPayments!.map((p) =>
      p.id === paymentId ? { ...p, method } : p,
    );
    onSplitPaymentsChange!(next);
    onPaymentMethodChange(method);
  };

  const addSplitPayment = () => {
    if (!splitModeEnabled) return;
    const next: SplitPayment[] = [
      ...splitPayments!,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        method: "bank_transfer",
        amount: 0,
      },
    ];
    onSplitPaymentsChange!(next);
  };

  const removeSplitPayment = (paymentId: string) => {
    if (!splitModeEnabled) return;
    if (splitPayments!.length === 1) return;
    const next = splitPayments!.filter((p) => p.id !== paymentId);
    onSplitPaymentsChange!(next);
    setAmountDrafts((prev) => {
      const nextDrafts = { ...prev };
      delete nextDrafts[paymentId];
      return nextDrafts;
    });
  };

  const emitOrderDateTime = (nextDate: string, nextTime: string) => {
    if (!onOrderDateTimeChange) return;
    if (!nextDate || !nextTime) return;
    onOrderDateTimeChange(`${nextDate}T${nextTime}:00`);
  };

  const handleDateChange = (value: string) => {
    setDateValue(value);
    emitOrderDateTime(value, timeValue);
  };

  const handleTimeChange = (value: string) => {
    setTimeValue(value);
    emitOrderDateTime(dateValue, value);
  };

  const [hourValue, minuteValue] = timeValue.split(":");
  const hours = [...Array.from({ length: 23 }, (_, i) => i + 1), 0].map(
    (hour) => ({
      value: pad(hour),
      label: hour === 0 ? "24" : pad(hour),
    }),
  );
  const minutes = Array.from({ length: 60 }, (_, i) => pad(i));

  return (
    <div
      className={`space-y-4 ${
        isMobile ? "p-4 border-t bg-white -mx-4 -mb-4" : ""
      }`}
    >
      {/* Totals */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>{t("pos.subtotal")}</span>
          <span>€{getSubtotal().toFixed(2)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>{t("pos.discount")}</span>
            <span>-€{discount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>{t("pos.tax")}</span>
          <span>€{getTax().toFixed(2)}</span>
        </div>
        <Separator />
        <div className="flex justify-between font-bold text-lg">
          <span>{t("pos.total")}</span>
          <span>€{total.toFixed(2)}</span>
        </div>
      </div>

      {splitModeEnabled && (
        <div className="space-y-2 rounded-md border p-3 overflow-x-hidden">
          <div className="space-y-2 max-h-44 overflow-y-auto overflow-x-hidden pr-1">
            {splitPayments!.map((payment) => (
              <div
                key={payment.id}
                className="grid grid-cols-[minmax(0,1fr)_120px_auto] items-center gap-2"
              >
                <Select
                  value={payment.method ?? selectedPaymentMethod}
                  onValueChange={(value: PaymentMethod) =>
                    updateSplitMethod(payment.id, value)
                  }
                >
                  <SelectTrigger className="h-9 min-w-0 [&>span]:block [&>span]:truncate">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem
                        key={method}
                        value={method}
                        disabled={isStripeChargeMethod(method) && cardBlocked}
                      >
                        {getMethodLabel(method)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amountDrafts[payment.id] ?? payment.amount.toString()}
                  onChange={(e) =>
                    updateSplitAmount(payment.id, e.target.value)
                  }
                  onFocus={(e) => e.target.select()}
                  onBlur={() =>
                    setAmountDrafts((prev) => {
                      const next = { ...prev };
                      delete next[payment.id];
                      return next;
                    })
                  }
                  disabled={processing}
                  className="h-9 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-input"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  disabled={processing || splitPayments!.length === 1}
                  onClick={() => removeSplitPayment(payment.id)}
                >
                  <Trash2Icon size={14} />
                </Button>
              </div>
            ))}
          </div>
          <div className="text-xs text-muted-foreground flex items-center justify-between">
            <span className={remainingClass}>
              {t("pos.remaining")}: €{remainingAmount.toFixed(2)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={addSplitPayment}
              disabled={processing}
              className="h-8 px-2 text-xs text-muted-foreground"
            >
              <PlusIcon size={12} className="mr-1" />
              {t("pos.addPayment")}
            </Button>
          </div>
        </div>
      )}

      {statusKnown && cardBlocked && (
        <div className="space-y-2 rounded-md border p-3">
          <p className="text-sm text-muted-foreground">
            {t("pos.connect.cardUnavailable")}
          </p>
          <Button asChild variant="outline" size="sm" className="h-8">
            <Link href={billingHref}>{t("pos.connect.goToBilling")}</Link>
          </Button>
        </div>
      )}

      {/* Complete Sale Button */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">{t("pos.date")}</span>
          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                type="button"
                disabled={processing}
                className={cn(
                  "h-9 w-full justify-start text-left font-normal",
                  !dateValue && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateValue
                  ? format(parseDatePart(dateValue) || new Date(), "dd/MM/yyyy")
                  : t("appointments.form.selectDate")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={parseDatePart(dateValue)}
                onSelect={(date) => {
                  if (!date) return;
                  const nextDate = `${date.getFullYear()}-${pad(
                    date.getMonth() + 1,
                  )}-${pad(date.getDate())}`;
                  handleDateChange(nextDate);
                  setIsDatePickerOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">{t("pos.time")}</span>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1">
            <Select
              value={hourValue || "00"}
              onValueChange={(hour) =>
                handleTimeChange(`${hour}:${minuteValue || "00"}`)
              }
              disabled={processing}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {hours.map((hour) => (
                  <SelectItem key={hour.value} value={hour.value}>
                    {hour.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">:</span>
            <Select
              value={minuteValue || "00"}
              onValueChange={(minute) =>
                handleTimeChange(`${hourValue || "00"}:${minute}`)
              }
              disabled={processing}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {minutes.map((minute) => (
                  <SelectItem key={minute} value={minute}>
                    {minute}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Button
        className="w-full"
        size="lg"
        onClick={onCompleteSale}
        disabled={cartLength === 0 || processing || completeSaleBlocked}
        data-complete-sale-button
        tabIndex={3}
      >
        {processing ? t("pos.processing") : t("pos.completeSale")}
      </Button>

      {showProcessButton && (
        <Button
          className="w-full mt-2"
          size="lg"
          onClick={onProcessPayment}
          disabled={processing}
          variant="secondary"
        >
          {processing ? t("pos.processing") : t("pos.processPaymentOnTerminal")}
        </Button>
      )}

      {showSimulateButton && (
        <Button
          className="w-full mt-2"
          size="lg"
          onClick={onSimulatePayment}
          disabled={processing}
          variant="outline"
        >
          {processing ? t("pos.simulating") : t("pos.simulatePaymentTest")}
        </Button>
      )}
    </div>
  );
}
