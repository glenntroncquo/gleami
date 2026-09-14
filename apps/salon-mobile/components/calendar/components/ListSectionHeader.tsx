import React from 'react';
import { Text, View } from 'react-native';

import { createStyles } from '../styles';

type Props = {
  title: string;
  isToday: boolean;
  styles: ReturnType<typeof createStyles>;
};

export const ListSectionHeader = React.memo(function ListSectionHeader({ title, isToday, styles }: Props) {
  return (
    <View style={styles.listStickyHeader}>
      <Text style={styles.listStickyTitle}>{title}</Text>
      {isToday ? <Text style={styles.listStickyToday}>Today</Text> : null}
    </View>
  );
});
