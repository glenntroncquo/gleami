import { GlassPill } from '@/src/components/glass';
import type { SearchItem } from '@/src/api/types';
import { mapboxToken } from '@/src/config';
import { bboxAround } from '@/src/lib/geo';
import { t } from '@/src/i18n';
import { useDiscovery } from '@/src/store/discovery';
import React, { useCallback, useRef, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

type MapPlaceholderProps = {
  items: SearchItem[];
  reason: 'token' | 'web';
};

export function MapPlaceholder({ items, reason }: MapPlaceholderProps) {
  const center = useDiscovery((state) => state.center);
  const userLocation = useDiscovery((state) => state.userLocation);
  const showAreaSearch = useDiscovery((state) => state.showAreaSearch);
  const [pan, setPan] = useState({
    dLat: 0,
    dLng: 0,
    originLat: center.lat,
    originLng: center.lng,
  });
  const resetPan = pan.originLat !== center.lat || pan.originLng !== center.lng;
  const activePan = resetPan
    ? { dLat: 0, dLng: 0, originLat: center.lat, originLng: center.lng }
    : pan;
  if (resetPan) setPan(activePan);
  const view = { lat: center.lat + activePan.dLat, lng: center.lng + activePan.dLng };
  const [size, setSize] = useState({ width: 1, height: 1 });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queueSearch = useCallback(
    (next: { lat: number; lng: number }) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => showAreaSearch(bboxAround(next, 12)), 250);
    },
    [showAreaSearch],
  );

  const applyPan = useCallback(
    (dx: number, dy: number) => {
      setPan((current) => {
        const base =
          current.originLat === center.lat && current.originLng === center.lng
            ? current
            : { dLat: 0, dLng: 0, originLat: center.lat, originLng: center.lng };
        const next = {
          ...base,
          dLat: base.dLat - dy / 14000,
          dLng: base.dLng + dx / 14000,
        };
        queueSearch({ lat: center.lat + next.dLat, lng: center.lng + next.dLng });
        return next;
      });
    },
    [center.lat, center.lng, queueSearch],
  );

  const drag = Gesture.Pan().onEnd((event) => {
    runOnJS(applyPan)(event.translationX, event.translationY);
  });

  const hint = reason === 'web' || (Platform.OS === 'web' && !mapboxToken) ? t('discover.mapWebHint') : t('discover.mapTokenHint');
  const title = userLocation ? t('discover.yourLocation') : t('discover.defaultCity');

  return (
    <GestureDetector gesture={drag}>
      <View
        className="flex-1 bg-[#e7efe8]"
        onLayout={(event) =>
          setSize({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })
        }
        accessibilityLabel={t('discover.mapUnavailable')}>
        <View className="absolute inset-0 opacity-70">
          {Array.from({ length: 6 }).map((_, index) => (
            <View
              key={`h-${index}`}
              className="absolute left-0 right-0 border-t border-white/70"
              style={{ top: (index + 1) * (size.height / 7) }}
            />
          ))}
          {Array.from({ length: 5 }).map((_, index) => (
            <View
              key={`v-${index}`}
              className="absolute bottom-0 top-0 border-l border-white/70"
              style={{ left: (index + 1) * (size.width / 6) }}
            />
          ))}
        </View>
        {items.map((item) => {
          const x = size.width / 2 + (item.lng - view.lng) * 4200;
          const y = size.height / 2 - (item.lat - view.lat) * 4200;
          if (x < 8 || y < 8 || x > size.width - 8 || y > size.height - 8) return null;
          return (
            <View
              key={item.locationId}
              accessibilityLabel={item.name}
              className="absolute h-3.5 w-3.5 rounded-full border-2 border-white bg-ink"
              style={{ left: x - 7, top: y - 7 }}
            />
          );
        })}
        <View className="flex-1 items-center justify-center px-8" pointerEvents="none">
          <GlassPill>
            <Text className="text-center text-sm font-semibold text-ink">{title}</Text>
            <Text className="mt-1 text-center text-xs leading-4 text-muted">{t('discover.mapUnavailable')}</Text>
            <Text className="mt-1 text-center text-xs leading-4 text-muted">{hint}</Text>
            <Text className="mt-2 text-center text-xs text-muted">{t('discover.mapDragHint')}</Text>
          </GlassPill>
        </View>
      </View>
    </GestureDetector>
  );
}
