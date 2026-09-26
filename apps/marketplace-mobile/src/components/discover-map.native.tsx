import { brandColors } from '@/src/theme/colors';
import Mapbox from '@rnmapbox/maps';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';

import type { SearchItem } from '@/src/api/types';
import { mapboxToken } from '@/src/config';
import { MapPlaceholder } from '@/src/components/map-placeholder';
import { useDiscovery } from '@/src/store/discovery';

const ACCENT = brandColors.navy;

if (mapboxToken) {
  void Mapbox.setAccessToken(mapboxToken);
}

export function DiscoverMap({ items }: { items: SearchItem[] }) {
  const center = useDiscovery((state) => state.center);
  const showAreaSearch = useDiscovery((state) => state.showAreaSearch);
  const cameraRef = useRef<React.ComponentRef<typeof Mapbox.Camera>>(null);
  const moved = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    cameraRef.current?.setCamera({
      centerCoordinate: [center.lng, center.lat],
      zoomLevel: 12,
      animationDuration: 400,
    });
  }, [center.lat, center.lng]);

  if (!mapboxToken) {
    return <MapPlaceholder items={items} reason="token" />;
  }

  const shape: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: items.map((item) => ({
      type: 'Feature',
      properties: { slug: item.slug, name: item.name },
      geometry: { type: 'Point', coordinates: [item.lng, item.lat] },
    })),
  };

  return (
    <Mapbox.MapView
      style={StyleSheet.absoluteFill}
      styleURL={Mapbox.StyleURL.Light}
      logoEnabled
      attributionEnabled
      scaleBarEnabled={false}
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
        onPress={(event) => {
          const feature = event.features[0];
          const slug = feature?.properties?.slug;
          const clustered = feature?.properties?.point_count != null;
          if (typeof slug === 'string' && !clustered) {
            router.push({ pathname: '/salon/[slug]', params: { slug } });
          }
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
            circleColor: '#071D43',
            circleRadius: 7,
            circleStrokeWidth: 2,
            circleStrokeColor: '#ffffff',
          }}
        />
      </Mapbox.ShapeSource>
    </Mapbox.MapView>
  );
}
