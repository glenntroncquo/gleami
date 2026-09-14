export interface OrderPaymentEntry {
  id: string;
  payment_method: "cash" | "card" | "invoice" | "bank_transfer" | null;
  amount: number | null;
  amount_gross: number | null;
  status: string | null;
  payment_status: string | null;
  created_at: string | null;
}

export interface OrderDialogData {
  id: string;
  order_number: string | null;
  total_amount: number | null;
  payment_status: string | null;
  fallback_item_labels?: string[];
  items: Array<{
    id: string;
    quantity: number | null;
    unit_price: number | null;
    total: number | null;
    discount_amount: number | null;
    product: { id: string; name: string | null } | null;
    service: { id: string; name: string | null } | null;
    service_variant:
      | {
          id: string;
          name: string | null;
          service: { id: string; name: string | null } | null;
        }
      | null;
  }>;
}

export type EmbeddedPosServiceInput = {
  appointmentSegmentId?: string;
  serviceId: string;
  serviceName: string;
  serviceVariant: {
    id: string;
    name: string;
    price: number;
    vat_rate?: number | null;
  };
};

export type EmbeddedPosClientDisplay = {
  first_name: string;
  last_name: string;
} | null;
