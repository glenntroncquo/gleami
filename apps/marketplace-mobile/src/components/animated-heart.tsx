import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { brandColors } from '@/src/theme/colors';

/** Animates state changes only: mounting an already-saved salon stays quiet. */
export function AnimatedHeart({ liked, size = 20 }: { liked: boolean; size?: number }) {
  const previous = useRef(liked);
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const halo = useSharedValue(1);
  useEffect(() => {
    if (previous.current === liked) return;
    previous.current = liked;
    if (reducedMotion) return;
    scale.value = withSequence(
      withTiming(liked ? 0.8 : 0.9, { duration: 65 }),
      withSpring(liked ? 1.22 : 1, { damping: 14, stiffness: 420 }),
      withSpring(1, { damping: 18, stiffness: 300 }),
    );
    halo.value = liked ? 0 : 1;
    if (liked) halo.value = withTiming(1, { duration: 420 });
  }, [liked, reducedMotion, scale, halo]);
  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const haloStyle = useAnimatedStyle(() => ({ opacity: (1 - halo.value) * 0.45, transform: [{ scale: 0.6 + halo.value * 0.9 }] }));
  return <View pointerEvents="none" accessible={false} style={{ width: size + 8, height: size + 8, alignItems: 'center', justifyContent: 'center' }}>
    <Animated.View style={[{ position: 'absolute', width: size + 6, height: size + 6, borderRadius: 99, borderWidth: 1.5, borderColor: '#E65A76' }, haloStyle]} />
    <Animated.View style={heartStyle}><Ionicons name={liked ? 'heart' : 'heart-outline'} size={size} color={liked ? '#E34D6F' : brandColors.navy} /></Animated.View>
  </View>;
}
