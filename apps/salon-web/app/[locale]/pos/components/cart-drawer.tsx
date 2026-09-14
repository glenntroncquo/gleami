import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CartItem } from "./cart-item";
import { PaymentSection } from "./payment-section";
import type { PaymentMethod, SplitPayment } from "./payment-section";
import type { CartItem as CartItemType, Appointment } from "./types";

interface CartDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  cart: CartItemType[];
  clearCart: () => void;
  onUpdateQuantity: (index: number, quantity: number) => void;
  onUpdatePrice: (index: number, price: number) => void;
  onUpdateDiscount: (
    index: number,
    discount: number,
    discountType: "percentage" | "fixed"
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
  selectedPaymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  splitPayments: SplitPayment[];
  onSplitPaymentsChange: (payments: SplitPayment[]) => void;
  orderDateTime: string;
  onOrderDateTimeChange: (value: string) => void;
  onCompleteSale: () => void;
  onProcessPayment: () => void;
  onSimulatePayment: () => void;
  terminalAvailable?: boolean;
  processing: boolean;
  showProcessButton: boolean;
  showSimulateButton: boolean;
  appointments: Appointment[];
  getSubtotal: () => number;
  getTax: () => number;
  getDiscount: () => number;
  getTotal: () => number;
}

export function CartDrawer({
  isOpen,
  onOpenChange,
  cart,
  clearCart,
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
  selectedPaymentMethod,
  onPaymentMethodChange,
  splitPayments,
  onSplitPaymentsChange,
  orderDateTime,
  onOrderDateTimeChange,
  onCompleteSale,
  onProcessPayment,
  onSimulatePayment,
  terminalAvailable,
  processing,
  showProcessButton,
  showSimulateButton,
  appointments,
  getSubtotal,
  getTax,
  getDiscount,
  getTotal,
}: CartDrawerProps) {
  const t = useTranslations();

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="lg:hidden h-[90vh] max-h-[90vh] rounded-t-xl border-t-2 border-t-gray-200 bg-white/95 backdrop-blur-sm [&>button:first-of-type]:hidden"
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
        </div>
        <SheetHeader>
          <div className="flex justify-between w-full p-4">
            <SheetTitle className="text-xl font-bold">
              {t("pos.cart")}
            </SheetTitle>
            <div className="flex items-center gap-2">
              {cart.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearCart}>
                  {t("common.clear")}
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>
        <div className="flex-1 flex flex-col relative min-h-0 px-4">
          {cart.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-500 p-8">
              <div className="text-center">
                <div className="text-6xl mb-4">🛒</div>
                <p className="text-lg">{t("pos.cartEmpty")}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-y-auto space-y-3 max-h-[calc(90vh-280px)]">
                {cart.map((item, index) => {
                  const appointment = item.appointmentId
                    ? appointments.find((apt) => apt.id === item.appointmentId)
                    : null;
                  const appointmentClient = appointment?.client || null;

                  return (
                    <CartItem
                      key={index}
                      item={item}
                      index={index}
                      onUpdateQuantity={onUpdateQuantity}
                      onUpdatePrice={onUpdatePrice}
                      onUpdateDiscount={onUpdateDiscount}
                      onRemove={onRemove}
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
                      appointmentClient={appointmentClient}
                    />
                  );
                })}
              </div>
            </>
          )}
          {cart.length > 0 && (
            <PaymentSection
              selectedPaymentMethod={selectedPaymentMethod}
              onPaymentMethodChange={onPaymentMethodChange}
              splitPayments={splitPayments}
              onSplitPaymentsChange={onSplitPaymentsChange}
              orderDateTime={orderDateTime}
              onOrderDateTimeChange={onOrderDateTimeChange}
              enableSplitPayments
              onCompleteSale={onCompleteSale}
              onProcessPayment={onProcessPayment}
              onSimulatePayment={onSimulatePayment}
              terminalAvailable={terminalAvailable}
              processing={processing}
              showProcessButton={showProcessButton}
              showSimulateButton={showSimulateButton}
              getSubtotal={getSubtotal}
              getTax={getTax}
              getDiscount={getDiscount}
              getTotal={getTotal}
              cartLength={cart.length}
              isMobile={true}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
