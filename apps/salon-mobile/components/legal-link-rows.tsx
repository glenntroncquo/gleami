import React from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ListGroup, ListRow, SectionHeader } from '@/components/ui';
import { getPrivacyUrl, getTermsUrl } from '@/lib/legal';
import { openExternalUrl } from '@/lib/open-external-url';

export function useLegalUrls() {
  return {
    privacyUrl: getPrivacyUrl(),
    termsUrl: getTermsUrl(),
  };
}

/** Legal section (header + grouped rows); renders nothing when no legal URLs are configured. */
export function LegalLinkRows() {
  const { t } = useTranslation();
  const { privacyUrl, termsUrl } = useLegalUrls();

  if (!privacyUrl && !termsUrl) return null;

  const open = async (url: string) => {
    try {
      await openExternalUrl(url);
    } catch {
      Alert.alert(t('legal.failedToOpen'));
    }
  };

  return (
    <>
      <SectionHeader title={t('legal.section')} />
      <ListGroup>
        {privacyUrl ? <ListRow icon="privacy" title={t('legal.privacy')} onPress={() => void open(privacyUrl)} /> : null}
        {termsUrl ? <ListRow icon="terms" title={t('legal.terms')} onPress={() => void open(termsUrl)} /> : null}
      </ListGroup>
    </>
  );
}
