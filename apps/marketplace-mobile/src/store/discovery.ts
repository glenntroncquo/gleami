import { create } from 'zustand';

import type { BBox, LatLng } from '@/src/api/types';
import { BRUSSELS, DEFAULT_RADIUS_KM } from '@/src/config';

type DiscoveryState = {
  q: string;
  categoryIds: string[];
  center: LatLng;
  radiusKm: number | null;
  bbox: BBox | null;
  pendingBbox: BBox | null;
  areaSearchVisible: boolean;
  userLocation: LatLng | null;
  setQuery: (q: string) => void;
  setCategory: (id: string | null) => void;
  setUserLocation: (coords: LatLng) => void;
  showAreaSearch: (bbox: BBox) => void;
  applyAreaSearch: () => void;
};

export const useDiscovery = create<DiscoveryState>((set, get) => ({
  q: '',
  categoryIds: [],
  center: BRUSSELS,
  radiusKm: DEFAULT_RADIUS_KM,
  bbox: null,
  pendingBbox: null,
  areaSearchVisible: false,
  userLocation: null,
  setQuery: (q) => set({ q }),
  setCategory: (id) => set({ categoryIds: id ? [id] : [] }),
  setUserLocation: (coords) =>
    set((state) => {
      if (state.bbox || state.areaSearchVisible) {
        return { userLocation: coords };
      }
      return {
        userLocation: coords,
        center: coords,
        radiusKm: state.radiusKm ?? DEFAULT_RADIUS_KM,
      };
    }),
  showAreaSearch: (bbox) => set({ pendingBbox: bbox, areaSearchVisible: true }),
  applyAreaSearch: () => {
    const pending = get().pendingBbox;
    if (!pending) return;
    set({
      bbox: pending,
      radiusKm: null,
      areaSearchVisible: false,
    });
  },
}));
