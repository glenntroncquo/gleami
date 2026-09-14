export interface Order {
  id: string;
  companyId: string | null;
  clientId: string | null;
  locationId: string;
  orderNumber: string | null;
  date: string | null;
  status: string | null;
  paymentStatus: string | null;
  subtotal: number | null;
  discountAmount: number | null;
  taxAmount: number | null;
  totalAmount: number | null;
  amountPaid: number | null;
  notes: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface OrderItem {
  id: string;
  companyId: string;
  orderId: string;
  locationId: string;
  productId: string | null;
  /** Canonical catalog id. Prefer service_id; fall back to leftover treatment_id until SQL DROP. */
  serviceId: string | null;
  /** Canonical catalog id. Prefer service_variant_id; fall back to leftover price_option_id until SQL DROP. */
  serviceVariantId: string | null;
  /** Leftover column. Read-only fallback until SQL DROP. Not written on insert/update. */
  treatmentId: string | null;
  /** Leftover column. Read-only fallback until SQL DROP. Not written on insert/update. */
  priceOptionId: string | null;
  appointmentId: string | null;
  appointmentSegmentId: string | null;
  quantity: number | null;
  unitPrice: number | null;
  discountAmount: number | null;
  vatRate: number | null;
  total: number | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface Payment {
  id: string;
  companyId: string | null;
  orderId: string | null;
  locationId: string;
  cashbookId: string | null;
  amount: number | null;
  amountGross: number | null;
  totalCashReceived: number | null;
  paymentMethod: string | null;
  paymentProvider: string | null;
  paymentStatus: string | null;
  status: string | null;
  cardBrand: string | null;
  cardType: string | null;
  lastFourDigits: string | null;
  processorRef: string | null;
  providerChargeId: string | null;
  providerPaymentIntentId: string | null;
  providerRefundId: string | null;
  notes: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}
