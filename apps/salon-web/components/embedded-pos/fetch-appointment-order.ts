import { createClient } from "@/lib/supabase/client";
import { loadResolvedOrderItems } from "@/lib/api/orders/load-resolved-order-items";
import type { OrderDialogData } from "./types";

export async function loadOrderItemsForOrder(orderId: string) {
  const lines = await loadResolvedOrderItems(orderId, createClient());
  return lines.map((row) => ({
    id: row.id,
    quantity: row.quantity,
    unit_price: row.unit_price,
    total: row.total,
    discount_amount: row.discount_amount,
    product: row.product,
    service: row.service,
    service_variant: row.service_variant,
  }));
}

export async function fetchAppointmentOrderData(
  appointmentId: string,
): Promise<OrderDialogData | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("order_item")
      .select(
        `
          id,
          order:order_id(
            id,
            order_number,
            total_amount,
            payment_status
          )
        `,
      )
      .eq("appointment_id", appointmentId);

    if (error || !data || data.length === 0) {
      return null;
    }

    type RawOrderItem = {
      order: {
        id: string;
        order_number: string | null;
        total_amount: number | null;
        payment_status: string | null;
      } | null;
    };

    const rows = data as RawOrderItem[];
    const firstOrder = rows[0]?.order;
    if (!firstOrder) {
      return null;
    }

    return {
      id: firstOrder.id,
      order_number: firstOrder.order_number,
      total_amount: firstOrder.total_amount,
      payment_status: firstOrder.payment_status,
      items: await loadOrderItemsForOrder(firstOrder.id),
    };
  } catch (error) {
    console.error("Error fetching appointment order:", error);
    return null;
  }
}
