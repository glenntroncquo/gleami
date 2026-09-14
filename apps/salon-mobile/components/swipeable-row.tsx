import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppIcon, type AppIconName } from '@/components/app-icon';

const ACTION_WIDTH = 76;
let openRow: SwipeableMethods | null = null;

type Props = {
  children: React.ReactNode;
  onDelete: () => void;
  deleteLabel: string;
};

function RowAction({ translation, onPress, label, icon, destructive }: {
  icon: AppIconName;
  destructive: boolean;
  translation: SharedValue<number>;
  onPress: () => void;
  label: string;
}) {
  const theme = Colors[useColorScheme() ?? 'light'];
  // Slide the action in with the row, without exposing a full-width red tray.
  const revealStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, -translation.value / ACTION_WIDTH)),
    transform: [{ translateX: Math.max(0, ACTION_WIDTH + translation.value) }],
  }));

  return (
    <Animated.View style={[styles.actionContainer, revealStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [styles.deleteAction, { backgroundColor: destructive ? theme.destructive : theme.tint }, pressed && styles.pressed]}
        onPress={onPress}>
        <AppIcon name={icon} size={23} color={destructive ? theme.onDestructive : theme.onTint} />
      </Pressable>
    </Animated.View>
  );
}

/** UI-thread swipe-to-reveal. Deletion requires tapping the revealed action. */
export function SwipeableRow({ children, onDelete, deleteLabel }: Props) {
  return <SwipeActionRow onAction={onDelete} actionLabel={deleteLabel} icon="delete" destructive>{children}</SwipeActionRow>;
}

export function SwipeActionRow({ children, onAction, actionLabel, icon, destructive = false, onPress }: {
  children: React.ReactNode;
  onAction: () => void;
  actionLabel: string;
  icon: AppIconName;
  destructive?: boolean;
  onPress?: () => void;
}) {
  const swipeableRef = React.useRef<SwipeableMethods>(null);
  // Resolve tap vs. pan in the gesture system, not competing RN responders.
  // Even a short drag must fail the tap before the swipe activates.
  const tapGesture = Gesture.Tap()
    .enabled(Boolean(onPress))
    .maxDistance(8)
    .runOnJS(true)
    .onEnd((_, success) => {
      if (success) onPress?.();
    });

  React.useEffect(() => {
    const row = swipeableRef.current;
    return () => {
      if (openRow === row) openRow = null;
    };
  }, []);

  const reveal = () => {
    if (openRow !== swipeableRef.current) openRow?.close();
    openRow = swipeableRef.current;
  };
  const handleDelete = () => {
    swipeableRef.current?.close();
    onAction();
  };

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      friction={1.25}
      animationOptions={{ stiffness: 240, damping: 32, mass: 1, overshootClamping: true }}
      rightThreshold={32}
      dragOffsetFromRightEdge={16}
      overshootLeft={false}
      overshootRight
      overshootFriction={10}
      onSwipeableOpenStartDrag={reveal}
      onSwipeableWillOpen={reveal}
      onSwipeableClose={() => {
        if (openRow === swipeableRef.current) openRow = null;
      }}
      renderRightActions={(_, translation) => (
        <RowAction translation={translation} label={actionLabel} icon={icon} destructive={destructive} onPress={handleDelete} />
      )}>
      <GestureDetector gesture={tapGesture}>
      <View
        collapsable={false}
        accessible
        accessibilityRole={onPress ? 'button' : undefined}
        onAccessibilityTap={onPress}
        accessibilityActions={[...(onPress ? [{ name: 'activate' as const }] : []), { name: 'rowAction', label: actionLabel }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'rowAction') handleDelete();
          if (event.nativeEvent.actionName === 'activate') onPress?.();
        }}
        style={styles.content}>
        {children}
      </View>
      </GestureDetector>
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  content: { minHeight: 56 },
  actionContainer: {
    width: ACTION_WIDTH,
    paddingLeft: 10,
    paddingVertical: 5,
    justifyContent: 'center',
  },
  deleteAction: {
    minHeight: 44,
    maxHeight: 64,
    flex: 1,
    borderRadius: 18,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
});
