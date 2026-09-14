import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { EventPhase } from '@/components/calendar/types';

type Props = {
  phases: EventPhase[];
  color: string;
  bgColor: string;
  height: number;
  width?: number;
  direction?: 'vertical' | 'horizontal';
};

/**
 * Scales busy+free phases onto the visit header. Buffer is occupancy lock
 * and is never drawn as client duration.
 */
export function VisitPhaseBar({
  phases,
  color,
  bgColor,
  height,
  width = 4,
  direction = 'vertical',
}: Props) {
  const visible = phases.filter((phase) => phase.phase_type === 'busy' || phase.phase_type === 'free');
  const isRow = direction === 'horizontal';

  if (visible.length === 0) {
    return <View style={{ width: isRow ? '100%' : width, height, backgroundColor: color, borderRadius: 2 }} />;
  }

  return (
    <View
      style={[
        styles.stack,
        isRow ? styles.row : styles.column,
        { width: isRow ? '100%' : width, height, borderRadius: 2 },
      ]}>
      {visible.map((phase) => (
        <View
          key={phase.id}
          style={{
            flexGrow: Math.max(phase.minutes, 1),
            flexShrink: 1,
            flexBasis: 0,
            backgroundColor: phase.phase_type === 'busy' ? color : bgColor,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    overflow: 'hidden',
  },
  column: {
    flexDirection: 'column',
  },
  row: {
    flexDirection: 'row',
  },
});
