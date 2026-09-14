import type { EmbeddedPosServiceInput } from "./types";

export function mapAppointmentSegmentsToInput(
  items: Array<{
    serviceId: string;
    service: { id: string; name: string };
    serviceVariant: {
      id: string;
      name: string;
      price: number;
      vat_rate?: number | null;
    };
  }>,
): EmbeddedPosServiceInput[] {
  return items
    .filter((item) => item.serviceId && item.serviceVariant?.id)
    .map((item) => ({
      serviceId: item.serviceId,
      serviceName: item.service?.name || "",
      serviceVariant: {
        id: item.serviceVariant.id,
        name: item.serviceVariant.name,
        price: item.serviceVariant.price,
        vat_rate: item.serviceVariant.vat_rate,
      },
    }));
}
