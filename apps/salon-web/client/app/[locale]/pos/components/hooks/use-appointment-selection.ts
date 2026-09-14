import { useEffect, useRef } from "react";
import type { Appointment, CartItem } from "../types";

export function useAppointmentSelection(
  appointments: Appointment[],
  selectedAppointmentIds: string[],
  cart: CartItem[],
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>
) {
  const previousSelectedAppointmentIdsRef = useRef<string[]>([]);

  useEffect(() => {
    const previousIds = previousSelectedAppointmentIdsRef.current;

    const deselectedIds = previousIds.filter(
      (id) => !selectedAppointmentIds.includes(id)
    );
    const newlySelectedIds = selectedAppointmentIds.filter(
      (id) => !previousIds.includes(id)
    );

    if (deselectedIds.length > 0) {
      setCart((prev) =>
        prev.filter(
          (item) =>
            !item.appointmentId || !deselectedIds.includes(item.appointmentId)
        )
      );
    }

    if (newlySelectedIds.length > 0) {
      const newItems: CartItem[] = [];

      newlySelectedIds.forEach((appointmentId) => {
        const appointment = appointments.find(
          (apt) => apt.id === appointmentId
        );
        if (!appointment?.segments) return;

        appointment.segments
          .filter((segment) => segment.service && segment.service_variant)
          .forEach((segment) => {
            const service = segment.service!;
            const serviceVariant = segment.service_variant!;
            const grossPrice = Math.round((serviceVariant.price || 0) * 100) / 100;

            newItems.push({
              id: service.id,
              name: `${service.name} - ${serviceVariant.name}`,
              price: grossPrice,
              quantity: 1,
              type: "service" as const,
              serviceVariantId: serviceVariant.id,
              vatRate: serviceVariant.vat_rate || 21,
              appointmentSegmentId: segment.id,
              appointmentId: appointmentId,
            });
          });
      });

      if (newItems.length > 0) {
        setCart((prev) => {
          const existingIds = new Set(
            prev.map((item) => item.appointmentSegmentId).filter(Boolean)
          );
          const toAdd = newItems.filter(
            (item) => !existingIds.has(item.appointmentSegmentId!)
          );
          return [...prev, ...toAdd];
        });
      }
    }

    previousSelectedAppointmentIdsRef.current = [...selectedAppointmentIds];
  }, [selectedAppointmentIds, appointments, setCart]);
}
