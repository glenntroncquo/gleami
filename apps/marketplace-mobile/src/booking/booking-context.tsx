import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import type { AvailabilitySlot } from '@/src/api/booking-types';
import { itemKey, type CatalogItem } from '@/src/booking/catalog';

export type ConfirmedBooking = {
  bookingId: string;
  dayKey: string;
  slot: AvailabilitySlot;
  items: CatalogItem[];
  price: number;
};

/** Null means "not edited yet", so the signed-in profile still shows through. */
export type CustomerDraft = {
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
};

type BookingDraft = {
  items: CatalogItem[];
  dayKey: string | null;
  slot: AvailabilitySlot | null;
  customer: CustomerDraft;
  notes: string;
  confirmed: ConfirmedBooking | null;
};

type BookingContextValue = BookingDraft & {
  selectedKeys: Set<string>;
  /** Adds or removes one service row and drops any slot picked for the old cart. */
  toggleItem: (item: CatalogItem) => void;
  /** Day and slot are stored together: a slot is meaningless without its day. */
  chooseSlot: (dayKey: string, slot: AvailabilitySlot) => void;
  setCustomer: (patch: Partial<CustomerDraft>) => void;
  setNotes: (notes: string) => void;
  confirm: (booking: ConfirmedBooking) => void;
};

const BookingContext = createContext<BookingContextValue | undefined>(undefined);

export function useBooking(): BookingContextValue {
  const context = useContext(BookingContext);
  if (!context) throw new Error('useBooking must be used within a BookingProvider');
  return context;
}

export function BookingProvider({
  children,
  initialItems = [],
}: {
  children: React.ReactNode;
  /** Set when the user tapped a specific service on the salon page. */
  initialItems?: CatalogItem[];
}) {
  const [draft, setDraft] = useState<BookingDraft>({
    items: initialItems,
    dayKey: null,
    slot: null,
    customer: { firstName: null, lastName: null, phone: null },
    notes: '',
    confirmed: null,
  });

  const toggleItem = useCallback((item: CatalogItem) => {
    setDraft((current) => {
      const key = itemKey(item);
      const next = current.items.some((entry) => itemKey(entry) === key)
        ? current.items.filter((entry) => itemKey(entry) !== key)
        : [...current.items, item];
      // A slot is only valid for the cart it was searched with.
      return { ...current, items: next, slot: null };
    });
  }, []);

  const chooseSlot = useCallback((dayKey: string, slot: AvailabilitySlot) => {
    setDraft((current) => ({ ...current, dayKey, slot }));
  }, []);
  const setCustomer = useCallback((patch: Partial<CustomerDraft>) => {
    setDraft((current) => ({ ...current, customer: { ...current.customer, ...patch } }));
  }, []);
  const setNotes = useCallback((notes: string) => {
    setDraft((current) => ({ ...current, notes }));
  }, []);
  const confirm = useCallback((confirmed: ConfirmedBooking) => {
    setDraft((current) => ({ ...current, confirmed }));
  }, []);

  const value = useMemo<BookingContextValue>(
    () => ({
      ...draft,
      selectedKeys: new Set(draft.items.map(itemKey)),
      toggleItem,
      chooseSlot,
      setCustomer,
      setNotes,
      confirm,
    }),
    [draft, toggleItem, chooseSlot, setCustomer, setNotes, confirm],
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}
