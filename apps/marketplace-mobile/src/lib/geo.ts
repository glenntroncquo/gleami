import type { BBox, LatLng } from '@/src/api/types';

export function distanceKm(a: LatLng, b: LatLng): number {
  const earthRadiusKm = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function bboxAround(center: LatLng, radiusKm: number): BBox {
  const latDelta = radiusKm / 110.574;
  const lngScale = Math.max(0.2, Math.cos((center.lat * Math.PI) / 180));
  const lngDelta = radiusKm / (111.32 * lngScale);
  return {
    minLat: center.lat - latDelta,
    maxLat: center.lat + latDelta,
    minLng: center.lng - lngDelta,
    maxLng: center.lng + lngDelta,
  };
}

export function inBBox(lat: number, lng: number, bbox: BBox): boolean {
  return lng >= bbox.minLng && lng <= bbox.maxLng && lat >= bbox.minLat && lat <= bbox.maxLat;
}

export function bboxCenter(bbox: BBox): LatLng {
  return {
    lat: (bbox.minLat + bbox.maxLat) / 2,
    lng: (bbox.minLng + bbox.maxLng) / 2,
  };
}
