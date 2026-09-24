import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { t } from '@/src/i18n';

type ScreenStateProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function ScreenState({ icon, title, body, actionLabel, onAction }: ScreenStateProps) {
  return (
    <View
      className="items-center justify-center px-8 py-12"
      accessibilityRole="summary"
      accessibilityLabel={body ? `${title}. ${body}` : title}>
      <View className="mb-3 h-14 w-14 items-center justify-center rounded-full bg-surface">
        <Ionicons name={icon} size={26} color="#78716c" />
      </View>
      <Text className="text-center text-lg font-semibold text-ink">{title}</Text>
      {body ? <Text className="mt-2 text-center text-sm leading-5 text-muted">{body}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          className="mt-5 rounded-full border border-ink px-5 py-2.5">
          <Text className="text-sm font-semibold text-ink">{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function LoadingState() {
  return <ScreenState icon="hourglass-outline" title={t('states.loading')} />;
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <ScreenState
      icon="alert-circle-outline"
      title={t('states.errorTitle')}
      body={t('states.errorBody')}
      actionLabel={onRetry ? t('common.retry') : undefined}
      onAction={onRetry}
    />
  );
}

export function OfflineState({ onRetry }: { onRetry?: () => void }) {
  return (
    <ScreenState
      icon="cloud-offline-outline"
      title={t('states.offlineTitle')}
      body={t('states.offlineBody')}
      actionLabel={onRetry ? t('common.retry') : undefined}
      onAction={onRetry}
    />
  );
}

export function OfflineBanner() {
  return (
    <View
      className="mx-5 mb-3 rounded-2xl bg-surface px-4 py-3"
      accessibilityRole="text"
      accessibilityLabel={t('states.offlineTitle')}>
      <Text className="text-sm font-semibold text-ink">{t('states.offlineTitle')}</Text>
      <Text className="mt-1 text-sm text-muted">{t('states.offlineBody')}</Text>
    </View>
  );
}
