"use client";

import { useState } from "react";

type SalonMapProps = {
  latitude: number | null;
  longitude: number | null;
  label: string;
  directionsUrl: string;
  token: string | null;
};

function mapImageUrl(latitude: number, longitude: number, token: string): string {
  const center = `${longitude},${latitude},15,0`;
  return `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/${center}/800x360@2x?access_token=${encodeURIComponent(token)}`;
}

export function SalonMap({
  latitude,
  longitude,
  label,
  directionsUrl,
  token,
}: SalonMapProps) {
  const [failed, setFailed] = useState(false);
  const src =
    token && latitude != null && longitude != null && !failed
      ? mapImageUrl(latitude, longitude, token)
      : null;

  return (
    <div className="relative mt-5 h-56 overflow-hidden rounded-[22px] bg-[#e7eef2] ring-1 ring-line">
      {src ? (
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="map-grid absolute inset-0" />
      )}
      <a
        href={directionsUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        className="absolute inset-0"
      >
        <span className="pointer-events-none absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink ring-[3px] ring-white shadow-soft" />
      </a>
      {src ? (
        <p className="absolute bottom-2 right-2 z-10 rounded bg-white/85 px-1.5 py-0.5 text-[10px] leading-none text-ink/70">
          <a
            href="https://www.mapbox.com/about/maps/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-ink"
          >
            © Mapbox
          </a>
          {" · "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-ink"
          >
            © OpenStreetMap
          </a>
        </p>
      ) : null}
    </div>
  );
}
