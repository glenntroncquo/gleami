import React from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/contexts/auth-context';
import { hasDeletionRequest, requestStaffAccountDeletion } from '@/lib/api/account-deletion';

export function useAccountDeletionRequest() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [submitting, setSubmitting] = React.useState(false);
  const [requested, setRequested] = React.useState(false);
  const alreadyRequested = requested || hasDeletionRequest(user);

  const confirm = React.useCallback(() => {
    if (!user || submitting) return;

    if (alreadyRequested) {
      Alert.alert(t('account.successTitle'), t('account.successMessage'));
      return;
    }

    Alert.alert(t('account.confirmTitle'), t('account.confirmMessage'), [
      { text: t('client.cancel'), style: 'cancel' },
      {
        text: t('account.confirmAction'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setSubmitting(true);
            try {
              await requestStaffAccountDeletion(user);
              setRequested(true);
              Alert.alert(t('account.successTitle'), t('account.successMessage'));
            } catch {
              Alert.alert(t('account.failedTitle'), t('account.failed'));
            } finally {
              setSubmitting(false);
            }
          })();
        },
      },
    ]);
  }, [alreadyRequested, submitting, t, user]);

  return { confirm, submitting, alreadyRequested };
}
