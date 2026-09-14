import { createClient } from "@/lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import { hydrateOrderItemCatalog } from "@/lib/api/orders/hydrate-order-item-catalog";
import { ORDER_ITEM_CATALOG_SELECT } from "@/lib/api/orders/order-item-service-ids";
import { withLocationId } from "@/lib/location";

function addDaysToDateOnly(dateOnly: string, days: number): string {
  const [y, m, d] = dateOnly.split("-").map(Number);

  if (!y || !m || !d) {
    return dateOnly;
  }

  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);

  return dt.toISOString().slice(0, 10);
}

export type OrderItem = {
  id: string;
  product_id: string | null;
  service_id?: string | null;
  service_variant_id?: string | null;
  quantity: number | null;
  unit_price: number | null;
  discount_amount: number | null;
  vat_rate: number | null;
  total: number | null;
  appointment_id: string | null;

  product?: {
    name: string | null;
  } | null;

  service?: {
    name: string | null;
  } | null;

  service_variant?: {
    name: string | null;
    service?: {
      name: string | null;
    } | null;
  } | null;

  appointment?: {
    id: string;

    client: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      email?: string | null;
      phone?: string | null;
    } | null;
  } | null;
};

export type OrderPayment = {
  id: string;
  cashbook_id?: string | null;
  payment_method: string | null;
  amount_gross: number | null;
  status: string | null;
  paid_at: string | null;
  payment_status: string | null;
  created_at: string;
};

export type Order = {
  id: string;
  order_number: string | null;
  date?: string | null;
  created_at: string;

  subtotal: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  amount_paid: number | null;

  payment_status: string | null;
  status: string | null;

  client_id: string | null;
  company_id: string | null;

  order_item: OrderItem[];
  payment: OrderPayment[];

  appointment?: {
    id: string;

    client: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      email?: string | null;
      phone?: string | null;
    } | null;
  } | null;

  client?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
};

export async function fetchOrders(
  companyId: string,
  startDate?: string,
  endDate?: string,
  locationId?: string | null,
): Promise<{
  data: Order[];
  error: PostgrestError | null;
}> {
  const supabase = createClient();

  let query = supabase
    .from("order")
    .select(
      `
      *,
      order_item (
        id,
        product_id,
        ${ORDER_ITEM_CATALOG_SELECT},
        quantity,
        unit_price,
        discount_amount,
        vat_rate,
        total,
        appointment_id,

        product:product_id (
          name
        ),

        appointment:appointment_id (
          id,
          client:client_id (
            id,
            first_name,
            last_name,
            email,
            phone
          )
        )
      ),

      payment (
        id,
        cashbook_id,
        payment_method,
        amount_gross,
        status,
        paid_at,
        payment_status,
        created_at
      ),

      client:client_id (
        id,
        first_name,
        last_name,
        email,
        phone
      )
    `,
    )
    .eq("company_id", companyId);

  query = withLocationId(query, locationId);

  // Date filtering
  if (startDate && endDate) {
    const startDateOnly = startDate.slice(0, 10);
    const endDateOnly = endDate.slice(0, 10);

    // Start of first day
    const start = `${startDateOnly}T00:00:00.000Z`;

    // Exclusive upper bound (next day at midnight)
    const endExclusiveDate = addDaysToDateOnly(endDateOnly, 1);
    const end = `${endExclusiveDate}T00:00:00.000Z`;

    query = query.gte("date", start).lt("date", end);

    // Debug logs
    console.log("DATE FILTER:", {
      start,
      end,
    });
  }

  const { data, error } = await query
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("FETCH ORDERS ERROR:", error);

    return {
      data: [],
      error,
    };
  }

  console.log(
    "FETCHED ORDER DATES:",
    data?.map((o) => o.date),
  );

  // Transform appointment from order_item
  type RawOrderItem = {
    appointment_id: string | null;

    appointment?: {
      id: string;

      client: {
        id: string;
        first_name: string | null;
        last_name: string | null;
        email?: string | null;
        phone?: string | null;
      } | null;
    } | null;
  };

  type RawOrder = Omit<Order, "order_item" | "appointment"> & {
    order_item?: RawOrderItem[];
  };

  const transformedData = (data || []).map((order: unknown) => {
    const rawOrder = order as RawOrder;

    const appointmentItem = rawOrder.order_item?.find(
      (item) => item.appointment_id && item.appointment,
    );

    return {
      ...rawOrder,
      appointment: appointmentItem?.appointment || null,
    } as Order;
  });

  const allItems = transformedData.flatMap((order) => order.order_item || []);
  const hydratedItems = await hydrateOrderItemCatalog(allItems, supabase);
  let cursor = 0;
  const hydratedOrders = transformedData.map((order) => {
    const count = order.order_item?.length || 0;
    const order_item = hydratedItems.slice(cursor, cursor + count);
    cursor += count;
    return { ...order, order_item };
  });

  return {
    data: hydratedOrders,
    error: null,
  };
}
