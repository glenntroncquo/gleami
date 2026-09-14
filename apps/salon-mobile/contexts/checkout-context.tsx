import React, { createContext, useContext, useState } from 'react';

import type { AppointmentRow } from '@/lib/api/calendar';
import type { CheckoutAppointment } from '@/lib/api/checkout';
import { useAuth } from './auth-context';
import { useLocation } from './location-context';

type CheckoutContextValue = {
  appointment: CheckoutAppointment | null;
  prepareCheckout: (appointment: AppointmentRow) => void;
};

const CheckoutContext = createContext<CheckoutContextValue | null>(null);

// Like the website's EmbeddedPosSession, carry the loaded appointment into
// checkout. Keep customer data out of route parameters and persistent storage.
export function CheckoutProvider({ children }: { children: React.ReactNode }) {
  const { user, companyId } = useAuth();
  const { locationId } = useLocation();
  const scope = `${user?.id ?? ''}:${companyId ?? ''}:${locationId ?? ''}`;
  const [session, setSession] = useState<{ scope: string; appointment: CheckoutAppointment } | null>(null);

  const prepareCheckout = (appointment: AppointmentRow) => {
    setSession({
      scope,
      appointment: {
        id: appointment.id,
        client_id: appointment.client_id,
        client: appointment.client,
        appointment_segment: appointment.appointment_segment
          .filter((segment) => segment.service && segment.service_variant)
          .map((segment) => ({
            id: segment.id,
            sequence: segment.sequence,
            price: segment.price,
            service_id: segment.service!.id,
            service_variant_id: segment.service_variant!.id,
            service: segment.service,
            service_variant: segment.service_variant,
          })),
      },
    });
  };

  return (
    <CheckoutContext.Provider value={{ appointment: session?.scope === scope ? session.appointment : null, prepareCheckout }}>
      {children}
    </CheckoutContext.Provider>
  );
}

export function useCheckout() {
  const context = useContext(CheckoutContext);
  if (!context) throw new Error('useCheckout must be used within CheckoutProvider');
  return context;
}
