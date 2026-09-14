import { PlusIcon, MinusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { CartItem as CartItemType } from "./types";
import { formatPrice, getInitials } from "./utils";
import { useRef, useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CartItemProps {
  item: CartItemType;
  index: number;
  onUpdateQuantity: (index: number, quantity: number) => void;
  onUpdatePrice: (index: number, price: number) => void;
  onUpdateDiscount: (
    index: number,
    discount: number,
    discountType: "percentage" | "fixed",
  ) => void;
  onRemove: (index: number) => void;
  editingPriceIndex: number | null;
  editingDiscountIndex: number | null;
  priceInputWidths: Record<number, number>;
  discountInputWidths: Record<number, number>;
  priceSpanRefs: React.MutableRefObject<Map<number, HTMLSpanElement>>;
  discountSpanRefs: React.MutableRefObject<Map<number, HTMLSpanElement>>;
  setEditingPriceIndex: (index: number | null) => void;
  setEditingDiscountIndex: (index: number | null) => void;
  setPriceInputWidths: React.Dispatch<
    React.SetStateAction<Record<number, number>>
  >;
  setDiscountInputWidths: React.Dispatch<
    React.SetStateAction<Record<number, number>>
  >;
  appointmentClient?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

export function CartItem({
  item,
  index,
  onUpdateQuantity,
  onUpdatePrice,
  onUpdateDiscount,
  onRemove,
  editingPriceIndex,
  editingDiscountIndex,
  priceInputWidths,
  discountInputWidths,
  priceSpanRefs,
  discountSpanRefs,
  setEditingPriceIndex,
  setEditingDiscountIndex,
  setPriceInputWidths,
  setDiscountInputWidths,
  appointmentClient,
}: CartItemProps) {
  const t = useTranslations();
  const discountType = item.discountType || "percentage";
  const isLockedAppointmentItem = !!item.appointmentSegmentId;
  const discountPercentage = item.discountPercentage || 0;
  const discountAmount = item.discountAmount || 0;
  const discountValue =
    discountType === "percentage" ? discountPercentage : discountAmount;

  const discountedPrice =
    discountType === "percentage" && discountPercentage > 0
      ? item.price * (1 - discountPercentage / 100)
      : discountType === "fixed" && discountAmount > 0
        ? Math.max(0, item.price - discountAmount)
        : item.price;

  const discountInputRef = useRef<HTMLInputElement>(null);
  const [discountInputValue, setDiscountInputValue] = useState<string>(
    discountValue > 0 ? discountValue.toString() : "",
  );
  const [priceInputValue, setPriceInputValue] = useState<string>("");

  // Sync price input when entering price edit mode
  useEffect(() => {
    if (editingPriceIndex === index) {
      const p = item.price;
      setPriceInputValue(
        p % 1 === 0 ? p.toString() : Math.round(p * 100) / 100 + "",
      );
    }
  }, [editingPriceIndex, index, item.price]);

  // Focus discount input when price editing ends and discount should be focused
  useEffect(() => {
    if (
      editingPriceIndex === null &&
      editingDiscountIndex === index &&
      discountInputRef.current
    ) {
      discountInputRef.current.focus();
    }
  }, [editingPriceIndex, editingDiscountIndex, index]);

  // Reset input value when editing starts or discount changes externally
  useEffect(() => {
    if (editingDiscountIndex === index) {
      setDiscountInputValue(discountValue > 0 ? discountValue.toString() : "");
    }
  }, [editingDiscountIndex, index, discountValue]);

  return (
    <div className="flex flex-col bg-white rounded-lg p-4 shadow-sm">
      {/* First line: Treatment name and +/- buttons */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {appointmentClient && (
            <Avatar className="w-6 h-6 flex-shrink-0">
              <AvatarFallback className="text-xs font-medium">
                {getInitials(
                  appointmentClient.first_name,
                  appointmentClient.last_name,
                )}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="font-medium text-sm line-clamp-2">{item.name}</div>
        </div>
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={isLockedAppointmentItem && item.quantity <= 1}
            onClick={() => {
              if (item.quantity <= 1) {
                if (isLockedAppointmentItem) return;
                onRemove(index);
              } else {
                onUpdateQuantity(index, item.quantity - 1);
              }
            }}
          >
            <MinusIcon size={12} />
          </Button>
          <span className="w-6 text-center text-sm">{item.quantity}</span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onUpdateQuantity(index, item.quantity + 1)}
          >
            <PlusIcon size={12} />
          </Button>
        </div>
      </div>

      {/* Second line: Price and Discount */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">
            {t("pos.price")}:
          </span>
          {editingPriceIndex === index ? (
            <input
              type="text"
              inputMode="decimal"
              value={priceInputValue}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "" || /^\d*\.?\d*$/.test(value)) {
                  setPriceInputValue(value);
                  const num = parseFloat(value);
                  if (value !== "" && !isNaN(num) && num >= 0) {
                    onUpdatePrice(index, Math.round(num * 100) / 100);
                  }
                }
              }}
              onFocus={(e) => e.target.select()}
              onBlur={() => {
                const num = parseFloat(priceInputValue);
                if (priceInputValue === "" || isNaN(num) || num < 0) {
                  onUpdatePrice(index, 0);
                } else {
                  onUpdatePrice(index, Math.round(num * 100) / 100);
                }
                setEditingPriceIndex(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const num = parseFloat(priceInputValue);
                  if (priceInputValue === "" || isNaN(num) || num < 0) {
                    onUpdatePrice(index, 0);
                  } else {
                    onUpdatePrice(index, Math.round(num * 100) / 100);
                  }
                  setEditingPriceIndex(null);
                } else if (e.key === "Tab" && !e.shiftKey) {
                  e.preventDefault();
                  const num = parseFloat(priceInputValue);
                  if (priceInputValue === "" || isNaN(num) || num < 0) {
                    onUpdatePrice(index, 0);
                  } else {
                    onUpdatePrice(index, Math.round(num * 100) / 100);
                  }
                  setEditingPriceIndex(null);
                  setEditingDiscountIndex(index);
                }
              }}
              tabIndex={1}
              autoFocus
              className="text-sm font-medium px-2 py-1 rounded border border-primary/20 bg-background [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] focus:outline-none focus:ring-0"
              style={{
                width: `${priceInputWidths[index] || 55}px`,
              }}
            />
          ) : (
            <span
              ref={(el) => {
                if (el) {
                  priceSpanRefs.current.set(index, el);
                } else {
                  priceSpanRefs.current.delete(index);
                }
              }}
              onClick={() => {
                const spanEl = priceSpanRefs.current.get(index);
                if (spanEl) {
                  const width = spanEl.offsetWidth;
                  setPriceInputWidths((prev) => ({
                    ...prev,
                    [index]: width,
                  }));
                }
                setEditingPriceIndex(index);
              }}
              className="text-sm font-medium cursor-pointer hover:text-primary transition-colors px-2 py-1 rounded border border-transparent hover:border-primary/20"
            >
              €{formatPrice(item.price)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">
            {t("pos.discount")}:
          </span>
          <div className="flex items-center gap-1">
            {editingDiscountIndex === index ? (
              <input
                ref={discountInputRef}
                type="text"
                inputMode="decimal"
                value={discountInputValue}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow empty string, numbers, and one decimal point
                  if (value === "" || /^\d*\.?\d*$/.test(value)) {
                    setDiscountInputValue(value);
                    // Only update cart if it's a valid number
                    const numValue = parseFloat(value);
                    const maxValue =
                      discountType === "percentage" ? 100 : item.price;
                    if (
                      value === "" ||
                      (!isNaN(numValue) &&
                        numValue >= 0 &&
                        numValue <= maxValue)
                    ) {
                      if (value === "") {
                        onUpdateDiscount(index, 0, discountType);
                      } else if (!isNaN(numValue)) {
                        onUpdateDiscount(index, numValue, discountType);
                      }
                    }
                  }
                }}
                onFocus={(e) => e.target.select()}
                onBlur={() => {
                  // On blur, ensure we have a valid value or set to 0
                  const numValue = parseFloat(discountInputValue);
                  const maxValue =
                    discountType === "percentage" ? 100 : item.price;
                  if (discountInputValue === "" || isNaN(numValue)) {
                    onUpdateDiscount(index, 0, discountType);
                    setDiscountInputValue("");
                  } else {
                    const clampedValue = Math.max(
                      0,
                      Math.min(maxValue, numValue),
                    );
                    onUpdateDiscount(index, clampedValue, discountType);
                    setDiscountInputValue(clampedValue.toString());
                  }
                  setEditingDiscountIndex(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    // On Enter, validate and close
                    const numValue = parseFloat(discountInputValue);
                    const maxValue =
                      discountType === "percentage" ? 100 : item.price;
                    if (discountInputValue === "" || isNaN(numValue)) {
                      onUpdateDiscount(index, 0, discountType);
                      setDiscountInputValue("");
                    } else {
                      const clampedValue = Math.max(
                        0,
                        Math.min(maxValue, numValue),
                      );
                      onUpdateDiscount(index, clampedValue, discountType);
                      setDiscountInputValue(clampedValue.toString());
                    }
                    setEditingDiscountIndex(null);
                  } else if (e.key === "Tab" && !e.shiftKey) {
                    // Tab from discount to payment buttons
                    e.preventDefault();
                    const numValue = parseFloat(discountInputValue);
                    const maxValue =
                      discountType === "percentage" ? 100 : item.price;
                    if (discountInputValue === "" || isNaN(numValue)) {
                      onUpdateDiscount(index, 0, discountType);
                      setDiscountInputValue("");
                    } else {
                      const clampedValue = Math.max(
                        0,
                        Math.min(maxValue, numValue),
                      );
                      onUpdateDiscount(index, clampedValue, discountType);
                      setDiscountInputValue(clampedValue.toString());
                    }
                    setEditingDiscountIndex(null);
                    // Find the first payment button (Complete Sale button)
                    const completeSaleButton = document.querySelector(
                      "[data-complete-sale-button]",
                    ) as HTMLButtonElement;
                    if (completeSaleButton && !completeSaleButton.disabled) {
                      completeSaleButton.focus();
                    }
                  }
                }}
                autoFocus
                tabIndex={2}
                className="text-sm font-medium px-2 py-1 rounded border border-primary/20 bg-background [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] focus:outline-none focus:ring-0"
                style={{
                  width: `${discountInputWidths[index] || 50}px`,
                }}
              />
            ) : (
              <span
                ref={(el) => {
                  if (el) {
                    discountSpanRefs.current.set(index, el);
                  } else {
                    discountSpanRefs.current.delete(index);
                  }
                }}
                onClick={() => {
                  const spanEl = discountSpanRefs.current.get(index);
                  if (spanEl) {
                    const width = spanEl.offsetWidth;
                    setDiscountInputWidths((prev) => ({
                      ...prev,
                      [index]: width,
                    }));
                  }
                  setEditingDiscountIndex(index);
                }}
                className="text-sm font-medium cursor-pointer hover:text-primary transition-colors px-2 py-1 rounded border border-transparent hover:border-primary/20"
              >
                {discountType === "percentage"
                  ? discountPercentage > 0
                    ? `${discountPercentage.toFixed(1)}%`
                    : "0%"
                  : discountAmount > 0
                    ? `€${formatPrice(discountAmount)}`
                    : "€0"}
              </span>
            )}
            <Select
              value={discountType}
              onValueChange={(value: "percentage" | "fixed") => {
                // Convert discount value when switching types
                const currentValue = discountValue || 0;
                if (value === "percentage" && discountType === "fixed") {
                  // Convert fixed to percentage
                  const percentage =
                    item.price > 0 ? (currentValue / item.price) * 100 : 0;
                  const clampedPercentage = Math.min(100, percentage);
                  onUpdateDiscount(index, clampedPercentage, "percentage");
                  if (editingDiscountIndex === index) {
                    setDiscountInputValue(clampedPercentage.toString());
                  }
                } else if (value === "fixed" && discountType === "percentage") {
                  // Convert percentage to fixed
                  const fixed = item.price * (currentValue / 100);
                  const clampedFixed = Math.min(item.price, fixed);
                  onUpdateDiscount(index, clampedFixed, "fixed");
                  if (editingDiscountIndex === index) {
                    setDiscountInputValue(clampedFixed.toString());
                  }
                }
              }}
            >
              <SelectTrigger className="h-8 w-12 px-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">%</SelectItem>
                <SelectItem value="fixed">€</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      {item.type === "product" && item.stockQty !== undefined && (
        <div
          className={cn(
            "text-xs mt-1",
            item.quantity > item.stockQty
              ? "text-red-600 font-medium"
              : item.quantity > item.stockQty * 0.8
                ? "text-orange-600"
                : "text-gray-500",
          )}
        >
          {item.quantity > item.stockQty ? (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
              {item.quantity - item.stockQty} over stock limit
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  item.quantity > item.stockQty * 0.8
                    ? "bg-orange-500"
                    : "bg-green-500",
                )}
              ></span>
              {item.stockQty - item.quantity} left in stock
            </span>
          )}
        </div>
      )}
    </div>
  );
}
