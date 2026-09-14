import { createClient } from "@/lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import { hydrateOrderItemCatalog } from "@/lib/api/orders/hydrate-order-item-catalog";
import { ORDER_ITEM_CATALOG_SELECT } from "@/lib/api/orders/order-item-service-ids";
import { withLocationId } from "@/lib/location";

export type ClientHistoryClient = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
};

export type ClientHistoryOrderItem = {
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
};

export type ClientHistoryAppointment = {
  id: string;
  start: string;
  end: string;
  is_canceled: boolean | null;
  notes: string | null;
  staff_notes: string | null;
  staff_image_path: string | null;
  status: string | null;
  staff: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  services: Array<{
    appointmentSegmentId: string;
    serviceId: string;
    serviceName: string;
    serviceVariant: {
      id: string;
      name: string;
      price: number;
      vat_rate?: number | null;
    };
  }>;
  order: {
    id: string;
    order_number: string | null;
    total_amount: number | null;
    payment_status: string | null;
    amount_paid?: number;
  } | null;
  orderItems: ClientHistoryOrderItem[];
};

export type ClientHistoryStandaloneOrder = {
  id: string;
  date: string;
  order_number: string | null;
  total_amount: number | null;
  payment_status: string | null;
  amount_paid: number;
  orderItems: ClientHistoryOrderItem[];
};

export type ClientHistoryTimelineEntry =
  | { type: "appointment"; sortDate: string; appointment: ClientHistoryAppointment }
  | { type: "order"; sortDate: string; order: ClientHistoryStandaloneOrder };

export type ClientHistory = {
  client: ClientHistoryClient;
  appointments: ClientHistoryAppointment[];
  standaloneOrders: ClientHistoryStandaloneOrder[];
  timeline: ClientHistoryTimelineEntry[];
};

type RawOrderItem = {
  id: string;
  order_id: string | null;
  quantity: number | null;
  unit_price: number | null;
  total: number | null;
  discount_amount: number | null;
  service_id?: string | null;
  service_variant_id?: string | null;
  product: { id: string; name: string | null } | null;
  service?: { id?: string; name: string | null } | null;
  service_variant?: {
    id: string;
    name: string | null;
    service?: { id?: string; name: string | null } | null;
  } | null;
  order: {
    id: string;
    order_number: string | null;
    total_amount: number | null;
    payment_status: string | null;
  } | null;
} | null;

type RawOrderItemRow = {
  id: string;
  order_id: string | null;
  quantity: number | null;
  unit_price: number | null;
  total: number | null;
  discount_amount: number | null;
  service_id?: string | null;
  service_variant_id?: string | null;
  product: { id: string; name: string | null } | null;
  service?: { id?: string; name: string | null } | null;
  service_variant?: {
    id: string;
    name: string | null;
    service?: { id?: string; name: string | null } | null;
  } | null;
};

function unwrapRelation<T extends object>(value: unknown): T | null {
  if (Array.isArray(value)) {
    const first = value[0];
    return first && typeof first === "object" ? (first as T) : null;
  }
  if (value && typeof value === "object") {
    return value as T;
  }
  return null;
}

function mapOrderItemRow(row: RawOrderItemRow): ClientHistoryOrderItem {
  const service = row.service
    ? { id: row.service.id ?? "", name: row.service.name }
    : null;
  const variant = row.service_variant
    ? {
        id: row.service_variant.id,
        name: row.service_variant.name,
        service: row.service_variant.service
          ? {
              id: row.service_variant.service.id ?? "",
              name: row.service_variant.service.name,
            }
          : service,
      }
    : null;
  return {
    id: row.id,
    quantity: row.quantity,
    unit_price: row.unit_price,
    total: row.total,
    discount_amount: row.discount_amount ?? null,
    product: row.product,
    service,
    service_variant: variant,
  };
}

function buildTimeline(
  appointments: ClientHistoryAppointment[],
  standaloneOrders: ClientHistoryStandaloneOrder[],
): ClientHistoryTimelineEntry[] {
  return [
    ...appointments.map(
      (appointment): ClientHistoryTimelineEntry => ({
        type: "appointment",
        sortDate: appointment.start,
        appointment,
      }),
    ),
    ...standaloneOrders.map(
      (order): ClientHistoryTimelineEntry => ({
        type: "order",
        sortDate: order.date,
        order,
      }),
    ),
  ].sort(
    (a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime(),
  );
}

/**
 * Order IDs already represented on an appointment row in history.
 * Standalone orders must exclude these so each sale appears once.
 */
export function collectAppointmentLinkedOrderIds(
  appointments: ClientHistoryAppointment[],
  orderItemLinks: Array<{ order_id: string | null }>,
): Set<string> {
  const linked = new Set<string>();

  for (const appointment of appointments) {
    if (appointment.order?.id) {
      linked.add(appointment.order.id);
    }
  }

  for (const row of orderItemLinks) {
    if (row.order_id) {
      linked.add(row.order_id);
    }
  }

  return linked;
}

/**
 * Fetches client by id and their history: appointments plus standalone orders.
 * An order is standalone when it is not linked to any appointment via order_item.appointment_id.
 * When locationId is set, visits and standalone orders are shop-scoped.
 */
export async function fetchClientHistory(
  clientId: string,
  companyId?: string,
  locationId?: string | null,
): Promise<{ data: ClientHistory | null; error: PostgrestError | null }> {
  const supabase = createClient();

  const { data: clientData, error: clientError } = await supabase
    .from("client")
    .select("id, first_name, last_name, email, phone")
    .eq("id", clientId)
    .single();

  if (clientError || !clientData) {
    return { data: null, error: clientError };
  }

  let query = supabase
    .from("appointment")
    .select(
      `
      id,
      start,
      end,
      is_canceled,
      notes,
      staff_notes,
      staff_image_path,
      status,
      client_id,
      staff:staff_id (id, first_name, last_name),
      appointment_segment (
        id,
        service:service_id (id, name),
        service_variant:service_variant_id (id, name, price, vat_rate)
      ),
      order_item (
        id,
        order_id,
        quantity,
        unit_price,
        total,
        product:product_id (id, name),
        ${ORDER_ITEM_CATALOG_SELECT},
        order:order_id (
          id,
          order_number,
          total_amount,
          payment_status
        )
      )
    `,
    )
    .eq("client_id", clientId)
    .order("start", { ascending: false })
    .limit(50);

  if (companyId) {
    query = query.eq("company_id", companyId);
  }
  query = withLocationId(query, locationId);

  const { data: appointmentsData, error: appointmentsError } = await query;

  if (appointmentsError) {
    return { data: null, error: appointmentsError };
  }

  const appointmentRows = (appointmentsData || []) as Array<Record<string, unknown>>;
  const appointmentIds = appointmentRows.map((apt) => apt.id as string);

  const orderIdsFromAppointments = [
    ...new Set(
      appointmentRows
        .flatMap((apt) => ((apt.order_item || []) as RawOrderItem[]).filter(Boolean))
        .map((item) => item?.order?.id || item?.order_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const fullOrderItemsByOrderId = new Map<string, ClientHistoryOrderItem[]>();
  const amountPaidByOrderId = new Map<string, number>();

  if (orderIdsFromAppointments.length > 0) {
    const [{ data: fullOrderItems }, { data: payments }] = await Promise.all([
      supabase
        .from("order_item")
        .select(
          `
          id,
          order_id,
          quantity,
          unit_price,
          total,
          discount_amount,
          product:product_id (id, name),
          ${ORDER_ITEM_CATALOG_SELECT}
        `,
        )
        .in("order_id", orderIdsFromAppointments),
      supabase
        .from("payment")
        .select("order_id, amount_gross")
        .in("order_id", orderIdsFromAppointments),
    ]);

    const hydratedFullItems = await hydrateOrderItemCatalog(
      (fullOrderItems || []) as RawOrderItemRow[],
      supabase,
    );

    for (const row of hydratedFullItems) {
      if (!row.order_id) continue;
      const existing = fullOrderItemsByOrderId.get(row.order_id) || [];
      existing.push(mapOrderItemRow(row));
      fullOrderItemsByOrderId.set(row.order_id, existing);
    }

    for (const payment of (payments || []) as Array<{
      order_id: string | null;
      amount_gross: number | null;
    }>) {
      if (!payment.order_id) continue;
      const current = amountPaidByOrderId.get(payment.order_id) || 0;
      amountPaidByOrderId.set(payment.order_id, current + (payment.amount_gross || 0));
    }
  }

  const nestedOrderItems = appointmentRows.flatMap((apt) =>
    ((apt.order_item || []) as RawOrderItem[]).filter(
      (item): item is Exclude<RawOrderItem, null> => Boolean(item),
    ),
  );
  const hydratedNestedItems = await hydrateOrderItemCatalog(
    nestedOrderItems,
    supabase,
  );
  const nestedOrderItemById = new Map(
    hydratedNestedItems.map((item) => [item.id, item]),
  );

  const transformedAppointments: ClientHistoryAppointment[] = appointmentRows.map(
    (apt: Record<string, unknown>) => {
      const orderItems = (apt.order_item || []) as RawOrderItem[];
      const validOrderItems = orderItems.filter(
        (item): item is Exclude<RawOrderItem, null> => Boolean(item),
      );
      const firstOrderItem = validOrderItems[0];
      const orderId = firstOrderItem?.order?.id || firstOrderItem?.order_id || null;
      const hydratedOrderItems = orderId
        ? fullOrderItemsByOrderId.get(orderId) || []
        : [];

      return {
        id: apt.id as string,
        start: apt.start as string,
        end: apt.end as string,
        is_canceled: apt.is_canceled as boolean | null,
        notes: apt.notes as string | null,
        staff_notes: apt.staff_notes as string | null,
        staff_image_path: apt.staff_image_path as string | null,
        status: apt.status as string | null,
        staff: apt.staff as ClientHistoryAppointment["staff"],
        services: (
          (apt.appointment_segment as Array<Record<string, unknown>>) || []
        ).flatMap((at: Record<string, unknown>) => {
          const service = unwrapRelation<{ id?: string; name?: string }>(
            at.service,
          );
          const serviceVariant = unwrapRelation<{
            id?: string;
            name?: string;
            price?: number;
            vat_rate?: number | null;
          }>(at.service_variant);
          const serviceName = service?.name?.trim() ?? "";
          const variantName = serviceVariant?.name?.trim() ?? "";
          if (!service?.id && !serviceName && !serviceVariant?.id && !variantName) {
            return [];
          }
          return [
            {
              appointmentSegmentId: at.id as string,
              serviceId: service?.id || serviceVariant?.id || (at.id as string),
              serviceName,
              serviceVariant: {
                id: serviceVariant?.id ?? "",
                name: variantName,
                price: serviceVariant?.price ?? 0,
                vat_rate: serviceVariant?.vat_rate,
              },
            },
          ];
        }),
        order: firstOrderItem?.order
          ? {
              ...firstOrderItem.order,
              amount_paid: amountPaidByOrderId.get(orderId || "") || 0,
            }
          : null,
        orderItems:
          hydratedOrderItems.length > 0
            ? hydratedOrderItems
            : validOrderItems.map((item) =>
                mapOrderItemRow(nestedOrderItemById.get(item.id) || item),
              ),
      };
    },
  );

  let orderItemLinks: Array<{ order_id: string | null }> = [];
  if (appointmentIds.length > 0) {
    const { data: linkedItems } = await supabase
      .from("order_item")
      .select("order_id")
      .in("appointment_id", appointmentIds);

    orderItemLinks = (linkedItems || []) as Array<{ order_id: string | null }>;
  }

  const appointmentLinkedOrderIds = collectAppointmentLinkedOrderIds(
    transformedAppointments,
    orderItemLinks,
  );

  let standaloneOrdersQuery = supabase
    .from("order")
    .select(
      `
      id,
      date,
      created_at,
      order_number,
      total_amount,
      payment_status,
      order_item (
        id,
        quantity,
        unit_price,
        total,
        discount_amount,
        product:product_id (id, name),
        ${ORDER_ITEM_CATALOG_SELECT}
      )
    `,
    )
    .eq("client_id", clientId)
    .order("date", { ascending: false })
    .limit(50);

  if (companyId) {
    standaloneOrdersQuery = standaloneOrdersQuery.eq("company_id", companyId);
  }
  standaloneOrdersQuery = withLocationId(standaloneOrdersQuery, locationId);

  const { data: clientOrdersData, error: clientOrdersError } =
    await standaloneOrdersQuery;

  if (clientOrdersError) {
    return { data: null, error: clientOrdersError };
  }

  const standaloneOrderCandidates = (clientOrdersData || []).filter(
    (order) => !appointmentLinkedOrderIds.has(order.id as string),
  );

  const standaloneOrderIds = standaloneOrderCandidates.map(
    (order) => order.id as string,
  );

  if (standaloneOrderIds.length > 0) {
    const { data: standalonePayments } = await supabase
      .from("payment")
      .select("order_id, amount_gross")
      .in("order_id", standaloneOrderIds);

    for (const payment of (standalonePayments || []) as Array<{
      order_id: string | null;
      amount_gross: number | null;
    }>) {
      if (!payment.order_id) continue;
      const current = amountPaidByOrderId.get(payment.order_id) || 0;
      amountPaidByOrderId.set(payment.order_id, current + (payment.amount_gross || 0));
    }
  }

  const standaloneItems = standaloneOrderCandidates.flatMap(
    (order) => (order.order_item || []) as RawOrderItemRow[],
  );
  const hydratedStandaloneItems = await hydrateOrderItemCatalog(
    standaloneItems,
    supabase,
  );
  const standaloneItemsById = new Map(
    hydratedStandaloneItems.map((item) => [item.id, item]),
  );

  const standaloneOrders: ClientHistoryStandaloneOrder[] =
    standaloneOrderCandidates.map((order) => {
      const orderDate =
        (order.date as string | null) ||
        (order.created_at as string) ||
        new Date().toISOString();
      const items = ((order.order_item || []) as RawOrderItemRow[]).map((item) =>
        mapOrderItemRow(standaloneItemsById.get(item.id) || item),
      );

      return {
        id: order.id as string,
        date: orderDate,
        order_number: order.order_number as string | null,
        total_amount: order.total_amount as number | null,
        payment_status: order.payment_status as string | null,
        amount_paid: amountPaidByOrderId.get(order.id as string) || 0,
        orderItems: items,
      };
    });

  const timeline = buildTimeline(transformedAppointments, standaloneOrders);

  return {
    data: {
      client: clientData as ClientHistoryClient,
      appointments: transformedAppointments,
      standaloneOrders,
      timeline,
    },
    error: null,
  };
}
