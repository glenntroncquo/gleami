"use client";

import {
  RiAddLine,
  RiDeleteBinLine,
  RiLoader4Line,
} from "@remixicon/react";
import { ChevronDownIcon, SearchIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
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
import { CartItem as CartItemComponent } from "@/app/[locale]/pos/components/cart-item";
import { PaymentSection } from "@/app/[locale]/pos/components/payment-section";
import { FILTER_NO_PRODUCT_LINE } from "@/lib/product-taxonomy";
import type { EmbeddedPosState } from "./use-embedded-pos";

type EmbeddedPosPanelProps = {
  pos: EmbeddedPosState;
};

export function EmbeddedPosPanel({ pos }: EmbeddedPosPanelProps) {
  const t = useTranslations("appointments");
  const tPos = useTranslations();

  const {
    rightPanelMode,
    setRightPanelMode,
    setIsPanelOpen,
    clientDisplayName,
    cart,
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
    cartLength,
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
    loadingItems,
    fetchItems,
    collapsedPickerLineKeys,
    setCollapsedPickerLineKeys,
    collapsedPickerTreatmentKeys,
    setCollapsedPickerTreatmentKeys,
    pickerTreatmentGroups,
    resetOrderPaymentForm,
  } = pos;

  return (
    <>
      <div className="w-[384px] flex-shrink-0 border-l border-gray-200 bg-gray-50 flex flex-col h-full min-h-0 overflow-hidden">
        {rightPanelMode === "cart" ? (
          <>
            <div
              ref={inlinePickerContainerRef}
              className="p-4 sm:p-6 border-b bg-white flex-shrink-0 relative z-10"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="relative w-[260px]">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
                  <Input
                    ref={productSearchInputRef}
                    placeholder={t("sheet.inlinePicker.searchPlaceholder")}
                    value={productSearchQuery}
                    onChange={(e) => setProductSearchQuery(e.target.value)}
                    onFocus={() => {
                      fetchItems();
                    }}
                    className="pl-9"
                  />
                  {productSearchQuery.trim() && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-2"
                      onClick={() => {
                        setProductSearchQuery("");
                        requestAnimationFrame(() => {
                          productSearchInputRef.current?.focus();
                        });
                      }}
                      aria-label={tPos("common.clear")}
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setShowInlineProductPicker((prev) => !prev);
                    fetchItems();
                    requestAnimationFrame(() => {
                      productSearchInputRef.current?.focus();
                    });
                  }}
                  title={t("sheet.actions.addItems")}
                  aria-label={t("sheet.actions.addItems")}
                >
                  <RiAddLine size={16} />
                </Button>
              </div>

              <Collapsible open={showInlineProductPicker}>
                <CollapsibleContent className="absolute left-0 right-0 top-full z-50 border-t bg-white shadow-lg max-h-[min(55vh,28rem)] flex flex-col overflow-hidden">
                  <div className="p-4 flex flex-col min-h-0 flex-1 overflow-hidden">
                    <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y -mx-1 px-1 pb-2">
                      {loadingItems ? (
                        <div className="p-3 space-y-3 rounded-md border bg-muted/10">
                          <Skeleton className="h-8 w-40" />
                          <div className="space-y-2">
                            {Array.from({ length: 6 }).map((_, i) => (
                              <div key={`picker-skel-${i}`} className="flex items-center justify-between gap-3">
                                <div className="min-w-0 flex-1 space-y-1">
                                  <Skeleton className="h-4 w-48" />
                                  <Skeleton className="h-3 w-24" />
                                </div>
                                <Skeleton className="h-4 w-14" />
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : pickerGroups.length === 0 && pickerTreatmentGroups.length === 0 ? (
                        <div className="py-10 text-center text-sm text-muted-foreground rounded-md border bg-muted/10">
                          {t("sheet.inlinePicker.noResults")}
                        </div>
                      ) : (
                        <div className="rounded-md border bg-muted/10 divide-y">
                          {pickerGroups.length > 0 && (
                            <>
                              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-white sticky top-0 z-[1] border-b">
                                {t("sheet.addItemsDialog.products")}
                              </div>
                              {!productSearchQuery.trim() && pickerRecentProducts.length > 0 && (
                                <div className="bg-white">
                                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                                    {t("sheet.inlinePicker.recent")}
                                  </div>
                                  <div className="divide-y">
                                    {pickerRecentProducts.map((p) => {
                                      const grossPrice =
                                        Math.round((p.price_gross || 0) * 100) / 100;
                                      const stockQty = p.stock_qty || 0;
                                      return (
                                        <button
                                          key={`recent-${p.id}`}
                                          type="button"
                                          className="w-full px-3 py-2 text-left hover:bg-muted/30"
                                          onClick={() => handleAddProductToCart(p)}
                                        >
                                          <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                              <div className="text-sm font-medium truncate">
                                                {p.name || t("sheet.unnamedProduct")}
                                              </div>
                                              <div className="text-xs text-muted-foreground truncate">
                                                {p.sku || tPos("common.notAvailable")}
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                              <div className="text-sm font-semibold text-primary tabular-nums">
                                                €{grossPrice.toFixed(2)}
                                              </div>
                                              <div className="flex items-center gap-1.5">
                                                <span
                                                  className={cn(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    stockQty <= 0
                                                      ? "bg-red-500"
                                                      : stockQty <= 5
                                                        ? "bg-orange-500"
                                                        : "bg-green-500",
                                                  )}
                                                />
                                                <span className="text-xs text-muted-foreground tabular-nums">
                                                  {stockQty}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                              {pickerGroups.map((group) => {
                                const isCollapsed = Boolean(
                                  collapsedPickerLineKeys[group.lineKey],
                                );
                                return (
                                  <div key={group.lineKey}>
                                    <button
                                      type="button"
                                      className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold bg-muted/40 hover:bg-muted/60"
                                      onClick={() => {
                                        setCollapsedPickerLineKeys((prev) => ({
                                          ...prev,
                                          [group.lineKey]: !prev[group.lineKey],
                                        }));
                                      }}
                                    >
                                      <span className="flex items-center gap-2 min-w-0">
                                        <ChevronDownIcon
                                          className={cn(
                                            "h-4 w-4 transition-transform",
                                            isCollapsed && "-rotate-90",
                                          )}
                                        />
                                        <span className="truncate">{group.title}</span>
                                      </span>
                                      <span className="text-xs font-medium text-muted-foreground tabular-nums">
                                        {group.count}
                                      </span>
                                    </button>
                                    {!isCollapsed && (
                                      <div className="divide-y bg-white">
                                        {group.items.map((p) => {
                                          const grossPrice =
                                            Math.round((p.price_gross || 0) * 100) / 100;
                                          const stockQty = p.stock_qty || 0;
                                          return (
                                            <button
                                              key={p.id}
                                              type="button"
                                              className="w-full px-3 py-2 text-left hover:bg-muted/30"
                                              onClick={() => handleAddProductToCart(p)}
                                            >
                                              <div className="flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                  <div className="text-sm font-medium truncate">
                                                    {p.name || t("sheet.unnamedProduct")}
                                                  </div>
                                                  <div className="text-xs text-muted-foreground truncate">
                                                    {p.sku || tPos("common.notAvailable")}
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                  <div className="text-sm font-semibold text-primary tabular-nums">
                                                    €{grossPrice.toFixed(2)}
                                                  </div>
                                                  <div className="flex items-center gap-1.5">
                                                    <span
                                                      className={cn(
                                                        "w-1.5 h-1.5 rounded-full",
                                                        stockQty <= 0
                                                          ? "bg-red-500"
                                                          : stockQty <= 5
                                                            ? "bg-orange-500"
                                                            : "bg-green-500",
                                                      )}
                                                    />
                                                    <span className="text-xs text-muted-foreground tabular-nums">
                                                      {stockQty}
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </>
                          )}

                          {pickerTreatmentGroups.length > 0 && (
                            <>
                              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-white sticky top-0 z-[1] border-b border-t">
                                {t("sheet.addItemsDialog.treatments")}
                              </div>
                              {pickerTreatmentGroups.map((group) => {
                                const isCollapsed = Boolean(
                                  collapsedPickerTreatmentKeys[group.serviceKey],
                                );
                                return (
                                  <div key={group.serviceKey}>
                                    <button
                                      type="button"
                                      className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold bg-muted/40 hover:bg-muted/60"
                                      onClick={() => {
                                        setCollapsedPickerTreatmentKeys((prev) => ({
                                          ...prev,
                                          [group.serviceKey]: !prev[group.serviceKey],
                                        }));
                                      }}
                                    >
                                      <span className="flex items-center gap-2 min-w-0">
                                        <ChevronDownIcon
                                          className={cn(
                                            "h-4 w-4 transition-transform",
                                            isCollapsed && "-rotate-90",
                                          )}
                                        />
                                        <span className="truncate">{group.title}</span>
                                      </span>
                                      <span className="text-xs font-medium text-muted-foreground tabular-nums">
                                        {group.count}
                                      </span>
                                    </button>
                                    {!isCollapsed && (
                                      <div className="divide-y bg-white">
                                        {group.options.map((option) => {
                                          const grossPrice =
                                            Math.round((option.price || 0) * 100) / 100;
                                          return (
                                            <button
                                              key={option.id}
                                              type="button"
                                              className="w-full px-3 py-2 text-left hover:bg-muted/30"
                                              onClick={() =>
                                                handleAddServiceToCart(
                                                  group.service,
                                                  option,
                                                )
                                              }
                                            >
                                              <div className="flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                  <div className="text-sm font-medium truncate">
                                                    {option.name}
                                                  </div>
                                                  {option.duration_in_minutes ? (
                                                    <div className="text-xs text-muted-foreground truncate">
                                                      {option.duration_in_minutes} min
                                                    </div>
                                                  ) : null}
                                                </div>
                                                <div className="text-sm font-semibold text-primary tabular-nums shrink-0">
                                                  €{grossPrice.toFixed(2)}
                                                </div>
                                              </div>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-y-contain touch-pan-y p-4 sm:p-6 space-y-4 min-h-0 pb-4">
              {cart.length === 0 ? (
                <div className="flex items-center justify-center text-gray-500 h-full">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🛒</div>
                    <p className="text-lg">{tPos("pos.cartEmpty")}</p>
                  </div>
                </div>
              ) : (
                cart.map((item, index) => (
                  <CartItemComponent
                    key={`${item.id}-${item.serviceVariantId || "product"}-${index}`}
                    item={item}
                    index={index}
                    onUpdateQuantity={updateQuantity}
                    onUpdatePrice={updatePrice}
                    onUpdateDiscount={updateDiscount}
                    onRemove={removeFromCart}
                    editingPriceIndex={editingPriceIndex}
                    editingDiscountIndex={editingDiscountIndex}
                    priceInputWidths={priceInputWidths}
                    discountInputWidths={discountInputWidths}
                    priceSpanRefs={priceSpanRefs}
                    discountSpanRefs={discountSpanRefs}
                    setEditingPriceIndex={setEditingPriceIndex}
                    setEditingDiscountIndex={setEditingDiscountIndex}
                    setPriceInputWidths={setPriceInputWidths}
                    setDiscountInputWidths={setDiscountInputWidths}
                    appointmentClient={clientDisplayName}
                  />
                ))
              )}
            </div>

            <div className="flex-shrink-0 p-6 border-t bg-white space-y-4">
              <PaymentSection
                selectedPaymentMethod={selectedPaymentMethod}
                onPaymentMethodChange={setSelectedPaymentMethod}
                splitPayments={splitPayments}
                onSplitPaymentsChange={setSplitPayments}
                orderDateTime={orderDateTime}
                onOrderDateTimeChange={setOrderDateTime}
                enableSplitPayments
                onCompleteSale={handleCompleteSale}
                onProcessPayment={handleProcessPayment}
                onSimulatePayment={handleSimulatePayment}
                terminalAvailable={!!companyReaderId}
                processing={processing}
                showProcessButton={showProcessButton}
                showSimulateButton={showSimulateButton}
                getSubtotal={getSubtotal}
                getTax={getTax}
                getDiscount={getDiscount}
                getTotal={getTotal}
                cartLength={cartLength}
              />
            </div>
          </>
        ) : (
          <>
            <div className="p-6 border-b bg-white flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">
                  {selectedOrderDetail?.order_number
                    ? selectedOrderDetail.order_number
                    : t("orderPanel.title")}
                </h2>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:bg-red-50 hover:text-red-700"
                    onClick={() => setPendingDeleteTarget({ type: "order" })}
                    disabled={isDeletingOrder}
                    title={t("orderPanel.actions.deleteOrder")}
                    aria-label={t("orderPanel.actions.deleteOrder")}
                  >
                    {isDeletingOrder ? (
                      <RiLoader4Line size={14} className="animate-spin" />
                    ) : (
                      <RiDeleteBinLine size={14} />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRightPanelMode("cart");
                      setIsPanelOpen(false);
                      resetOrderPaymentForm();
                    }}
                  >
                    {t("orderPanel.actions.close")}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-y-contain touch-pan-y p-4 sm:p-6 space-y-4 min-h-0 pb-4">
              {selectedOrderDetail && (
                <>
                  {(() => {
                    const remainingPreview = getRemainingPreview();
                    const remainingClass =
                      remainingPreview < 0
                        ? "text-red-600"
                        : remainingPreview === 0
                          ? "text-green-600"
                          : "text-yellow-600";
                    return (
                      <div className="rounded-md border p-3 bg-gray-50">
                        <div className="flex justify-between text-sm">
                          <span>{t("orderPanel.summary.total")}</span>
                          <span className="font-medium">
                            €{(selectedOrderDetail.total_amount || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                          <span>{t("orderPanel.summary.paid")}</span>
                          <span className="font-medium">
                            €{getOrderPaymentsTotalPaid().toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                          <span>{t("orderPanel.summary.remaining")}</span>
                          <span className={cn("font-medium", remainingClass)}>
                            €{remainingPreview.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">{t("orderPanel.itemsTitle")}</h4>
                    {selectedOrderDetail.items.length === 0 ? (
                      <div className="text-xs text-muted-foreground">
                        {tPos("orders.noItems")}
                      </div>
                    ) : (
                      <div className="space-y-1 rounded-md border p-2 overflow-x-hidden">
                        {selectedOrderDetail.items.map((item, idx) => {
                          const fallbackItemLabel =
                            selectedOrderDetail.fallback_item_labels?.[idx] ||
                            selectedOrderDetail.fallback_item_labels?.[0] ||
                            null;
                          const itemName =
                            fallbackItemLabel &&
                            !item.product?.name &&
                            !item.service?.name &&
                            !item.service_variant?.name
                              ? fallbackItemLabel
                              : item.product?.name ||
                                (item.service?.name && item.service_variant?.name
                                  ? `${item.service.name} - ${item.service_variant.name}`
                                  : item.service_variant?.service?.name &&
                                      item.service_variant?.name
                                    ? `${item.service_variant.service.name} - ${item.service_variant.name}`
                                    : item.service?.name ||
                                      item.service_variant?.name) ||
                                fallbackItemLabel ||
                                tPos("common.unknown");
                          const quantity = item.quantity || 1;
                          const discountAmount = item.discount_amount || 0;
                          const total =
                            item.total || (item.unit_price || 0) * quantity;
                          return (
                            <div key={item.id || idx}>
                              <div className="text-xs flex items-center justify-between">
                                <span className="min-w-0 break-words pr-2">
                                  {quantity}x {itemName}
                                </span>
                                <span className="font-medium">€{total.toFixed(2)}</span>
                              </div>
                              {discountAmount > 0 && (
                                <div className="text-[11px] text-green-700 flex items-center justify-between pl-4">
                                  <span>{tPos("pos.discount")}</span>
                                  <span>-€{discountAmount.toFixed(2)}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">{t("orderPanel.paymentsTitle")}</h4>
                    {isLoadingOrderPayments ? (
                      <div className="py-4 flex justify-center">
                        <RiLoader4Line className="animate-spin text-gray-400" />
                      </div>
                    ) : orderPayments.length === 0 ? (
                      <div className="text-xs text-muted-foreground">
                        {t("orderPanel.noPayments")}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {orderPayments.map((payment) => (
                          <div
                            key={payment.id}
                            className="rounded-md border p-2 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-medium">
                                {payment.payment_method
                                  ? tPos(
                                      `pos.paymentMethods.${
                                        payment.payment_method === "bank_transfer"
                                          ? "bankTransfer"
                                          : payment.payment_method
                                      }`,
                                    )
                                  : tPos("common.notAvailable")}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {payment.created_at
                                  ? new Date(payment.created_at).toLocaleString()
                                  : ""}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {editingPaymentId === payment.id ? (
                                <input
                                  ref={editingPaymentInputRef}
                                  type="text"
                                  inputMode="decimal"
                                  value={editingPaymentAmount}
                                  onChange={(e) => setEditingPaymentAmount(e.target.value)}
                                  className="h-8 w-28 text-right text-sm font-medium px-2 py-1 rounded border border-primary/20 bg-background focus:outline-none focus:ring-0"
                                  onFocus={(e) => e.target.select()}
                                  onClick={(e) => (e.target as HTMLInputElement).select()}
                                  autoFocus
                                />
                              ) : (
                                <button
                                  type="button"
                                  className="text-sm font-semibold hover:underline"
                                  onClick={() => handleEditOrderPayment(payment)}
                                >
                                  €{(payment.amount_gross || 0).toFixed(2)}
                                </button>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:bg-red-50 hover:text-red-700"
                                onClick={() =>
                                  setPendingDeleteTarget({
                                    type: "payment",
                                    paymentId: payment.id,
                                  })
                                }
                                disabled={deletingPaymentId === payment.id}
                                title={t("orderPanel.actions.deletePayment")}
                                aria-label={t("orderPanel.actions.deletePayment")}
                              >
                                {deletingPaymentId === payment.id ? (
                                  <RiLoader4Line size={14} className="animate-spin" />
                                ) : (
                                  <RiDeleteBinLine size={14} />
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 rounded-md border p-3">
                    <h4 className="text-sm font-semibold">{t("orderPanel.addPayment")}</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label>{t("orderPanel.fields.method")}</Label>
                        <Select
                          value={newPaymentMethod}
                          onValueChange={(value) =>
                            setNewPaymentMethod(
                              value as
                                | "cash"
                                | "card"
                                | "invoice"
                                | "bank_transfer"
                                | "terminal",
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">{tPos("pos.paymentMethods.cash")}</SelectItem>
                            <SelectItem value="card">{tPos("pos.paymentMethods.card")}</SelectItem>
                            <SelectItem value="invoice">
                              {tPos("pos.paymentMethods.invoice")}
                            </SelectItem>
                            <SelectItem value="bank_transfer">
                              {tPos("pos.paymentMethods.bankTransfer")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>{t("orderPanel.fields.amount")}</Label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={newPaymentAmount}
                          onChange={(e) => setNewPaymentAmount(e.target.value)}
                          onFocus={(e) => e.target.select()}
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none md:text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex-shrink-0 p-6 border-t bg-white">
              <div className="flex justify-end gap-2">
                {editingPaymentId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingPaymentId(null);
                      setEditingPaymentAmount("");
                    }}
                  >
                    {t("orderPanel.actions.cancelEdit")}
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={handleSaveOrderPayment}
                  disabled={isSavingOrderPayment}
                  className="min-w-[10.5rem] justify-center"
                >
                  {isSavingOrderPayment
                    ? t("orderPanel.actions.saving")
                    : t("orderPanel.actions.savePayment")}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <AlertDialog
        open={pendingDeleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDeleteTarget?.type === "order"
                ? t("orderPanel.actions.deleteOrder")
                : t("orderPanel.actions.deletePayment")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteTarget?.type === "order"
                ? t("orderPanel.confirm.deleteOrder")
                : t("orderPanel.confirm.deletePayment")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tPos("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const target = pendingDeleteTarget;
                setPendingDeleteTarget(null);
                if (!target) return;
                if (target.type === "order") {
                  await handleDeleteOrder();
                  return;
                }
                await handleDeleteOrderPayment(target.paymentId);
              }}
            >
              {tPos("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
