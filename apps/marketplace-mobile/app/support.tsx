import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { SettingsGroup, SettingsRow } from '@/src/components/settings-list';
import { SubScreen } from '@/src/components/sub-screen';
import { t } from '@/src/i18n';
import { brandColors } from '@/src/theme/colors';

export default function SupportScreen() {
  return (
    <SubScreen title={t('support.title')} subtitle={t('support.body')}>
      <SettingsGroup>
        <SettingsRow
          icon="mail-outline"
          label={t('support.email')}
          detail={t('support.emailDetail')}
          chevron
          onPress={() => {
            void Linking.openURL(`mailto:${t('support.emailDetail')}`).catch(() => undefined);
          }}
        />
        <SettingsRow
          icon="help-circle-outline"
          label={t('support.faq')}
          detail={t('support.faqDetail')}
          chevron
          onPress={() => undefined}
        />
        <SettingsRow
          icon="calendar-outline"
          label={t('support.booking')}
          detail={t('support.bookingDetail')}
          chevron
          onPress={() => undefined}
        />
      </SettingsGroup>
      <View style={styles.card}>
        <Text style={styles.body}>{t('support.soon')}</Text>
      </View>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderCurve: 'continuous', backgroundColor: brandColors.blueTint, padding: 16 },
  body: { fontSize: 14, lineHeight: 21, color: brandColors.navy },
});
