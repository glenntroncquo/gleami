import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import React from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const DISTANCE_THRESHOLD = 60;
const VELOCITY_THRESHOLD = 500;

type Props = {
  children: React.ReactNode;
  /** Route to switch to on a leftward swipe (finger moves left → next tab), or undefined at the last tab. */
  next?: Href;
  /** Route to switch to on a rightward swipe (finger moves right → previous tab), or undefined at the first tab. */
  prev?: Href;
};

/**
 * Instagram-style swipe-between-tabs: a clear horizontal swipe past a
 * distance/velocity threshold switches to the adjacent tab. Yields
 * immediately to vertical scrolling (lists/calendars own that axis), so it
 * only ever fires on a deliberately horizontal gesture.
 */
export function TabSwipeArea({ children, next, prev }: Props) {
  const router = useRouter();

  const gesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15])
    .onEnd((event) => {
      const swipedLeft = event.translationX < -DISTANCE_THRESHOLD || event.velocityX < -VELOCITY_THRESHOLD;
      const swipedRight = event.translationX > DISTANCE_THRESHOLD || event.velocityX > VELOCITY_THRESHOLD;

      if (swipedLeft && next) {
        router.navigate(next);
      } else if (swipedRight && prev) {
        router.navigate(prev);
      }
    })
    .runOnJS(true);

  return <GestureDetector gesture={gesture}>{children}</GestureDetector>;
}
