import React from 'react';
import { View } from 'react-native';

import { SkeletonBlock } from '@/components/skeleton-block';
import { createStyles } from '../styles';

type ThemeStyles = ReturnType<typeof createStyles>;

export function MonthGridSkeleton({ styles }: { styles: ThemeStyles }) {
  return (
    <View style={styles.monthGrid}>
      {Array.from({ length: 5 }, (_, week) => (
        <View key={week} style={styles.weekRow}>
          {Array.from({ length: 7 }, (__, day) => (
            <View key={day} style={styles.dayCell}>
              <View style={styles.dayHeader}>
                <SkeletonBlock style={styles.skeletonDayNumber} />
              </View>
              <View style={styles.eventStack}>
                {day % 3 !== 0 ? <SkeletonBlock style={styles.skeletonEventPill} /> : null}
                {day % 4 === 0 ? <SkeletonBlock style={styles.skeletonEventPillShort} /> : null}
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export function WeekAgendaSkeleton({
  styles,
  rowHeight,
}: {
  styles: ThemeStyles;
  rowHeight: number;
}) {
  return (
    <View style={styles.weekAgendaPage}>
      {Array.from({ length: 7 }, (_, index) => (
        <View key={index} style={[styles.weekAgendaDay, { height: rowHeight }]}>
          <View style={styles.weekAgendaDateCol}>
            <SkeletonBlock style={styles.skeletonWeekDate} />
            <SkeletonBlock style={styles.skeletonWeekWeekday} />
          </View>
          <View style={styles.weekAgendaEvents}>
            <SkeletonBlock style={styles.skeletonWeekEvent} />
            {index % 2 === 0 ? <SkeletonBlock style={styles.skeletonWeekEvent} /> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

export function ListAgendaSkeleton({ styles }: { styles: ThemeStyles }) {
  return (
    <View>
      {Array.from({ length: 4 }, (_, section) => (
        <View key={section}>
          <View style={styles.listStickyHeader}>
            <SkeletonBlock style={styles.skeletonListHeader} />
          </View>
          {Array.from({ length: 2 + (section % 2) }, (__, row) => (
            <View key={row} style={styles.listEventRow}>
              <SkeletonBlock style={styles.skeletonListTime} />
              <SkeletonBlock style={styles.skeletonListBar} />
              <View style={styles.listEventTextCol}>
                <SkeletonBlock style={styles.skeletonListTitle} />
                <SkeletonBlock style={styles.skeletonListSubtitle} />
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export function ListFooterSkeleton({ styles }: { styles: ThemeStyles }) {
  return (
    <View>
      <View style={styles.listEventRow}>
        <SkeletonBlock style={styles.skeletonListTime} />
        <SkeletonBlock style={styles.skeletonListBar} />
        <View style={styles.listEventTextCol}>
          <SkeletonBlock style={styles.skeletonListTitle} />
        </View>
      </View>
    </View>
  );
}

export function DaySheetSkeleton({
  backgroundColor,
  surfaceColor,
}: {
  backgroundColor: string;
  surfaceColor: string;
}) {
  return (
    <View style={{ flex: 1, paddingHorizontal: 12, paddingTop: 16, backgroundColor }}>
      {Array.from({ length: 10 }, (_, index) => (
        <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 28 }}>
          <SkeletonBlock style={{ width: 36, height: 10, borderRadius: 4, backgroundColor: surfaceColor }} />
          <SkeletonBlock
            style={{
              flex: 1,
              marginLeft: 12,
              height: index % 3 === 0 ? 44 : 8,
              borderRadius: 6,
              backgroundColor: surfaceColor,
            }}
          />
        </View>
      ))}
    </View>
  );
}
