import { create } from 'zustand';

import type { BBox, LatLng } from '@/src/api/types';
import { GHENT, DEFAULT_RADIUS_KM, mapboxToken } from '@/src/config';

type DiscoveryState = {
  q: string;
  categoryIds: string[];
  center: LatLng;
  radiusKm: number | null;
  bbox: BBox | null;
  pendingBbox: BBox | null;
  areaSearchVisible: boolean;
  userLocation: LatLng | null;
  locationLabel: string;
  setSearchLocation: (coords: LatLng, label: string) => void;
  setQuery: (q: string) => void;
  setSearch: (q: string, categoryId: string | null) => void;
  setCategory: (id: string | null) => void;
  /** `null` clears the selection. */
  toggleCategory: (id: string | null) => void;
  setFilters: (categoryIds: string[], radiusKm: number | null) => void;
  setUserLocation: (coords: LatLng) => void;
  initializeDeviceLocation: () => Promise<void>;
  showAreaSearch: (bbox: BBox) => void;
  applyAreaSearch: () => void;
  /** Move the map to a text-search hit without clearing the query. */
  focusResults: (coords: LatLng) => void;
};

export async function labelForCoordinates(coords: LatLng): Promise<string> {
  try {
    const Location = await import('expo-location');
    const [place] = await Location.reverseGeocodeAsync({ latitude: coords.lat, longitude: coords.lng });
    const localLabel = place?.district || place?.city || place?.name;
    if (localLabel && localLabel !== place?.subregion) return localLabel;
  } catch { /* Try Mapbox reverse search below. */ }

  if (mapboxToken) {
    try {
      const params = new URLSearchParams({ longitude: String(coords.lng), latitude: String(coords.lat), access_token: mapboxToken, language: 'nl,fr', limit: '1' });
      const response = await fetch(`https://api.mapbox.com/search/searchbox/v1/reverse?${params}`);
      if (response.ok) {
        const data = await response.json() as { features?: { properties?: { name?: string; feature_type?: string } }[] };
        const feature = data.features?.find((item) => ['locality', 'neighborhood', 'place', 'district'].includes(item.properties?.feature_type ?? '')) ?? data.features?.[0];
        if (feature?.properties?.name) return feature.properties.name;
      }
    } catch { /* Keep the GPS location even if reverse lookup is unavailable. */ }
  }
  return 'Huidige locatie';
}

export const useDiscovery = create<DiscoveryState>((set, get) => ({
  q: '',
  categoryIds: [],
  center: GHENT,
  radiusKm: DEFAULT_RADIUS_KM,
  bbox: null,
  pendingBbox: null,
  areaSearchVisible: false,
  userLocation: null,
  locationLabel: 'Gent',
  setSearchLocation: (coords, label) => set({ center: coords, userLocation: coords, locationLabel: label, bbox: null, pendingBbox: null, areaSearchVisible: false, radiusKm: DEFAULT_RADIUS_KM }),
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
  initializeDeviceLocation: async () => {
    if (get().userLocation) return;
    try {
      const Location = await import('expo-location');
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        set({ center: GHENT, userLocation: null, locationLabel: 'Gent' });
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
      const label = await labelForCoordinates(coords);
      set({ center: coords, userLocation: coords, locationLabel: label, bbox: null, pendingBbox: null, areaSearchVisible: false });
    } catch {
      set({ center: GHENT, userLocation: null, locationLabel: 'Gent' });
    }
  },
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
