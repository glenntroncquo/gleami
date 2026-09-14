import type { ClientHistoryOrderItem } from "@/lib/api/client/queries/fetch-client-history";

function uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value?.trim() ?? "";
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

export function formatHistoryOrderItemName(
  item: ClientHistoryOrderItem,
  unknownLabel: string,
): string {
  if (item.product?.name) {
    return item.product.name;
  }

  if (item.service?.name && item.service_variant?.name) {
    return `${item.service.name} - ${item.service_variant.name}`;
  }

  if (item.service_variant?.service?.name && item.service_variant?.name) {
    return `${item.service_variant.service.name} - ${item.service_variant.name}`;
  }

  return item.service?.name || item.service_variant?.name || unknownLabel;
}

/**
 * History row heading from segments (service + variant), then order items.
 * Never uses catalog/event colors — callers must style this as normal foreground.
 */
export function formatHistoryAppointmentTitle(
  appointment: {
    services: Array<{
      serviceName?: string | null;
      serviceVariant?: { name?: string | null } | null;
    }>;
    orderItems?: ClientHistoryOrderItem[];
  },
  fallbackLabel: string,
): string {
  const fromSegments = uniqueNonEmpty(
    appointment.services.map((segment) => {
      const service = segment.serviceName?.trim() ?? "";
      const variant = segment.serviceVariant?.name?.trim() ?? "";
      if (service && variant && service !== variant) {
        return `${service} - ${variant}`;
      }
      return service || variant;
    }),
  );
  if (fromSegments.length > 0) {
    return fromSegments.join(", ");
  }

  const fromOrderItems = uniqueNonEmpty(
    (appointment.orderItems ?? []).map((item) =>
      formatHistoryOrderItemName(item, ""),
    ),
  );
  if (fromOrderItems.length > 0) {
    return fromOrderItems.join(", ");
  }

  return fallbackLabel;
}

export function getHistoryPaymentVisualState(input: {
  is_canceled?: boolean | null;
  order?: { payment_status: string | null } | null;
}): {
  dotContainer: string;
  dot: string;
} {
  if (input.is_canceled) {
    return {
      dotContainer: "bg-red-100 border-red-500",
      dot: "bg-red-500",
    };
  }

  const status = input.order?.payment_status;
  if (status === "paid") {
    return {
      dotContainer: "bg-green-100 border-green-500",
      dot: "bg-green-500",
    };
  }
  if (status === "unpaid" || status === "pending") {
    return {
      dotContainer: "bg-yellow-100 border-yellow-500",
      dot: "bg-yellow-500",
    };
  }
  if (status === "failed") {
    return {
      dotContainer: "bg-red-100 border-red-500",
      dot: "bg-red-500",
    };
  }
  if (input.order) {
    return {
      dotContainer: "bg-yellow-100 border-yellow-500",
      dot: "bg-yellow-500",
    };
  }

  return {
    dotContainer: "bg-blue-100 border-blue-500",
    dot: "bg-blue-500",
  };
}
