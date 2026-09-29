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
  setSearch: (q: string, categoryId: string | null) => void;
  setCategory: (id: string | null) => void;
  /** `null` clears the selection. */
  toggleCategory: (id: string | null) => void;
  setFilters: (categoryIds: string[], radiusKm: number | null) => void;
  setUserLocation: (coords: LatLng) => void;
  showAreaSearch: (bbox: BBox) => void;
  applyAreaSearch: () => void;
  /** Move the map to a text-search hit without clearing the query. */
  focusResults: (coords: LatLng) => void;
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
  setSearch: (q, categoryId) => set({ q, categoryIds: categoryId ? [categoryId] : [] }),
  setCategory: (id) => set({ categoryIds: id ? [id] : [] }),
  // Browsing by category replaces a typed query, the same way picking a suggestion does.
  toggleCategory: (id) =>
    set((state) => ({
      q: '',
      categoryIds:
        id === null
          ? []
          : state.categoryIds.includes(id)
            ? state.categoryIds.filter((current) => current !== id)
            : [...state.categoryIds, id],
    })),
  setFilters: (categoryIds, radiusKm) => set((state) => ({
    categoryIds,
    radiusKm,
    // A chosen distance replaces map bounds; category-only changes keep the map area.
    ...(radiusKm !== state.radiusKm ? { bbox: null, pendingBbox: null, areaSearchVisible: false } : {}),
  })),
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
  focusResults: (coords) => set({
    center: coords,
    bbox: null,
    pendingBbox: null,
    areaSearchVisible: false,
  }),
}));
