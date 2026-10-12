import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ListGroup, ListRow, useTheme } from '@/components/ui';

export default function CalendarAddSheet() {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useTheme();
  const { date, staffId } = useLocalSearchParams<{ date?: string; staffId?: string }>();
  const params = { ...(date ? { date } : {}), ...(staffId ? { staffId } : {}) };

  const items = [
    {
      key: 'appointment',
      label: t('calendar.addAppointment'),
      hint: t('calendar.unavailability.appointmentHint'),
      icon: 'calendar' as const,
      go: () => router.push({ pathname: '/appointment-new', params }),
    },
    {
      key: 'unavailability',
      label: t('calendar.addUnavailability'),
      hint: t('calendar.unavailability.unavailabilityHint'),
      icon: 'schedule' as const,
      go: () => router.push({ pathname: '/staff/time-off-new', params }),
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{t('calendar.addTitle')}</Text>
      <ListGroup style={{ backgroundColor: theme.surface }}>
        {items.map((item) => (
          <ListRow
            key={item.key}
            title={item.label}
            subtitle={item.hint}
            icon={item.icon}
            iconTone="brand"
            accessibilityHint={item.hint}
            onPress={() => {
              router.back();
              item.go();
            }}
          />
        ))}
      </ListGroup>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 28, paddingHorizontal: 16 },
  title: { fontSize: 24, fontWeight: '700', letterSpacing: -0.3, marginBottom: 16, paddingHorizontal: 4 },
});
