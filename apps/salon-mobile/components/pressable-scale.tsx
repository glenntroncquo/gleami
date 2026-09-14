import React from 'react';
import { Pressable as RNPressable, StyleSheet, type GestureResponderEvent, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

// Critically-damped-ish, quick settle — Apple's default UI spring (§4: damping
// ~1.0, response 0.3-0.4s) translated to Reanimated's stiffness/damping/mass API.
const PRESS_SPRING = { damping: 18, mass: 0.3, stiffness: 260 };
const PRESSED_SCALE = 0.97;

/**
 * Drop-in replacement for RN's `Pressable` that gives every press a spring-based
 * scale-down, starting on pointer-down (not release) per apple-design §1.
 * Respects `prefers-reduced-motion` by fading instead of scaling (§14).
 */
export const Pressable = React.forwardRef<React.ComponentRef<typeof RNPressable>, PressableProps>(
  function Pressable({ style, onPressIn, onPressOut, ...rest }, ref) {
    const reduceMotion = useReducedMotion();
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    }));

    const handlePressIn = (event: GestureResponderEvent) => {
      if (reduceMotion) {
        opacity.value = withSpring(0.6, PRESS_SPRING);
      } else {
        scale.value = withSpring(PRESSED_SCALE, PRESS_SPRING);
      }
      onPressIn?.(event);
    };

    const handlePressOut = (event: GestureResponderEvent) => {
      if (reduceMotion) {
        opacity.value = withSpring(1, PRESS_SPRING);
      } else {
        scale.value = withSpring(1, PRESS_SPRING);
      }
      onPressOut?.(event);
    };

    // This app never uses the function form of `style` (verified across the
    // codebase) — press-state styling is handled by the spring animation
    // instead. Evaluate defensively so a future usage doesn't crash.
    const resolvedStyle = typeof style === 'function' ? style({ pressed: false } as Parameters<typeof style>[0]) : style;

    return (
      <AnimatedPressable
        ref={ref}
        accessibilityRole="button"
        accessibilityState={{ disabled: rest.disabled ?? false }}
        style={[styles.target, resolvedStyle, animatedStyle]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        {...rest}
      />
    );
  }
);

const styles = StyleSheet.create({ target: { minWidth: 44, minHeight: 44, justifyContent: 'center' } });
