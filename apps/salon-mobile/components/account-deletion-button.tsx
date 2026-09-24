import { Pressable } from '@/components/pressable-scale';
import React from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useAccountDeletionRequest } from '@/hooks/use-account-deletion-request';

type Props = {
  style?: StyleProp<ViewStyle>;
};

export function AccountDeletionButton({ style }: Props) {
  const { t } = useTranslation();
  const { confirm, submitting, alreadyRequested } = useAccountDeletionRequest();

  return (
    <Pressable style={style} onPress={confirm} disabled={submitting}>
      <ThemedText
        style={{ fontSize: 16, fontWeight: '600' }}
        lightColor={Colors.light.error}
        darkColor={Colors.dark.error}>
        {alreadyRequested ? t('account.requestDeletionAlready') : t('account.requestDeletion')}
      </ThemedText>
    </Pressable>
  );
}
