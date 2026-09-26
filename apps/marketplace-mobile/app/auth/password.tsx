import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { useAuth } from '@/src/auth/auth-context';
import { useAfterSignIn } from '@/src/auth/flow';
import { AuthField, AuthScreen, FieldError, PrimaryButton, TextLink } from '@/src/components/auth/auth-ui';
import { t } from '@/src/i18n';

export default function AuthPasswordScreen() {
  const { email = '' } = useLocalSearchParams<{ email: string }>();
  const auth = useAuth();
  const afterSignIn = useAfterSignIn();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'signIn' | 'forgot' | null>(null);

  const signIn = async () => {
    if (!password || busy) return;
    setError(null);
    setBusy('signIn');
    const result = await auth.signInWithPassword(email, password);
    setBusy(null);
    if (result.error !== null) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(result.error);
      return;
    }
    afterSignIn(result.data, 'password');
  };

  const forgot = async () => {
    if (busy) return;
    setError(null);
    setBusy('forgot');
    const sent = await auth.sendEmailCode(email, { createUser: false });
    setBusy(null);
    if (sent.error !== null) {
      setError(sent.error);
      return;
    }
    router.push({ pathname: '/auth/verify', params: { email, intent: 'reset' } });
  };

  return (
    <AuthScreen title={t('auth.passwordTitle')} subtitle={t('auth.passwordBody')} emphasis={email}>
      <AuthField
        label={t('auth.password')}
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          if (error) setError(null);
        }}
        secure
        autoFocus
        autoCapitalize="none"
        textContentType="password"
        autoComplete="current-password"
        returnKeyType="go"
        invalid={Boolean(error)}
        onSubmitEditing={() => {
          void signIn();
        }}
      />
      <FieldError message={error} />
      <View style={{ alignItems: 'flex-start', marginTop: -6 }}>
        <TextLink
          label={t('auth.forgotPassword')}
          disabled={busy !== null}
          onPress={() => {
            void forgot();
          }}
        />
      </View>
      <PrimaryButton
        label={t('auth.signIn')}
        disabled={!password}
        loading={busy === 'signIn'}
        onPress={() => {
          void signIn();
        }}
      />
    </AuthScreen>
  );
}
