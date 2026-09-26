import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/src/auth/auth-context';
import { useAfterSignIn } from '@/src/auth/flow';
import {
  authColors,
  AuthScreen,
  CodeInput,
  FieldError,
  PrimaryButton,
  TextLink,
} from '@/src/components/auth/auth-ui';
import { t } from '@/src/i18n';

const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function AuthVerifyScreen() {
  const { email = '', intent = 'signin' } = useLocalSearchParams<{ email: string; intent?: 'signin' | 'reset' }>();
  const auth = useAuth();
  const afterSignIn = useAfterSignIn();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const [notice, setNotice] = useState<string | null>(null);
  const submitted = useRef<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const verify = useCallback(
    async (value: string) => {
      if (value.length !== CODE_LENGTH || submitted.current === value) return;
      submitted.current = value;
      setError(null);
      setVerifying(true);
      const result = await auth.verifyEmailCode(email, value);
      setVerifying(false);
      if (result.error !== null) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(result.error);
        setShakeKey((key) => key + 1);
        setCode('');
        submitted.current = null;
        return;
      }
      if (intent === 'reset') {
        router.replace({ pathname: '/auth/reset-password', params: { email } });
        return;
      }
      afterSignIn(result.data, 'code');
    },
    [afterSignIn, auth, email, intent],
  );

  const resend = async () => {
    if (cooldown > 0) {
      setNotice(t('auth.resendIn', { seconds: cooldown }));
      return;
    }
    setError(null);
    setNotice(null);
    const sent = await auth.sendEmailCode(email, { createUser: intent !== 'reset' });
    if (sent.error !== null) {
      setError(sent.error);
      return;
    }
    void Haptics.selectionAsync();
    setNotice(t('auth.resent'));
    setCooldown(RESEND_SECONDS);
  };

  return (
    <AuthScreen title={t('auth.verifyTitle')} subtitle={t('auth.verifyBody')} emphasis={email}>
      <CodeInput
        value={code}
        onChange={(value) => {
          setCode(value);
          if (error) setError(null);
          if (notice) setNotice(null);
          if (value.length === CODE_LENGTH) void verify(value);
        }}
        length={CODE_LENGTH}
        invalid={Boolean(error)}
        shakeKey={shakeKey}
        disabled={verifying}
      />
      <FieldError message={error} />
      <PrimaryButton
        label={t('auth.continue')}
        disabled={code.length !== CODE_LENGTH}
        loading={verifying}
        onPress={() => {
          submitted.current = null;
          void verify(code);
        }}
      />
      <View>
        <View style={styles.resendRow}>
          <Text style={styles.resendText}>{t('auth.noCode')} </Text>
          <TextLink
            label={t('auth.resend')}
            onPress={() => {
              void resend();
            }}
          />
        </View>
        {notice ? (
          <Text accessibilityLiveRegion="polite" style={styles.notice}>
            {notice}
          </Text>
        ) : null}
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  resendRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', minHeight: 22, marginTop: 6 },
  resendText: { fontSize: 14, color: authColors.ink },
  notice: { marginTop: 8, textAlign: 'center', fontSize: 13, color: authColors.muted },
});
