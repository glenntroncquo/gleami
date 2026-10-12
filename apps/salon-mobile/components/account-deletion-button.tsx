import React from 'react';
import { useTranslation } from 'react-i18next';

import { ListRow } from '@/components/ui';
import { useAccountDeletionRequest } from '@/hooks/use-account-deletion-request';

/** Destructive list row; place inside a ListGroup. */
export function AccountDeletionButton() {
  const { t } = useTranslation();
  const { confirm, submitting, alreadyRequested } = useAccountDeletionRequest();

  return (
    <ListRow
      destructive
      icon="delete"
      chevron={false}
      title={alreadyRequested ? t('account.requestDeletionAlready') : t('account.requestDeletion')}
      onPress={confirm}
      disabled={submitting}
    />
  );
}
