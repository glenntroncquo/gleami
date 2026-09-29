"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import {
  RiCalendarLine,
  RiTimeLine,
  RiScissorsLine,
  RiCloseLine,
} from "@remixicon/react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface AppointmentSegment {
  service: { id: string; name: string };
  serviceVariant: { id: string; name: string };
  staff?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
}

interface Appointment {
  id: string;
  start: string;
  end: string;
  notes: string | null;
  is_canceled: boolean;
  staff: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  segments: AppointmentSegment[];
}

/**
 * Guest manage-booking page. The URL carries the emailed capability:
 * /cancel-appointment/{appointmentId}/{token}. The token is verified
 * server-side against its stored SHA-256 hash and manages exactly one
 * appointment. Links from before the token rollout (…/{companyId}/{clientId})
 * no longer resolve — that is intentional.
 */
export default function CancelAppointmentPage() {
  const t = useTranslations("cancelAppointment");
  const params = useParams();
  const appointmentId = params.appointmentId as string;
  const token = params.token as string;

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!appointmentId || !token) {
        setError(t("error"));
        return;
      }

      const supabase = createClient();

      const { data, error } = await supabase.functions.invoke(
        "appointment-list",
        {
          body: {
            appointment_id: appointmentId,
            token,
          },
        }
      );

      if (error) {
        console.error("Error fetching appointment:", error);
        setError(t("error"));
        return;
      }

      const found = (data?.appointments || []) as Array<{
        id: string;
        start: string;
        end: string;
        notes: string | null;
        is_canceled: boolean;
        staff: Appointment["staff"];
        appointment_segment: Array<{
          id: string;
          staff_id: string;
          sequence: number;
          service: { id: string; name: string };
          service_variant: { id: string; name: string };
        }>;
      }>;

      const first = found[0];
      if (!first) {
        setAppointment(null);
        return;
      }

      setAppointment({
        id: first.id,
        start: first.start,
        end: first.end,
        notes: first.notes,
        is_canceled: first.is_canceled,
        staff: first.staff,
        segments: (first.appointment_segment || [])
          .slice()
          .sort((a, b) => a.sequence - b.sequence)
          .map((segment) => ({
            service: segment.service,
            serviceVariant: segment.service_variant,
            staff: null,
          })),
      });
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  }, [appointmentId, token, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCancelAppointment = async () => {
    if (!appointment) return;

    try {
      setCanceling(true);

      const supabase = createClient();

      const { error } = await supabase.functions.invoke("appointment-cancel", {
        body: {
          appointmentId: appointment.id,
          token,
        },
      });

      if (error) {
        console.error("Error canceling appointment:", error);
        toast.error(t("error"));
        return;
      }

      toast.success(t("success.cancelled"));
      setAppointment((prev) => (prev ? { ...prev, is_canceled: true } : prev));
    } catch (err) {
      console.error("Error canceling appointment:", err);
      toast.error(t("error"));
    } finally {
      setCanceling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center mx-auto mb-6">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600"></div>
          </div>
          <p className="text-gray-600 text-lg font-medium">{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Card className="w-full max-w-lg border-0 bg-white/80 backdrop-blur-sm shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl">⚠</span>
            </div>
            <CardTitle className="text-red-600 text-xl">{t("error")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => window.location.reload()}
              className="w-full bg-red-600 hover:bg-red-700 border-0 py-3 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {t("tryAgain")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const cancellable =
    appointment !== null &&
    !appointment.is_canceled &&
    new Date(appointment.start).getTime() > Date.now();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
      <div className="w-full max-w-3xl mx-auto px-4 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {t("title")}
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t("description")}
          </p>
        </div>

        {!appointment ? (
          <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
            <CardContent className="p-12">
              <div className="text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <RiCalendarLine className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                  {t("noAppointments")}
                </h3>
                <p className="text-gray-600 text-lg max-w-md mx-auto">
                  {t("noAppointmentsDescription")}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <RiScissorsLine className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {appointment.segments.length > 0
                          ? appointment.segments.length === 1
                            ? appointment.segments[0].service.name
                            : `${appointment.segments.length} ${t("services")}`
                          : t("service")}
                      </h3>
                      {appointment.segments.length > 1 && (
                        <div className="mb-2">
                          <div className="space-y-1">
                            {appointment.segments.map((segment, index) => (
                              <div
                                key={index}
                                className="text-sm text-gray-700 bg-gray-50 px-3 py-1 rounded-full inline-block mr-2"
                              >
                                {segment.service.name} -{" "}
                                {segment.serviceVariant.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {appointment.segments.length === 1 && (
                        <p className="text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-full inline-block">
                          {appointment.segments[0].serviceVariant.name}
                        </p>
                      )}
                      {appointment.staff && (
                        <p className="text-sm text-gray-600 bg-blue-50 px-3 py-1 rounded-full inline-block mt-2">
                          {t("with")} {appointment.staff.first_name}{" "}
                          {appointment.staff.last_name}
                        </p>
                      )}
                      {appointment.is_canceled && (
                        <p className="text-sm text-red-700 bg-red-50 px-3 py-1 rounded-full inline-block mt-2">
                          {t("success.cancelled")}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <RiCalendarLine className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-medium">
                          {t("date")}
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {format(
                            new Date(appointment.start),
                            "EEEE, MMMM d, yyyy"
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <RiTimeLine className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-medium">
                          {t("time")}
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {format(new Date(appointment.start), "HH:mm")} -{" "}
                          {format(new Date(appointment.end), "HH:mm")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {appointment.notes && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                          <span className="text-blue-600 text-xs">ℹ</span>
                        </div>
                        <div>
                          <p className="text-xs text-blue-600 uppercase font-medium mb-1">
                            {t("notes")}
                          </p>
                          <p className="text-sm text-blue-800">
                            {appointment.notes}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {cancellable && (
                  <div className="flex-shrink-0">
                    <Button
                      variant="destructive"
                      size="lg"
                      onClick={handleCancelAppointment}
                      disabled={canceling}
                      className="flex items-center gap-3 px-6 py-3 bg-red-600 hover:bg-red-700 border-0 shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      {canceling ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span className="font-medium">{t("canceling")}</span>
                        </>
                      ) : (
                        <>
                          <RiCloseLine className="h-5 w-5" />
                          <span className="font-medium">{t("cancel")}</span>
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="mt-16 text-center">
          <Separator className="mb-6" />
          <div className="max-w-2xl mx-auto">
            <p className="text-gray-500 text-sm leading-relaxed">
              {t("contactSalon")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
