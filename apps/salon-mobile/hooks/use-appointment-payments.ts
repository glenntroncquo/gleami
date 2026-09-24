import React from 'react';
import { useFocusEffect } from 'expo-router';
import { fetchAppointmentPaymentStatuses, type AppointmentPaymentInfo } from '@/lib/api/orders';
import { cachedPayment, paymentRevision, publishPayments, subscribePayments } from '@/lib/appointment-payment-state';

/** All mounted sheets share confirmed checkout updates, including sheets behind a modal. */
export function useAppointmentPayments(companyId: string | null, appointmentIds: string[]) {
  const idsKey = JSON.stringify([...new Set(appointmentIds)].sort());
  const revision = React.useSyncExternalStore(subscribePayments, paymentRevision, paymentRevision);
  useFocusEffect(React.useCallback(() => {
    if (!companyId) return;
    let active = true;
    const requestRevision = paymentRevision();
    fetchAppointmentPaymentStatuses(companyId, JSON.parse(idsKey)).then(statuses => {
      if (active) publishPayments(companyId, statuses, requestRevision);
    }).catch(() => {
      // Keep a confirmed payment when a refresh fails instead of reverting to unpaid.
    });
    return () => { active = false; };
  }, [companyId, idsKey]));
  const statuses: Record<string, AppointmentPaymentInfo> = {};
  if (companyId && revision >= 0) for (const id of appointmentIds) {
    const payment = cachedPayment(companyId, id);
    if (payment) statuses[id] = payment;
  }
  return statuses;
}
