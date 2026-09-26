import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';

import { PASSWORD_MIN, useAuth } from '@/src/auth/auth-context';
import { useFinishAuth } from '@/src/auth/flow';
import { AuthField, AuthScreen, FieldError, PrimaryButton } from '@/src/components/auth/auth-ui';
import { t } from '@/src/i18n';

export default function AuthResetPasswordScreen() {
  const { email = '' } = useLocalSearchParams<{ email: string }>();
  const auth = useAuth();
  const finish = useFinishAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!password || saving) return;
    if (password.length < PASSWORD_MIN) {
      setError(t('auth.errors.passwordTooShort'));
      return;
    }
    setError(null);
    setSaving(true);
    const result = await auth.updatePassword(password);
    setSaving(false);
    if (result.error !== null) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(result.error);
      return;
    }
    if (auth.user && !auth.user.profileComplete) {
      router.replace({ pathname: '/auth/complete', params: { method: 'password' } });
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    finish();
  };

  return (
    <AuthScreen title={t('auth.resetTitle')} subtitle={t('auth.resetBody')} emphasis={email} onLeading={finish}>
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
        textContentType="newPassword"
        autoComplete="new-password"
        passwordRules={`minlength: ${PASSWORD_MIN};`}
        returnKeyType="done"
        invalid={Boolean(error)}
        onSubmitEditing={() => {
          void save();
        }}
      />
      <FieldError message={error} />
      <PrimaryButton
        label={t('auth.savePassword')}
        disabled={!password}
        loading={saving}
        onPress={() => {
          void save();
        }}
      />
    </AuthScreen>
  );
}
