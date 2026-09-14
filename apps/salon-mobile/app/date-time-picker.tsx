import { ScreenScrollView as ScrollView } from '@/components/screen-scroll-view';
import { HeaderButton } from '@/components/header-button';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { DeviceEventEmitter, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Shared native date/time picker sheet, presented as `formSheet` (see
 * app/_layout.tsx). Any screen can push this with a `mode`/`value` and an
 * `event` name of its own; it emits `{ field, value }` on every change and
 * the caller reduces that into its own draft state. Keeps every date/time
 * field in the app on the exact same native sheet instead of each screen
 * rolling its own popup.
 */
export default function DateTimePickerScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { mode, value, event, field, title } = useLocalSearchParams<{
    mode: 'date' | 'time';
    value: string;
    event: string;
    field: string;
    title?: string;
  }>();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const [current, setCurrent] = React.useState(() => new Date(value));

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: title || (mode === 'date' ? t('appointment.dateAndTime') : t('appointment.starts')),
          headerRight: () => (
            <HeaderButton onPress={() => router.back()} hitSlop={8} style={styles.headerTextButton}>
              <Text style={styles.headerLinkText}>{t('appointment.done')}</Text>
            </HeaderButton>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
        <DateTimePicker
          value={current}
          mode={mode}
          display="spinner"
          onChange={(_, selected) => {
            if (!selected) return;
            setCurrent(selected);
            DeviceEventEmitter.emit(event, { field, value: selected.toISOString() });
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: typeof Colors.light) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    headerTextButton: {
      width: 'auto',
      minWidth: 0,
      paddingHorizontal: 4,
    },
    headerLinkText: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.tint,
    },
    content: {
      padding: 16,
      alignItems: 'center',
    },
  });
}
