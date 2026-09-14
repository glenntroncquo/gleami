import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Product, Service, Appointment } from "../types";
import {
  asLocationClient,
  fetchServiceIdsForLocation,
  withLocationId,
} from "@/lib/location";

export function usePOSData(
  companyId: string | null,
  locationId?: string | null,
) {
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const companyReaderId: string | null = null;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!companyId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const supabase = createClient();

        const { data: productsData } = await supabase
          .from("product")
          .select("id, name, price_gross, stock_qty, sku, vat_rate")
          .eq("active", true)
          .eq("company_id", companyId);

        const servicesQuery = supabase
          .from("service")
          .select(
            `
            id,
            name,
            service_variants:service_variant(id, name, price, client_duration_minutes, vat_rate)
          `
          )
          .eq("is_active", true)
          .eq("is_deleted", false)
          .eq("company_id", companyId);

        let offeredIds: string[] | null = null;
        if (locationId) {
          const offered = await fetchServiceIdsForLocation(
            asLocationClient(supabase),
            locationId,
          );
          if (offered.tablePresent) {
            offeredIds = offered.data;
          }
        }
        const { data: servicesData } =
          offeredIds && offeredIds.length === 0
            ? { data: [] }
            : await (offeredIds
                ? servicesQuery.in("id", offeredIds)
                : servicesQuery);

        const today = new Date().toISOString().split("T")[0];
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split("T")[0];

        const { data: appointmentsData } = await withLocationId(
          supabase
            .from("appointment")
            .select(
              `
            id,
            start,
            end,
            order_item!appointment_id(id),
            client:client_id (id, first_name, last_name, email),
            appointment_segment (
              id,
              service_id,
              service_variant_id,
              service:service_id (id, name),
              service_variant:service_variant_id (id, name, price, client_duration_minutes, vat_rate)
            )
          `
            )
            .eq("company_id", companyId)
            .eq("is_canceled", false)
            .gte("start", today)
            .lt("start", tomorrowStr)
            .order("start", { ascending: true }),
          locationId,
        );

        const filteredAppointments = (appointmentsData || []).filter(
          (appointment) =>
            !appointment.order_item || appointment.order_item.length === 0
        );

        setProducts(productsData || []);
        setServices(
          ((servicesData || []) as Array<{
            id: string;
            name: string;
            service_variants?: Array<{
              id: string;
              name: string;
              price: number;
              client_duration_minutes?: number;
              vat_rate?: number | null;
            }>;
          }>).map((service) => ({
            id: service.id,
            name: service.name,
            service_variants: (service.service_variants || []).map((option) => ({
              id: option.id,
              name: option.name,
              price: option.price,
              duration_in_minutes: Number(option.client_duration_minutes || 0),
              vat_rate: option.vat_rate,
            })),
          })),
        );
        setAppointments(
          (filteredAppointments as unknown as Array<Record<string, unknown>>).map(
            (appointment) => {
              const segments = (appointment.appointment_segment || []) as Array<{
                id: string;
                service_id: string;
                service_variant_id: string;
                service: { id: string; name: string } | null;
                service_variant: {
                  id: string;
                  name: string;
                  price: number;
                  client_duration_minutes: number;
                  vat_rate?: number | null;
                } | null;
              }>;
              return {
                ...appointment,
                segments: segments.map((segment) => ({
                  id: segment.id,
                  service_id: segment.service_id,
                  service_variant_id: segment.service_variant_id,
                  service: segment.service,
                  service_variant: segment.service_variant
                    ? {
                        id: segment.service_variant.id,
                        name: segment.service_variant.name,
                        price: segment.service_variant.price,
                        duration_in_minutes: Number(
                          segment.service_variant.client_duration_minutes || 0,
                        ),
                        vat_rate: segment.service_variant.vat_rate,
                      }
                    : null,
                })),
              };
            },
          ) as unknown as Appointment[],
        );
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [companyId, locationId]);

  return { products, services, appointments, companyReaderId, loading };
}
