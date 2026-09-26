import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** How far the fade reaches below the status bar. */
const FADE = 36;
/** White opacity at the very top of the screen. */
const TOP_ALPHA = 0.7;

/**
 * Translucent status-bar area for screens whose content scrolls underneath it.
 * A single eased gradient (no blur layer) so there is never a visible edge.
 */
export function TopFade() {
  const { top } = useSafeAreaInsets();
  if (!top) return null;
  const height = top + FADE;
  const stop = (offset: number, alpha: number) =>
    `rgba(255,255,255,${(TOP_ALPHA * alpha).toFixed(3)}) ${((offset / height) * 100).toFixed(1)}%`;
  const gradient = [
    stop(0, 1),
    stop(top * 0.6, 0.85),
    stop(top, 0.6),
    stop(top + FADE * 0.35, 0.3),
    stop(top + FADE * 0.7, 0.1),
    stop(height, 0),
  ].join(', ');
  return (
    <View pointerEvents="none" style={[styles.wrap, { height }]}>
      <View style={[StyleSheet.absoluteFill, { experimental_backgroundImage: `linear-gradient(to bottom, ${gradient})` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
});
