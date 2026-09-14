"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { ProtectedRoute } from "@/components/protected-route";
import { useCompanyId, useLocationId } from "@/lib/company-util";
import {
  usePOSData,
  useCart,
  useAppointmentSelection,
  usePaymentProcessing,
  POSHeader,
  CategoryNavigation,
  ProductGrid,
  ServiceGrid,
  AppointmentGrid,
  CartDrawer,
  CartSidebar,
  CartSummaryBar,
  type Category,
} from "./components";
import type { PaymentMethod, SplitPayment } from "./components/payment-section";

export default function POSPage() {
  const t = useTranslations();

  const categories: Category[] = [
    { id: "appointments", name: t("pos.categories.appointments"), icon: "📅" },
    { id: "products", name: t("pos.categories.products"), icon: "🛍️" },
    { id: "treatments", name: t("pos.categories.treatments"), icon: "💆" },
  ];
  const companyId = useCompanyId();
  const locationId = useLocationId();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<string>("appointments");
  const [isCartExpanded, setIsCartExpanded] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>("bank_transfer");
  const [splitPayments, setSplitPayments] = useState<SplitPayment[]>([
    { id: "payment-1", method: "bank_transfer", amount: 0 },
  ]);
  const [orderDateTime, setOrderDateTime] = useState<string>("");
  const [editingPriceIndex, setEditingPriceIndex] = useState<number | null>(
    null
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

  // Fetch data
  const { products, services, appointments, companyReaderId, loading } =
    usePOSData(companyId, locationId);

  // Cart management
  const {
    cart,
    setCart,
    addToCart,
    removeFromCart,
    updateQuantity,
    updatePrice,
    updateDiscount,
    clearCart,
    getSubtotal,
    getTax,
    getDiscount,
    getTotal,
  } = useCart();

  // Appointment selection - SIMPLE STATE
  const [selectedAppointmentIds, setSelectedAppointmentIds] = useState<
    string[]
  >([]);

  // Sync cart when appointments are selected/deselected
  useAppointmentSelection(appointments, selectedAppointmentIds, cart, setCart);

  // Track removed appointments for UI (appointments are refetched on mount)
  const [removedAppointmentIds, setRemovedAppointmentIds] = useState<string[]>(
    []
  );

  const handleAppointmentsRemoved = (appointmentIds: string[]) => {
    setRemovedAppointmentIds((prev) => [...prev, ...appointmentIds]);
  };

  // Filter out removed appointments
  const visibleAppointments = appointments.filter(
    (apt) => !removedAppointmentIds.includes(apt.id)
  );

  // Payment processing
  const {
    processing,
    showProcessButton,
    showSimulateButton,
    completeSale,
    handleProcessPayment,
    handleSimulatePayment,
  } = usePaymentProcessing(
    companyId,
    locationId,
    companyReaderId,
    cart,
    selectedAppointmentIds,
    appointments,
    clearCart,
    setSelectedAppointmentIds,
    handleAppointmentsRemoved
  );

  // Toggle appointment selection - SIMPLE AND DIRECT
  const handleAppointmentToggle = (appointmentId: string) => {
    setSelectedAppointmentIds((prev) => {
      // Make sure we have an array
      const current = Array.isArray(prev) ? prev : [];

      // Check if already selected
      const index = current.indexOf(appointmentId);

      if (index >= 0) {
        // Remove it - create new array without this ID
        const newArray = current.filter((id) => id !== appointmentId);
        return newArray;
      } else {
        // Add it - create new array with this ID added
        const newArray = [...current, appointmentId];
        return newArray;
      }
    });
  };

  const handleAddProductToCart = (product: (typeof products)[0]) => {
    addToCart(product, "product");
  };

  const handleAddServiceToCart = (
    service: (typeof services)[0],
    serviceVariant: (typeof services)[0]["service_variants"][0]
  ) => {
    addToCart(service, "service", serviceVariant);
  };

  const handleCompleteSale = () => {
    completeSale(splitPayments, orderDateTime);
  };

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

  if (loading) {
    return (
      <ProtectedRoute>
        <AppSidebar />
        <SidebarInset>
          <div className="flex flex-1 flex-col gap-6 p-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold">{t("pos.title")}</h1>
                <p className="text-muted-foreground">{t("pos.description")}</p>
              </div>
            </div>
            <div className="flex items-center justify-center h-64">
              <div className="text-muted-foreground">{t("common.loading")}</div>
            </div>
          </div>
        </SidebarInset>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppSidebar />
      <SidebarInset className="h-svh overflow-hidden lg:h-[calc(100svh-1rem)]">
        <div className="flex flex-1 flex-col h-full pb-20 lg:pb-0">
          <div className="flex flex-col lg:flex-row flex-1 overflow-hidden min-h-0">
            {/* Left Column - header + filters + scrollable content */}
            <div className="w-full lg:w-[calc(100%-24.5rem)] min-h-0 flex flex-col">
              <POSHeader
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />

              <CategoryNavigation
                categories={categories}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
              />

              <div className="flex-1 p-4 sm:p-6 overflow-y-auto min-h-0 lg:pr-0">
                {selectedCategory === "products" && (
                  <ProductGrid
                    products={products}
                    searchQuery={searchQuery}
                    onAddToCart={handleAddProductToCart}
                  />
                )}

                {selectedCategory === "treatments" && (
                  <ServiceGrid
                    services={services}
                    searchQuery={searchQuery}
                    onAddToCart={handleAddServiceToCart}
                  />
                )}

                {selectedCategory === "appointments" && (
                  <AppointmentGrid
                    appointments={visibleAppointments}
                    selectedAppointmentIds={selectedAppointmentIds}
                    onAppointmentToggle={handleAppointmentToggle}
                  />
                )}
              </div>
            </div>

            {/* Mobile Cart Drawer */}
            <CartDrawer
              isOpen={isCartExpanded}
              onOpenChange={setIsCartExpanded}
              cart={cart}
              clearCart={clearCart}
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
              selectedPaymentMethod={selectedPaymentMethod}
              onPaymentMethodChange={setSelectedPaymentMethod}
              splitPayments={splitPayments}
              onSplitPaymentsChange={setSplitPayments}
              orderDateTime={orderDateTime}
              onOrderDateTimeChange={setOrderDateTime}
              onCompleteSale={handleCompleteSale}
              onProcessPayment={handleProcessPayment}
              onSimulatePayment={handleSimulatePayment}
              terminalAvailable={!!companyReaderId}
              processing={processing}
              showProcessButton={showProcessButton}
              showSimulateButton={showSimulateButton}
              appointments={visibleAppointments}
              getSubtotal={getSubtotal}
              getTax={getTax}
              getDiscount={getDiscount}
              getTotal={getTotal}
            />

            {/* Desktop Cart Sidebar */}
            <CartSidebar
              cart={cart}
              clearCart={clearCart}
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
              selectedPaymentMethod={selectedPaymentMethod}
              onPaymentMethodChange={setSelectedPaymentMethod}
              splitPayments={splitPayments}
              onSplitPaymentsChange={setSplitPayments}
              orderDateTime={orderDateTime}
              onOrderDateTimeChange={setOrderDateTime}
              onCompleteSale={handleCompleteSale}
              onProcessPayment={handleProcessPayment}
              onSimulatePayment={handleSimulatePayment}
              terminalAvailable={!!companyReaderId}
              processing={processing}
              showProcessButton={showProcessButton}
              showSimulateButton={showSimulateButton}
              appointments={visibleAppointments}
              getSubtotal={getSubtotal}
              getTax={getTax}
              getDiscount={getDiscount}
              getTotal={getTotal}
            />
          </div>

          {/* Persistent Cart Summary Bar - Mobile Only */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t shadow-lg">
            <CartSummaryBar
              cartLength={cart.length}
              getSubtotal={getSubtotal}
              getTotal={getTotal}
              onOpenCart={() => setIsCartExpanded(true)}
            />
          </div>
        </div>
      </SidebarInset>
    </ProtectedRoute>
  );
}
