import React from 'react';
import { Pressable, StyleSheet, type PressableProps } from 'react-native';

/**
 * For content rendered inside a native Stack.Screen `headerLeft`/`headerRight`
 * slot only. Use native header items for icon buttons on iOS so UIKit sizes
 * their Liquid Glass backgrounds; this component supplies the other platforms'
 * fallback and custom text/loading controls. Deliberately NOT the app's
 * animated `Pressable`. On iOS 26,
 * react-native-screens measures this view to size and center the native
 * header-button capsule (Liquid Glass), and a Reanimated-driven
 * `Animated.View` throws that measurement off, leaving the icon visibly
 * off-center inside the bubble. Native header buttons already get the OS's
 * own press feedback for free, so a plain opacity dip is enough here.
 */
export const HeaderButton = React.forwardRef<React.ComponentRef<typeof Pressable>, PressableProps>(
  function HeaderButton({ style, ...rest }, ref) {
    return (
      <Pressable
        ref={ref}
        accessibilityRole="button"
        accessibilityState={{ disabled: rest.disabled ?? false }}
        style={(state) => [styles.target, typeof style === 'function' ? style(state) : style, state.pressed && { opacity: 0.5 }]}
        {...rest}
      />
    );
  }
);

const styles = StyleSheet.create({
  target: {
    // Square touch target for custom controls. This does not determine the
    // shape of UIKit's surrounding Liquid Glass background.
    width: 44,
    height: 44,
    minWidth: 44,
    minHeight: 44,
    borderRadius: 22,
    padding: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
