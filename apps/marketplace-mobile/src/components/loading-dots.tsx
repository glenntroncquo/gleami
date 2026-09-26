import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const DIM = 0.35;
const RISE = 280;
const FALL = 280;
const STAGGER = 160;
/** Every dot runs the same cycle length so the stagger stays in phase forever. */
const REST = STAGGER * 2 + 120;

type LoadingDotsProps = {
  color?: string;
  /** Dot diameter; the gap scales with it. */
  size?: number;
};

/** Pulsing three-dot loader shown in place of a button label while it's busy. */
export function LoadingDots({ color = '#ffffff', size = 8 }: LoadingDotsProps) {
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.75 }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {[0, 1, 2].map((index) => (
        <Dot key={index} index={index} color={color} size={size} />
      ))}
    </View>
  );
}

function Dot({ index, color, size }: { index: number; color: string; size: number }) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(DIM);

  useEffect(() => {
    if (reduceMotion) {
      progress.value = index === 1 ? 1 : DIM;
      return;
    }
    const easing = Easing.inOut(Easing.quad);
    progress.value = DIM;
    progress.value = withDelay(
      index * STAGGER,
      withRepeat(
        withSequence(
          withTiming(1, { duration: RISE, easing }),
          withTiming(DIM, { duration: FALL, easing }),
          withTiming(DIM, { duration: REST }),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(progress);
  }, [index, progress, reduceMotion]);

  const animated = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.8 + 0.2 * ((progress.value - DIM) / (1 - DIM)) }],
  }));

  return (
    <Animated.View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }, animated]} />
  );
}
