import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import type { TextInput } from 'react-native';

import { PASSWORD_MIN, useAuth } from '@/src/auth/auth-context';
import { useFinishAuth, type AuthMethod } from '@/src/auth/flow';
import { AuthField, AuthScreen, FieldError, PrimaryButton } from '@/src/components/auth/auth-ui';
import { COUNTRIES, fromE164, PhoneField, toE164, type Country } from '@/src/components/auth/phone-field';
import { t } from '@/src/i18n';

type Params = { method?: AuthMethod; firstName?: string; lastName?: string };

export default function AuthCompleteScreen() {
  const params = useLocalSearchParams<Params>();
  const auth = useAuth();
  const finish = useFinishAuth();
  const needsPassword = params.method === 'code';
  const initialPhone = auth.user?.phone ? fromE164(auth.user.phone) : null;

  const [firstName, setFirstName] = useState(params.firstName || auth.user?.firstName || '');
  const [lastName, setLastName] = useState(params.lastName || auth.user?.lastName || '');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState<Country>(initialPhone?.country ?? COUNTRIES[0]);
  const [phone, setPhone] = useState(initialPhone?.national ?? '');
  const [error, setError] = useState<{ field: 'password' | 'phone' | 'form'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const lastNameRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const filled =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    phone.trim().length > 0 &&
    (!needsPassword || password.length > 0);

  const submit = async () => {
    if (!filled || saving) return;
    if (needsPassword && password.length < PASSWORD_MIN) {
      setError({ field: 'password', message: t('auth.errors.passwordTooShort') });
      return;
    }
    const e164 = toE164(country, phone);
    if (!e164) {
      setError({ field: 'phone', message: t('auth.errors.invalidPhone') });
      return;
    }
    setError(null);
    setSaving(true);
    const result = await auth.completeProfile({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: e164,
      ...(needsPassword ? { password } : {}),
    });
    setSaving(false);
    if (result.error !== null) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError({ field: 'form', message: result.error });
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    finish();
  };

  const clearError = () => {
    if (error) setError(null);
  };

  return (
    <AuthScreen title={t('auth.completeTitle')} subtitle={t('auth.completeBody')} onLeading={finish}>
      <AuthField
        label={t('auth.firstName')}
        value={firstName}
        onChangeText={setFirstName}
        autoCapitalize="words"
        textContentType="givenName"
        autoComplete="given-name"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => lastNameRef.current?.focus()}
      />
      <AuthField
        ref={lastNameRef}
        label={t('auth.lastName')}
        value={lastName}
        onChangeText={setLastName}
        autoCapitalize="words"
        textContentType="familyName"
        autoComplete="family-name"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      {needsPassword ? (
        <>
          <AuthField
            ref={passwordRef}
            label={t('auth.password')}
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              clearError();
            }}
            secure
            autoCapitalize="none"
            textContentType="newPassword"
            autoComplete="new-password"
            passwordRules={`minlength: ${PASSWORD_MIN};`}
            invalid={error?.field === 'password'}
          />
          <FieldError message={error?.field === 'password' ? error.message : null} />
        </>
      ) : null}
      <PhoneField
        label={t('auth.phone')}
        country={country}
        onCountryChange={setCountry}
        value={phone}
        onChangeText={(value) => {
          setPhone(value);
          clearError();
        }}
        invalid={error?.field === 'phone'}
      />
      <FieldError message={error?.field === 'phone' ? error.message : null} />
      <AuthField label={t('auth.email')} value={auth.user?.email ?? ''} disabled />
      <FieldError message={error?.field === 'form' ? error.message : null} />
      <PrimaryButton
        label={t('auth.continue')}
        disabled={!filled}
        loading={saving}
        onPress={() => {
          void submit();
        }}
      />
    </AuthScreen>
  );
}
