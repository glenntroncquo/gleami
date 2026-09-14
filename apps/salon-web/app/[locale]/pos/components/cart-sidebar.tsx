import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CartItem } from "./cart-item";
import { PaymentSection } from "./payment-section";
import type { PaymentMethod, SplitPayment } from "./payment-section";
import type { CartItem as CartItemType, Appointment } from "./types";

interface CartSidebarProps {
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

export function CartSidebar({
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
}: CartSidebarProps) {
  const t = useTranslations();

  return (
    <div className="hidden lg:flex lg:fixed lg:right-2 lg:top-2 lg:bottom-2 lg:w-96 bg-gray-50 flex-col lg:h-auto lg:max-h-[calc(100vh-1rem)] shrink-0 overflow-hidden border z-40 rounded-2xl">
      <div className="p-6 border-b bg-white flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{t("pos.cart")}</h2>
          {cart.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearCart}>
              {t("common.clear")}
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
        {cart.length === 0 ? (
          <div className="flex items-center justify-center text-gray-500 h-full">
            <div className="text-center">
              <div className="text-6xl mb-4">🛒</div>
              <p className="text-lg">{t("pos.cartEmpty")}</p>
            </div>
          </div>
        ) : (
          cart.map((item, index) => {
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
          })
        )}
      </div>

      <div className="flex-shrink-0 p-6 border-t bg-white space-y-4">
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
        />
      </div>
    </div>
  );
}
