import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import {
  fetchCompanyMultiLocationEnabled,
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
  const [multiLocationEnabled, setMultiLocationEnabled] = useState(false);
  // Starts true so consumers never see a "no location" flash between auth
  // resolving and this provider's fetch effect actually kicking off.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!companyId) {
      setLocations([]);
      setLocationIdState(null);
      setMultiLocationEnabled(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      const stored = await readPreferredLocationId(companyId);
      if (!cancelled && stored) {
        setLocationIdState(stored);
      }

      const [nextLocations, enabled] = await Promise.all([
        hydrateLocationsForCompany(companyId),
        fetchCompanyMultiLocationEnabled(companyId).catch(() => false),
      ]);
      if (cancelled) return;

      const picked = pickLocationId(nextLocations, stored);
      setLocations(nextLocations);
      setMultiLocationEnabled(enabled);
      setLocationIdState(picked);
      if (picked) {
        void writePreferredLocationId(companyId, picked);
      }
      setLoading(false);
    })().catch(() => {
      if (cancelled) return;
      setLocations([]);
      setLocationIdState((current) => current);
      setLoading(false);
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
      showLocationPicker: multiLocationEnabled && locations.length > 1,
      setLocationId,
    }),
    [locationId, locations, loading, multiLocationEnabled, setLocationId]
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}
