import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { t } from '@/src/i18n';

type MediaCarouselProps = {
  images: string[];
  height?: number;
  label: string;
  onPress?: () => void;
};

/** How far a drag must travel, as a fraction of the card width, to change photo. */
const PAGE_FRACTION = 0.18;

export function MediaCarousel({ images, height = 210, label, onPress }: MediaCarouselProps) {
  const frames = images.filter((uri) => uri.length > 0);
  if (frames.length === 0) {
    return <View style={{ height }} className="bg-surface" accessibilityLabel={label} />;
  }

  const track =
    Platform.OS === 'web' ? (
      <WebCarouselTrack frames={frames} height={height} label={label} onPress={onPress} />
    ) : (
      <NativeCarouselTrack frames={frames} height={height} label={label} onPress={onPress} />
    );

  return <View key={frames.join('\n')}>{track}</View>;
}

function Dots({ frames, page }: { frames: string[]; page: number }) {
  if (frames.length < 2) return null;
  return (
    <View
      className="absolute bottom-3 left-0 right-0 items-center"
      style={{ pointerEvents: 'none' }}
      accessibilityElementsHidden
      importantForAccessibility="no">
      <View className="flex-row items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1.5">
        {frames.map((uri, dot) => (
          <View
            key={`${dot}:${uri}`}
            className={dot === page ? 'h-1.5 w-4 rounded-full bg-white' : 'h-1.5 w-1.5 rounded-full bg-white/80'}
          />
        ))}
      </View>
    </View>
  );
}

function captionFor(label: string, page: number, total: number): string {
  if (total < 2) return label;
  return t('discover.photoLabel', { name: label, index: page + 1, total });
}

type DragOrigin = { id: number; x: number; y: number; active: boolean };

function domNode(node: View | null): HTMLElement | null {
  if (node && typeof (node as unknown as HTMLElement).addEventListener === 'function') {
    return node as unknown as HTMLElement;
  }
  return null;
}

function WebCarouselTrack({
  frames,
  height,
  label,
  onPress,
}: {
  frames: string[];
  height: number;
  label: string;
  onPress?: () => void;
}) {
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const pageRef = useRef(0);
  const widthRef = useRef(0);
  const hostRef = useRef<HTMLElement | null>(null);
  const [translate] = useState(() => new Animated.Value(0));
  const count = frames.length;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const blockDrag = (event: Event) => event.preventDefault();
    host.addEventListener('dragstart', blockDrag);

    const settle = (dx: number) => {
      const cardWidth = widthRef.current;
      const from = pageRef.current;
      if (cardWidth <= 0) return;
      let next = from;
      if (dx <= -cardWidth * PAGE_FRACTION) next = Math.min(count - 1, from + 1);
      else if (dx >= cardWidth * PAGE_FRACTION) next = Math.max(0, from - 1);
      pageRef.current = next;
      setPage(next);
      Animated.timing(translate, {
        toValue: -next * cardWidth,
        duration: 220,
        useNativeDriver: true,
      }).start();
    };

    const onDown = (event: PointerEvent) => {
      if (count < 2) {
        const startX = event.clientX;
        const startY = event.clientY;
        const onUp = (up: PointerEvent) => {
          window.removeEventListener('pointerup', onUp, true);
          if (Math.abs(up.clientX - startX) < 8 && Math.abs(up.clientY - startY) < 8) onPress?.();
        };
        window.addEventListener('pointerup', onUp, true);
        return;
      }
      event.preventDefault();
      const origin: DragOrigin = { id: event.pointerId, x: event.clientX, y: event.clientY, active: false };
      const onMove = (move: PointerEvent) => {
        if (move.pointerId !== origin.id) return;
        const dx = move.clientX - origin.x;
        const dy = move.clientY - origin.y;
        if (!origin.active) {
          if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
          if (Math.abs(dx) <= Math.abs(dy)) return;
          origin.active = true;
        }
        const cardWidth = widthRef.current;
        const current = pageRef.current;
        if (cardWidth <= 0) return;
        const maxDrag = current * cardWidth;
        const minDrag = -((count - 1 - current) * cardWidth);
        const drag = Math.min(maxDrag, Math.max(minDrag, dx));
        translate.setValue(-current * cardWidth + drag);
      };
      const onUp = (up: PointerEvent) => {
        if (up.pointerId !== origin.id) return;
        window.removeEventListener('pointermove', onMove, true);
        window.removeEventListener('pointerup', onUp, true);
        const dx = up.clientX - origin.x;
        const dy = up.clientY - origin.y;
        if (origin.active) settle(dx);
        else if (Math.abs(dx) < 8 && Math.abs(dy) < 8) onPress?.();
      };
      window.addEventListener('pointermove', onMove, true);
      window.addEventListener('pointerup', onUp, true);
    };

    host.addEventListener('pointerdown', onDown, true);
    return () => {
      host.removeEventListener('pointerdown', onDown, true);
      host.removeEventListener('dragstart', blockDrag);
    };
  }, [count, onPress, translate]);

  return (
    <View
      ref={(node) => {
        hostRef.current = domNode(node);
      }}
      onLayout={(event) => {
        const next = event.nativeEvent.layout.width;
        if (next <= 0 || next === widthRef.current) return;
        widthRef.current = next;
        translate.setValue(-pageRef.current * next);
        setWidth(next);
      }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={captionFor(label, page, count)}
      accessibilityHint={count > 1 ? t('discover.photoHint') : undefined}
      accessibilityLiveRegion="polite"
      style={{ height, overflow: 'hidden', touchAction: 'none' }}>
      {width > 0 ? (
        <Animated.View style={{ flexDirection: 'row', width: width * count, height, transform: [{ translateX: translate }] }}>
          {frames.map((uri, frameIndex) => (
            <Image
              key={`${frameIndex}:${uri}`}
              source={{ uri }}
              style={{ width, height }}
              contentFit="cover"
              accessibilityIgnoresInvertColors
            />
          ))}
        </Animated.View>
      ) : null}
      <Dots frames={frames} page={page} />
    </View>
  );
}

function NativeCarouselTrack({
  frames,
  height,
  label,
  onPress,
}: {
  frames: string[];
  height: number;
  label: string;
  onPress?: () => void;
}) {
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const drag = useSharedValue(0);
  const pageIndex = useSharedValue(0);
  const widthSv = useSharedValue(0);
  const countSv = useSharedValue(frames.length);
  const count = frames.length;

  const pan = Gesture.Pan()
    .enabled(count > 1)
    .activeOffsetX([-14, 14])
    .failOffsetY([-18, 18])
    .onUpdate((event) => {
      const cardWidth = widthSv.value;
      const total = countSv.value;
      const current = pageIndex.value;
      if (cardWidth <= 0 || total < 2) return;
      const maxDrag = current * cardWidth;
      const minDrag = -((total - 1 - current) * cardWidth);
      drag.value = Math.min(maxDrag, Math.max(minDrag, event.translationX));
    })
    .onEnd((event) => {
      const cardWidth = widthSv.value;
      const total = countSv.value;
      if (cardWidth <= 0 || total < 2) {
        drag.value = withTiming(0, { duration: 180 });
        return;
      }
      const projected = event.translationX + event.velocityX * 0.15;
      const from = pageIndex.value;
      let next = from;
      if (projected <= -cardWidth * PAGE_FRACTION) next = Math.min(total - 1, from + 1);
      else if (projected >= cardWidth * PAGE_FRACTION) next = Math.max(0, from - 1);
      pageIndex.value = next;
      drag.value = drag.value + (next - from) * cardWidth;
      drag.value = withTiming(0, { duration: 220 });
      runOnJS(setPage)(next);
    });

  const tap = Gesture.Tap()
    .maxDistance(12)
    .enabled(Boolean(onPress))
    .onEnd(() => {
      if (onPress) runOnJS(onPress)();
    });

  const slide = useAnimatedStyle(() => ({
    transform: [{ translateX: -pageIndex.value * widthSv.value + drag.value }],
  }));

  return (
    <View
      onLayout={(event) => {
        const next = event.nativeEvent.layout.width;
        if (next <= 0 || next === width) return;
        widthSv.value = next;
        setWidth(next);
      }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={captionFor(label, page, count)}
      accessibilityHint={count > 1 ? t('discover.photoHint') : undefined}
      accessibilityLiveRegion="polite"
      style={{ height, overflow: 'hidden' }}>
      {width > 0 ? (
        <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
          <Reanimated.View style={[{ flexDirection: 'row', width: width * count, height }, slide]}>
            {frames.map((uri, frameIndex) => (
              <Image
                key={`${frameIndex}:${uri}`}
                source={{ uri }}
                style={{ width, height }}
                contentFit="cover"
                accessibilityIgnoresInvertColors
              />
            ))}
          </Reanimated.View>
        </GestureDetector>
      ) : null}
      <Dots frames={frames} page={page} />
    </View>
  );
}
