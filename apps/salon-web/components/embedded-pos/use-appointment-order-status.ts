"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchAppointmentOrderData } from "./fetch-appointment-order";
import type { OrderDialogData } from "./types";

export function useAppointmentOrderStatus(appointmentId: string | undefined) {
  const [hasOrder, setHasOrder] = useState(false);
  const [currentAppointmentOrder, setCurrentAppointmentOrder] =
    useState<OrderDialogData | null>(null);

  const fetchOrderForAppointment = useCallback(async (apptId: string) => {
    const mapped = await fetchAppointmentOrderData(apptId);
    if (mapped) {
      setHasOrder(true);
      setCurrentAppointmentOrder(mapped);
    } else {
      setHasOrder(false);
      setCurrentAppointmentOrder(null);
    }
    return mapped;
  }, []);

  const refreshOrderStatus = useCallback(() => {
    if (!appointmentId) {
      setHasOrder(false);
      setCurrentAppointmentOrder(null);
      return Promise.resolve(null);
    }
    return fetchOrderForAppointment(appointmentId);
  }, [appointmentId, fetchOrderForAppointment]);

  useEffect(() => {
    if (!appointmentId) {
      setHasOrder(false);
      setCurrentAppointmentOrder(null);
      return;
    }
    void fetchOrderForAppointment(appointmentId);
  }, [appointmentId, fetchOrderForAppointment]);

  return {
    hasOrder,
    currentAppointmentOrder,
    fetchOrderForAppointment,
    refreshOrderStatus,
  };
}
