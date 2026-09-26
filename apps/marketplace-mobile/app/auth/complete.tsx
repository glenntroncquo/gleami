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
type Field = 'firstName' | 'lastName' | 'password' | 'phone' | 'form';

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
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [saving, setSaving] = useState(false);

  const lastNameRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const submit = async () => {
    if (saving) return;
    const e164 = toE164(country, phone);
    const next: Partial<Record<Field, string>> = {};
    if (!firstName.trim()) next.firstName = t('auth.errors.required');
    if (!lastName.trim()) next.lastName = t('auth.errors.required');
    if (needsPassword) {
      if (!password) next.password = t('auth.errors.required');
      else if (password.length < PASSWORD_MIN) next.password = t('auth.errors.passwordTooShort');
    }
    if (!phone.trim()) next.phone = t('auth.errors.required');
    else if (!e164) next.phone = t('auth.errors.invalidPhone');
    if (Object.keys(next).length > 0 || !e164) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrors(next);
      return;
    }
    setErrors({});
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
      setErrors({ form: result.error });
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    finish();
  };

  const clearError = (field: Field) => {
    if (errors[field] || errors.form) setErrors(({ [field]: _removed, form: _form, ...rest }) => rest);
  };

  return (
    <AuthScreen title={t('auth.completeTitle')} subtitle={t('auth.completeBody')} onLeading={finish}>
      <AuthField
        label={t('auth.firstName')}
        value={firstName}
        onChangeText={(value) => {
          setFirstName(value);
          clearError('firstName');
        }}
        invalid={Boolean(errors.firstName)}
        autoCapitalize="words"
        textContentType="givenName"
        autoComplete="given-name"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => lastNameRef.current?.focus()}
      />
      <FieldError message={errors.firstName} />
      <AuthField
        ref={lastNameRef}
        label={t('auth.lastName')}
        value={lastName}
        onChangeText={(value) => {
          setLastName(value);
          clearError('lastName');
        }}
        invalid={Boolean(errors.lastName)}
        autoCapitalize="words"
        textContentType="familyName"
        autoComplete="family-name"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <FieldError message={errors.lastName} />
      {needsPassword ? (
        <>
          <AuthField
            ref={passwordRef}
            label={t('auth.password')}
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              clearError('password');
            }}
            secure
            autoCapitalize="none"
            textContentType="newPassword"
            autoComplete="new-password"
            passwordRules={`minlength: ${PASSWORD_MIN};`}
            invalid={Boolean(errors.password)}
          />
          <FieldError message={errors.password} />
        </>
      ) : null}
      <PhoneField
        label={t('auth.phone')}
        country={country}
        onCountryChange={setCountry}
        value={phone}
        onChangeText={(value) => {
          setPhone(value);
          clearError('phone');
        }}
        invalid={Boolean(errors.phone)}
      />
      <FieldError message={errors.phone} />
      <AuthField label={t('auth.email')} value={auth.user?.email ?? ''} disabled />
      <FieldError message={errors.form} />
      <PrimaryButton
        label={t('auth.continue')}
        loading={saving}
        onPress={() => {
          void submit();
        }}
      />
    </AuthScreen>
  );
}
