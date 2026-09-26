import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SubScreen } from '@/src/components/sub-screen';
import { t } from '@/src/i18n';
import { LEGAL_DOCS } from '@/src/legal';
import { brandColors } from '@/src/theme/colors';

export default function LegalDocScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const entry = LEGAL_DOCS.find((item) => item.slug === doc);

  return (
    <SubScreen title={entry ? t(entry.labelKey) : t('legal.title')} subtitle={t('legal.soon')}>
      <View style={styles.card}>
        <Text style={styles.body}>{t('legal.contact')}</Text>
      </View>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderCurve: 'continuous', backgroundColor: brandColors.surface, padding: 16 },
  body: { fontSize: 14.5, lineHeight: 22, color: brandColors.navy },
});
