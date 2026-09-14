import { ScreenScrollView } from '@/components/screen-scroll-view';
import { AppIcon } from '@/components/app-icon';
import { HeaderButton } from '@/components/header-button';
import { Pressable } from '@/components/pressable-scale';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, DeviceEventEmitter, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Design } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from '@/contexts/location-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createTimeOff } from '@/lib/api/staff';

const TIME_OFF_EVENT = 'timeOffDraft:setDateTime';

function formatDateLabel(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTimeLabel(date: Date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function defaultDate() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function defaultEnd() {
  const date = new Date();
  date.setHours(23, 59, 0, 0);
  return date;
}

export default function StaffTimeOffNewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { staffId } = useLocalSearchParams<{ staffId: string }>();
  const { companyId } = useAuth();
  const { locationId } = useLocation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [date, setDate] = React.useState(defaultDate);
  const [startTime, setStartTime] = React.useState(defaultDate);
  const [endTime, setEndTime] = React.useState(defaultEnd);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const sub = DeviceEventEmitter.addListener(TIME_OFF_EVENT, ({ field, value }: { field: 'date' | 'start' | 'end'; value: string }) => {
      const picked = new Date(value);
      if (field === 'date') setDate(picked);
      else if (field === 'start') setStartTime(picked);
      else setEndTime(picked);
    });
    return () => sub.remove();
  }, []);

  const openPicker = (field: 'date' | 'start' | 'end', mode: 'date' | 'time', value: Date, title: string) => {
    router.push({
      pathname: '/date-time-picker',
      params: { mode, value: value.toISOString(), event: TIME_OFF_EVENT, field, title },
    });
  };

  const handleSave = async () => {
    if (!staffId || !companyId || !locationId) {
      setError(t('calendar.noLocation'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createTimeOff(
        staffId,
        companyId,
        date,
        startTime.getHours(),
        startTime.getMinutes(),
        endTime.getHours(),
        endTime.getMinutes(),
        locationId
      );
      router.back();
    } catch {
      setError(t('staff.failedToSaveTimeOff'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('staff.addTimeOff'),
          unstable_headerLeftItems: () => [
            {
              type: 'button',
              label: t('common.close'),
              icon: { type: 'sfSymbol', name: 'xmark' },
              tintColor: theme.text,
              onPress: () => router.back(),
            },
          ],
          headerLeft: () => (
            <HeaderButton onPress={() => router.back()} hitSlop={8}>
              <AppIcon name="close" size={18} color={theme.text} />
            </HeaderButton>
          ),
          headerRight: () => (
            <HeaderButton onPress={handleSave} disabled={saving} hitSlop={8}>
              {saving ? (
                <ActivityIndicator size="small" color={theme.tint} />
              ) : (
                <Text style={[styles.saveText, { color: theme.tint }]}>{t('client.save')}</Text>
              )}
            </HeaderButton>
          ),
        }}
      />

      {error ? (
        <View style={[styles.errorBanner, { backgroundColor: `${theme.error}22` }]}>
          <Text style={[styles.errorBannerText, { color: theme.error }]}>{error}</Text>
        </View>
      ) : null}

      <ScreenScrollView contentContainerStyle={styles.body}>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: theme.text }]}>{t('staff.date')}</Text>
          <Pressable
            style={[styles.pill, { borderColor: theme.border, backgroundColor: theme.surface }]}
            onPress={() => openPicker('date', 'date', date, t('staff.date'))}>
            <Text style={[styles.pillText, { color: theme.text }]}>{formatDateLabel(date)}</Text>
          </Pressable>
        </View>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: theme.text }]}>{t('appointment.starts')}</Text>
          <Pressable
            style={[styles.pill, { borderColor: theme.border, backgroundColor: theme.surface }]}
            onPress={() => openPicker('start', 'time', startTime, t('appointment.starts'))}>
            <Text style={[styles.pillText, { color: theme.text }]}>{formatTimeLabel(startTime)}</Text>
          </Pressable>
        </View>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: theme.text }]}>{t('appointment.ends')}</Text>
          <Pressable
            style={[styles.pill, { borderColor: theme.border, backgroundColor: theme.surface }]}
            onPress={() => openPicker('end', 'time', endTime, t('appointment.ends'))}>
            <Text style={[styles.pillText, { color: theme.text }]}>{formatTimeLabel(endTime)}</Text>
          </Pressable>
        </View>
      </ScreenScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '700',
  },
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: Design.controlRadius,
  },
  errorBannerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  body: {
    padding: 16,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
