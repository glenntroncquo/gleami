import { brandColors } from '@/src/theme/colors';
import Mapbox from '@rnmapbox/maps';
import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';

import type { SearchItem } from '@/src/api/types';
import { mapboxToken } from '@/src/config';
import { MapPlaceholder } from '@/src/components/map-placeholder';
import { useDiscovery } from '@/src/store/discovery';

const ACCENT = brandColors.navy;

if (mapboxToken) {
  void Mapbox.setAccessToken(mapboxToken);
}

export function DiscoverMap({ items, selectedSlug, onSelect }: { items: SearchItem[]; selectedSlug: string | null; onSelect: (slug: string | null) => void }) {
  const center = useDiscovery((state) => state.center);
  const showAreaSearch = useDiscovery((state) => state.showAreaSearch);
  const cameraRef = useRef<React.ComponentRef<typeof Mapbox.Camera>>(null);
  const moved = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ignoreMapPress = useRef(false);

  useEffect(() => {
    cameraRef.current?.setCamera({
      centerCoordinate: [center.lng, center.lat],
      zoomLevel: 12,
      animationDuration: 400,
    });
  }, [center.lat, center.lng]);

  useEffect(() => {
    if (selectedSlug && !items.some((item) => item.slug === selectedSlug)) {
      onSelect(null);
    }
  }, [items, onSelect, selectedSlug]);

  const shape = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: items.map((item) => ({
        type: 'Feature',
        properties: {
          slug: item.slug,
          name: item.name,
          selected: item.slug === selectedSlug ? 1 : 0,
        },
        geometry: { type: 'Point', coordinates: [item.lng, item.lat] },
      })),
    }),
    [items, selectedSlug],
  );

  if (!mapboxToken) {
    return <MapPlaceholder items={items} reason="token" selectedSlug={selectedSlug} onSelect={onSelect} />;
  }

  return (
      <Mapbox.MapView
        style={StyleSheet.absoluteFill}
        styleURL={Mapbox.StyleURL.Light}
        logoEnabled
        attributionEnabled
        scaleBarEnabled={false}
        onPress={() => {
          if (ignoreMapPress.current) {
            ignoreMapPress.current = false;
            return;
          }
          onSelect(null);
        }}
        onCameraChanged={(state) => {
          if (state.gestures.isGestureActive) moved.current = true;
        }}
        onMapIdle={(state) => {
          if (!moved.current) return;
          moved.current = false;
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            const { ne, sw } = state.properties.bounds;
            showAreaSearch({
              minLng: sw[0],
              minLat: sw[1],
              maxLng: ne[0],
              maxLat: ne[1],
            });
          }, 250);
        }}>
        <Mapbox.Camera
          ref={cameraRef}
          defaultSettings={{ centerCoordinate: [center.lng, center.lat], zoomLevel: 12 }}
        />
        <Mapbox.ShapeSource
          id="marketplace-salons"
          shape={shape}
          cluster
          clusterRadius={48}
          clusterMaxZoomLevel={14}
          hitbox={{ width: 120, height: 64 }}
          onPress={(event) => {
            const feature = event.features[0];
            const slug = feature?.properties?.slug;
            const clustered = feature?.properties?.point_count != null;
            if (typeof slug !== 'string' || clustered) return;
            ignoreMapPress.current = true;
            setTimeout(() => {
              ignoreMapPress.current = false;
            }, 0);
            onSelect(slug);
          }}>
          <Mapbox.CircleLayer
            id="salon-clusters"
            filter={['has', 'point_count']}
            style={{ circleColor: ACCENT, circleRadius: 18, circleOpacity: 0.92 }}
          />
          <Mapbox.SymbolLayer
            id="salon-cluster-count"
            filter={['has', 'point_count']}
            style={{
              textField: ['get', 'point_count_abbreviated'],
              textSize: 12,
              textColor: '#ffffff',
            }}
          />
          <Mapbox.CircleLayer
            id="salon-pins"
            filter={['!', ['has', 'point_count']]}
            style={{
              circleColor: ACCENT,
              circleRadius: ['case', ['==', ['get', 'selected'], 1], 8, 6],
              circleStrokeWidth: ['case', ['==', ['get', 'selected'], 1], 3, 2],
              circleStrokeColor: '#ffffff',
            }}
          />
          <Mapbox.SymbolLayer
            id="salon-names"
            filter={['all', ['!', ['has', 'point_count']], ['!=', ['get', 'selected'], 1]]}
            style={{
              textField: ['get', 'name'],
              textSize: 12,
              textColor: ACCENT,
              textHaloColor: '#ffffff',
              textHaloWidth: 1.4,
              textAnchor: 'bottom',
              textOffset: [0, -0.7],
              textMaxWidth: 9,
              textAllowOverlap: true,
              textPadding: 1,
            }}
          />
          <Mapbox.SymbolLayer
            id="salon-name-selected"
            filter={['all', ['!', ['has', 'point_count']], ['==', ['get', 'selected'], 1]]}
            style={{
              textField: ['get', 'name'],
              textSize: 13,
              textColor: ACCENT,
              textHaloColor: '#ffffff',
              textHaloWidth: 1.6,
              textAnchor: 'bottom',
              textOffset: [0, -0.85],
              textMaxWidth: 10,
              textAllowOverlap: true,
            }}
          />
        </Mapbox.ShapeSource>
      </Mapbox.MapView>
  );
}
