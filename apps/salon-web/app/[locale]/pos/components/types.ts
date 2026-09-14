export type Product = {
  id: string;
  name: string | null;
  price_gross: number | null;
  stock_qty: number | null;
  sku: string | null;
  vat_rate?: number | null;
};

export type Service = {
  id: string;
  name: string;
  service_variants: ServiceVariant[];
};

export type ServiceVariant = {
  id: string;
  name: string;
  price: number;
  duration_in_minutes: number;
  vat_rate?: number | null;
};

export type CartItem = {
  id: string;
  name: string;
  price: number; // Price inclusive of VAT (for display and editing)
  quantity: number;
  type: "product" | "service";
  serviceVariantId?: string;
  stockQty?: number;
  vatRate?: number; // VAT rate for this item (needed to convert back to exclusive)
  appointmentSegmentId?: string;
  isAppointmentItem?: boolean;
  appointmentId?: string; // Track which appointment this came from
  discountType?: "percentage" | "fixed"; // Type of discount
  discountPercentage?: number; // Discount percentage (0-100) when discountType is "percentage"
  discountAmount?: number; // Fixed discount amount when discountType is "fixed"
};

export type Appointment = {
  id: string;
  start: string;
  end: string;
  client: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email?: string | null;
  } | null;
  segments?: Array<{
    id: string;
    service_id: string;
    service_variant_id: string;
    service: {
      id: string;
      name: string;
    } | null;
    service_variant: {
      id: string;
      name: string;
      price: number;
      duration_in_minutes: number;
      vat_rate?: number | null;
    } | null;
  }>;
};
