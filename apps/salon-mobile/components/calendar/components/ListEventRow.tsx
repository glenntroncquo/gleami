import { Pressable } from '@/components/pressable-scale';
import React from 'react';
import { Text, View } from 'react-native';

import { getInitialsFromLabel } from '@/lib/text';

import { createStyles } from '../styles';
import { EventItem } from '../types';

type Props = {
  event: EventItem;
  onPress?: (event: EventItem) => void;
  styles: ReturnType<typeof createStyles>;
};

export const ListEventRow = React.memo(function ListEventRow({ event, onPress, styles }: Props) {
  return (
    <Pressable style={styles.listEventRow} onPress={() => onPress?.(event)}>
      <View style={styles.listEventTimeCol}>
        <Text style={styles.listEventTime}>{event.startTime}</Text>
        <Text style={styles.listEventTimeMuted}>{event.endTime}</Text>
      </View>
      <View style={[styles.listEventBar, { backgroundColor: event.color }]} />
      <View style={styles.listEventTextCol}>
        <Text style={styles.listEventTitle} numberOfLines={1}>
          {event.label}
        </Text>
        <Text style={styles.listEventSubtitle} numberOfLines={1}>
          {event.clientName}
        </Text>
      </View>
      <View style={styles.listEventAvatar}>
        <Text style={styles.listEventAvatarText}>{getInitialsFromLabel(event.staffName)}</Text>
      </View>
    </Pressable>
  );
});
