import { Pressable } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

type CrashRecoveryProps = {
  onRetry: () => void;
};

export function CrashRecovery({ onRetry }: CrashRecoveryProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle" style={styles.title}>
        {t('errorBoundary.title', { defaultValue: 'Something went wrong' })}
      </ThemedText>
      <ThemedText style={styles.message} lightColor={theme.muted} darkColor={theme.muted}>
        {t('errorBoundary.message', {
          defaultValue: 'The app ran into a problem. You can try again.',
        })}
      </ThemedText>
      <Pressable
        style={[styles.retry, { backgroundColor: theme.tint }]}
        onPress={onRetry}>
        <ThemedText style={styles.retryText} lightColor={theme.onTint} darkColor={theme.onTint}>
          {t('errorBoundary.retry', { defaultValue: 'Try again' })}
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
  },
  retry: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
