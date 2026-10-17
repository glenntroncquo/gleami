import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import {
  hydrateAccessibleLocations,
  pickLocationId,
  type ShopLocation,
} from '@/lib/api/memberships';
import { readPreferredLocationId, writePreferredLocationId } from '@/lib/preferences';

interface LocationContextType {
  locationId: string | null;
  locations: ShopLocation[];
  loading: boolean;
  showLocationPicker: boolean;
  setLocationId: (locationId: string) => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const { companyId, loading: authLoading, user, setCompanyId } = useAuth();
  const [locations, setLocations] = useState<ShopLocation[]>([]);
  const [locationId, setLocationIdState] = useState<string | null>(null);
  const [settledUserId, setSettledUserId] = useState<string | null>(null);
  const userId = user?.id ?? null;
  const companyIdRef = useRef(companyId);
  companyIdRef.current = companyId;
  // True until the signed-in user's locations have loaded.
  const loading = authLoading || (userId !== null && settledUserId !== userId);

  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      setLocations([]);
      setLocationIdState(null);
      setSettledUserId(null);
      return;
    }

    let cancelled = false;

    (async () => {
      const activeCompanyId = companyIdRef.current;
      const stored = activeCompanyId ? await readPreferredLocationId(activeCompanyId) : null;
      if (!cancelled && stored) {
        setLocationIdState(stored);
      }

      const nextLocations = await hydrateAccessibleLocations(userId);
      if (cancelled) return;

      const inCompany = activeCompanyId
        ? nextLocations.filter((location) => location.company_id === activeCompanyId)
        : [];
      const picked = pickLocationId(inCompany.length > 0 ? inCompany : nextLocations, stored);
      const pickedLocation = nextLocations.find((location) => location.id === picked);
      const pickedCompanyId = pickedLocation?.company_id ?? activeCompanyId;

      setLocations(nextLocations);
      setLocationIdState(picked);
      if (picked && pickedCompanyId) {
        void writePreferredLocationId(pickedCompanyId, picked);
      }
      if (pickedCompanyId && pickedCompanyId !== companyIdRef.current) {
        setCompanyId(pickedCompanyId);
      }
      setSettledUserId(userId);
    })().catch(() => {
      if (cancelled) return;
      setLocations([]);
      setLocationIdState((current) => current);
      setSettledUserId(userId);
    });

    return () => {
      cancelled = true;
    };
  }, [authLoading, userId, setCompanyId]);

  const setLocationId = useCallback(
    (next: string) => {
      setLocationIdState(next);
      const location = locations.find((row) => row.id === next);
      const nextCompanyId = location?.company_id ?? companyId;
      if (nextCompanyId) {
        void writePreferredLocationId(nextCompanyId, next);
        if (nextCompanyId !== companyId) setCompanyId(nextCompanyId);
      }
    },
    [companyId, locations, setCompanyId]
  );

  const value = useMemo<LocationContextType>(
    () => ({
      locationId,
      locations,
      loading,
      showLocationPicker: locations.length > 1,
      setLocationId,
    }),
    [locationId, locations, loading, setLocationId]
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}
