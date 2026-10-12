import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import {
  hydrateLocationsForCompany,
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
  const { companyId, loading: authLoading } = useAuth();
  const [locations, setLocations] = useState<ShopLocation[]>([]);
  const [locationId, setLocationIdState] = useState<string | null>(null);
  const [settledCompanyId, setSettledCompanyId] = useState<string | null>(null);
  // True in the same render a company id appears, before the fetch effect runs.
  const loading = authLoading || (companyId !== null && settledCompanyId !== companyId);

  useEffect(() => {
    if (authLoading) return;
    if (!companyId) {
      setLocations([]);
      setLocationIdState(null);
      setSettledCompanyId(null);
      return;
    }

    let cancelled = false;

    (async () => {
      const stored = await readPreferredLocationId(companyId);
      if (!cancelled && stored) {
        setLocationIdState(stored);
      }

      const nextLocations = await hydrateLocationsForCompany(companyId);
      if (cancelled) return;

      const picked = pickLocationId(nextLocations, stored);
      setLocations(nextLocations);
      setLocationIdState(picked);
      if (picked) {
        void writePreferredLocationId(companyId, picked);
      }
      setSettledCompanyId(companyId);
    })().catch(() => {
      if (cancelled) return;
      setLocations([]);
      setLocationIdState((current) => current);
      setSettledCompanyId(companyId);
    });

    return () => {
      cancelled = true;
    };
  }, [authLoading, companyId]);

  const setLocationId = useCallback(
    (next: string) => {
      setLocationIdState(next);
      if (companyId) {
        void writePreferredLocationId(companyId, next);
      }
    },
    [companyId]
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
