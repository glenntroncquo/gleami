import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { isValidEmail, useAuth } from '@/src/auth/auth-context';
import { useAfterSignIn, useFinishAuth } from '@/src/auth/flow';
import { isSocialAvailable, type SocialProvider } from '@/src/auth/social';
import {
  AuthField,
  AuthScreen,
  FieldError,
  OrDivider,
  PrimaryButton,
  SocialButton,
} from '@/src/components/auth/auth-ui';
import { t } from '@/src/i18n';

export default function AuthWelcomeScreen() {
  const auth = useAuth();
  const finish = useFinishAuth();
  const afterSignIn = useAfterSignIn();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'email' | SocialProvider | null>(null);
  const [providers, setProviders] = useState<SocialProvider[]>([]);

  useEffect(() => {
    let alive = true;
    void Promise.all((['apple', 'google'] as const).map(async (p) => ((await isSocialAvailable(p)) ? p : null))).then(
      (list) => {
        if (alive) setProviders(list.filter((p): p is SocialProvider => p !== null));
      },
    );
    return () => {
      alive = false;
    };
  }, []);

  const valid = isValidEmail(email);

  const continueWithEmail = async () => {
    if (!valid || busy) return;
    setError(null);
    setBusy('email');
    const address = email.trim().toLowerCase();
    const status = await auth.lookupEmail(address);
    if (status.error !== null) {
      setBusy(null);
      setError(status.error);
      return;
    }
    if (status.data.exists && status.data.hasPassword) {
      setBusy(null);
      router.push({ pathname: '/auth/password', params: { email: address } });
      return;
    }
    const sent = await auth.sendEmailCode(address, { createUser: true });
    setBusy(null);
    if (sent.error !== null) {
      setError(sent.error);
      return;
    }
    router.push({ pathname: '/auth/verify', params: { email: address, intent: 'signin' } });
  };

  const continueWithSocial = async (provider: SocialProvider) => {
    if (busy) return;
    setError(null);
    setBusy(provider);
    const result = await auth.signInWithSocial(provider);
    setBusy(null);
    if (result.error !== null) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(result.error);
      return;
    }
    if (!result.data) return;
    afterSignIn(result.data.user, 'social', result.data);
  };

  return (
    <AuthScreen title={t('auth.welcomeTitle')} subtitle={t('auth.welcomeBody')} leading="close" onLeading={finish}>
      {providers.length ? (
        <>
          <View style={{ gap: 10 }}>
            {providers.map((provider) => (
              <SocialButton
                key={provider}
                provider={provider}
                loading={busy === provider}
                disabled={busy !== null && busy !== provider}
                onPress={() => {
                  void continueWithSocial(provider);
                }}
              />
            ))}
          </View>
          <OrDivider />
        </>
      ) : null}
      <AuthField
        label={t('auth.email')}
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          if (error) setError(null);
        }}
        placeholder={t('auth.emailPlaceholder')}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="go"
        clearable
        invalid={Boolean(error)}
        onSubmitEditing={() => {
          void continueWithEmail();
        }}
      />
      <FieldError message={error} />
      <PrimaryButton
        label={t('auth.continue')}
        disabled={!valid}
        loading={busy === 'email'}
        onPress={() => {
          void continueWithEmail();
        }}
      />
    </AuthScreen>
  );
}
