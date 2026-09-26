import { router } from 'expo-router';
import React from 'react';

import { SettingsGroup, SettingsRow } from '@/src/components/settings-list';
import { SubScreen } from '@/src/components/sub-screen';
import { LEGAL_DOCS } from '@/src/legal';
import { t } from '@/src/i18n';

export default function LegalScreen() {
  return (
    <SubScreen title={t('legal.title')}>
      <SettingsGroup>
        {LEGAL_DOCS.map((doc) => (
          <SettingsRow
            key={doc.slug}
            icon={doc.icon}
            label={t(doc.labelKey)}
            chevron
            onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: doc.slug } })}
          />
        ))}
      </SettingsGroup>
    </SubScreen>
  );
}
