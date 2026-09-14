import { Pressable } from '@/components/pressable-scale';
import { AppIcon } from '@/components/app-icon';
import React from 'react';
import { Alert, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { getPrivacyUrl, getTermsUrl } from '@/lib/legal';
import { openExternalUrl } from '@/lib/open-external-url';

type Props = {
  showIcons?: boolean;
  rowStyle: StyleProp<ViewStyle>;
  textStyle: StyleProp<TextStyle>;
  chevronColor: string;
};

export function useLegalUrls() {
  return {
    privacyUrl: getPrivacyUrl(),
    termsUrl: getTermsUrl(),
  };
}

export function LegalLinkRows({ rowStyle, textStyle, chevronColor, showIcons = false }: Props) {
  const { t } = useTranslation();
  const { privacyUrl, termsUrl } = useLegalUrls();

  const open = async (url: string) => {
    try {
      await openExternalUrl(url);
    } catch {
      Alert.alert(t('legal.failedToOpen'));
    }
  };

  return (
    <>
      {privacyUrl ? (
        <Pressable style={rowStyle} onPress={() => void open(privacyUrl)}>
          {showIcons ? <AppIcon name="privacy" size={21} color={chevronColor} /> : null}
          <ThemedText style={textStyle}>{t('legal.privacy')}</ThemedText>
          <AppIcon name="chevronRight" size={showIcons ? 15 : 20} color={chevronColor} />
        </Pressable>
      ) : null}
      {termsUrl ? (
        <Pressable style={rowStyle} onPress={() => void open(termsUrl)}>
          {showIcons ? <AppIcon name="terms" size={21} color={chevronColor} /> : null}
          <ThemedText style={textStyle}>{t('legal.terms')}</ThemedText>
          <AppIcon name="chevronRight" size={showIcons ? 15 : 20} color={chevronColor} />
        </Pressable>
      ) : null}
    </>
  );
}
