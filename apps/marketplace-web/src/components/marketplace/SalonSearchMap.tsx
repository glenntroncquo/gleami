"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { MapPinIcon, MaximizeIcon, MinusIcon, PlusIcon, SearchIcon } from "lucide-react";
import type { Map as MapboxMap, Marker } from "mapbox-gl";
import type { Locale } from "@/lib/i18n";
import type { MapPoint } from "@/lib/places";
import { explorerCopy } from "./explorer-copy";
import { categoryIconKey, createCategoryIconElement, type IconCategory } from "./category-icons";
import { markerPresentation } from "./salon-map-markers";
import styles from "./SalonExplorer.module.css";

export type SalonPin = {
  id: string;
  name: string;
  category: IconCategory | null;
  latitude: number;
  longitude: number;
};

type SalonSearchMapProps = {
  salons: SalonPin[];
  activeId: string | null;
  place: MapPoint | null;
  user: MapPoint | null;
  locale: Locale;
  fitResults: boolean;
  onSelect: (id: string) => void;
};

const BELGIUM: [number, number] = [4.35, 50.85];
const motionDuration = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 650;

type SalonMarker = { element: HTMLButtonElement; marker: Marker; stack: number };

function updateMarkerZoom(item: SalonMarker, zoom: number) {
  const { compact, offset } = markerPresentation(zoom, item.stack);
  item.element.dataset.compact = String(compact);
  item.marker.setOffset(offset);
}

function fitPins(map: MapboxMap, salons: SalonPin[], duration: number) {
  if (!salons.length) return;
  const lngs = salons.map((salon) => salon.longitude);
  const lats = salons.map((salon) => salon.latitude);
  const scale = Math.min(1, map.getContainer().clientHeight / 520);
  map.fitBounds(
    [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
    { padding: { top: Math.round(110 * scale), bottom: Math.round(135 * scale), left: 50, right: 50 }, maxZoom: 14, duration },
  );
}

export function SalonSearchMap({
  salons, activeId, place, user, locale, fitResults, onSelect,
}: SalonSearchMapProps) {
  const copy = explorerCopy(locale);
  const frameRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markersRef = useRef(new Map<string, SalonMarker>());
  const fittedRef = useRef(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [retry, setRetry] = useState(0);
  const [moved, setMoved] = useState(false);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
  const select = useEffectEvent((id: string) => onSelect(id));
  const currentActiveId = useEffectEvent(() => activeId);
  const ready = status === "ready";

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || !token) return;
    let cancelled = false;
    let booting = false;
    let map: MapboxMap | null = null;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const markers = markersRef.current;
    fittedRef.current = false;

    const boot = async () => {
      if (cancelled || booting || frame.clientWidth < 40 || frame.clientHeight < 40) return;
      booting = true;
      try {
        const mapboxgl = (await import("mapbox-gl")).default;
        await import("mapbox-gl/dist/mapbox-gl.css");
        if (cancelled) return;
        map = new mapboxgl.Map({
          container: frame,
          accessToken: token,
          style: "mapbox://styles/mapbox/light-v11",
          center: BELGIUM,
          zoom: 7.4,
          minZoom: 3,
          maxZoom: 18,
          attributionControl: false,
          dragRotate: false,
          pitchWithRotate: false,
        });
        map.touchZoomRotate.disableRotation();
        map.addControl(new mapboxgl.AttributionControl({ compact: true }));
        mapRef.current = map;
        timeout = setTimeout(() => {
          if (!cancelled) setStatus("error");
        }, 15_000);
        map.once("load", () => {
          if (cancelled || !map) return;
          clearTimeout(timeout);
          map.resize();
          // Keep streets readable without competing with the salon markers.
          for (const layer of map.getStyle().layers ?? []) {
            if (/poi-label|transit-label/.test(layer.id)) map.setLayoutProperty(layer.id, "visibility", "none");
            if (layer.id === "water" && layer.type === "fill") map.setPaintProperty(layer.id, "fill-color", "#dce6f4");
            if (/landuse/.test(layer.id) && layer.type === "fill") map.setPaintProperty(layer.id, "fill-color", "#e6eddf");
          }
          setStatus("ready");
        });
        map.on("error", (event) => {
          if (!cancelled && "status" in event.error && (event.error.status === 401 || event.error.status === 403)) {
            clearTimeout(timeout);
            setStatus("error");
          }
        });
        map.on("moveend", (event) => {
          if (event.originalEvent) setMoved(true);
        });
        map.on("zoom", () => {
          if (!map) return;
          const zoom = map.getZoom();
          const compact = String(markerPresentation(zoom, 0).compact);
          markers.forEach((item) => {
            if (item.element.dataset.compact !== compact) updateMarkerZoom(item, zoom);
          });
        });
      } catch {
        if (!cancelled) setStatus("error");
      }
    };

    const observer = new ResizeObserver(() => {
      if (map) map.resize();
      else void boot();
    });
    observer.observe(frame);
    void boot();
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      observer.disconnect();
      markers.forEach(({ marker }) => marker.remove());
      markers.clear();
      map?.remove();
      mapRef.current = null;
    };
  }, [token, retry]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    let cancelled = false;
    void import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (cancelled) return;
      const ids = new Set(salons.map((salon) => salon.id));
      markersRef.current.forEach((item, id) => {
        if (!ids.has(id)) {
          item.marker.remove();
          markersRef.current.delete(id);
        }
      });
      const occupied = new Map<string, number>();
      for (const salon of salons) {
        // Only offset genuinely co-located venues, not every salon in a neighbourhood.
        const key = `${salon.longitude.toFixed(4)},${salon.latitude.toFixed(4)}`;
        const stack = occupied.get(key) ?? 0;
        occupied.set(key, stack + 1);
        let item = markersRef.current.get(salon.id);
        if (!item) {
          const element = document.createElement("button");
          element.type = "button";
          element.className = styles.mapMarker;
          element.appendChild(document.createElement("span"));
          element.addEventListener("click", () => select(salon.id));
          const marker = new mapboxgl.Marker({ element, anchor: "center" })
            .setLngLat([salon.longitude, salon.latitude])
            .addTo(map);
          item = { element, marker, stack };
          markersRef.current.set(salon.id, item);
        }
        const icon = categoryIconKey(salon.category?.slug);
        if (item.element.dataset.category !== icon) {
          item.element.firstElementChild!.replaceChildren(createCategoryIconElement(icon));
          item.element.dataset.category = icon;
        }
        const label = salon.category ? `${salon.name} · ${salon.category.name}` : salon.name;
        item.element.setAttribute("aria-label", label);
        item.element.title = label;
        item.element.dataset.active = String(salon.id === currentActiveId());
        item.element.setAttribute("aria-pressed", String(salon.id === currentActiveId()));
        item.stack = stack;
        item.marker.setLngLat([salon.longitude, salon.latitude]);
        updateMarkerZoom(item, map.getZoom());
      }
      if (!place && fitResults) {
        fitPins(map, salons, fittedRef.current ? motionDuration() : 0);
        fittedRef.current = true;
      }
    }).catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, [ready, salons, place, fitResults]);

  useEffect(() => {
    markersRef.current.forEach(({ element }, id) => {
      element.dataset.active = String(id === activeId);
      element.setAttribute("aria-pressed", String(id === activeId));
    });
  }, [activeId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !place) return;
    map.easeTo({ center: [place.lng, place.lat], zoom: 12, duration: motionDuration() });
  }, [ready, place]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    let cancelled = false;
    const markers: Marker[] = [];
    void import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (cancelled) return;
      const samePoint = user && place && Math.abs(user.lng - place.lng) < 0.0004 && Math.abs(user.lat - place.lat) < 0.0004;
      for (const [point, className] of [[user, styles.mapPuck], [samePoint ? null : place, styles.placePuck]] as const) {
        if (!point) continue;
        const element = document.createElement("div");
        element.className = className;
        element.setAttribute("aria-hidden", "true");
        markers.push(new mapboxgl.Marker({ element }).setLngLat([point.lng, point.lat]).addTo(map));
      }
    }).catch(() => undefined);
    return () => {
      cancelled = true;
      markers.forEach((marker) => marker.remove());
    };
  }, [ready, place, user]);

  return (
    <>
      <div ref={frameRef} className={styles.mapCanvas} data-ready={ready} aria-label={copy.mapLabel} />
      {token && status === "loading" ? <div className={styles.mapLoading} role="status"><span><MapPinIcon size={22} strokeWidth={1.5} aria-hidden="true" /></span><p>{copy.mapLoading}</p></div> : null}
      {!token || status === "error" ? (
        <div className={styles.mapError} role="status">
          <MapPinIcon size={30} strokeWidth={1.25} aria-hidden="true" />
          <strong>{copy.mapUnavailable}</strong>
          <p>{copy.mapUnavailableBody}</p>
          {token ? <button type="button" onClick={() => { setStatus("loading"); setMoved(false); setRetry((value) => value + 1); }}>{copy.retry}</button> : null}
        </div>
      ) : null}
      {ready ? (
        <>
          <div className={styles.mapTools}>
            <button type="button" title={copy.fitMap} aria-label={copy.fitMap} onClick={() => { if (mapRef.current) fitPins(mapRef.current, salons, motionDuration()); setMoved(false); }}><MaximizeIcon size={16} aria-hidden="true" /></button>
            <div className={styles.mapZoom}>
              <button type="button" aria-label={copy.zoomIn} onClick={() => { mapRef.current?.zoomIn({ duration: motionDuration() / 2 }); setMoved(true); }}><PlusIcon size={17} aria-hidden="true" /></button>
              <button type="button" aria-label={copy.zoomOut} onClick={() => { mapRef.current?.zoomOut({ duration: motionDuration() / 2 }); setMoved(true); }}><MinusIcon size={17} aria-hidden="true" /></button>
            </div>
          </div>
          {moved ? (
            // Map-area search will be picked up later.
            <button type="button" className={styles.searchArea}>
              <SearchIcon size={14} aria-hidden="true" />
              {copy.searchArea}
            </button>
          ) : null}
        </>
      ) : null}
    </>
  );
}
