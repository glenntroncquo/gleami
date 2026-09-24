import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/src/auth/auth-context';
import { appleSignInEnabled, useMocks } from '@/src/config';
import { t } from '@/src/i18n';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setError(null);
    setNotice(null);
    setSubmitting(true);
    const result =
      mode === 'signIn'
        ? await auth.signIn(email, password)
        : await auth.signUp(email, password);
    setSubmitting(false);
    if (result.error) setError(result.error);
    else if (result.confirmEmail) setNotice(t('profile.confirmEmail'));
  };

  const magic = async () => {
    setError(null);
    setNotice(null);
    setSubmitting(true);
    const result = await auth.sendMagicLink(email);
    setSubmitting(false);
    if (result.error) setError(result.error);
    else setNotice(t('profile.magicSent', { email: email.trim() }));
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-canvas"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 88 }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        <Text className="text-3xl font-semibold tracking-tight text-ink">{t('profile.title')}</Text>
        {!auth.configured ? (
          <Text className="mt-4 text-sm leading-5 text-muted">{t('profile.missingConfig')}</Text>
        ) : null}
        {useMocks && !auth.user ? (
          <Text className="mt-4 text-sm leading-5 text-muted">{t('profile.mockHint')}</Text>
        ) : null}
        {auth.loading ? (
          <ActivityIndicator color="#1c1917" style={{ marginTop: 32 }} />
        ) : auth.user ? (
          <View className="mt-8">
            <Text className="text-sm text-muted">{t('profile.signedInAs')}</Text>
            <Text className="mt-1 text-lg font-semibold text-ink">{auth.user.email}</Text>
            <Pressable
              onPress={() => {
                void auth.signOut();
              }}
              accessibilityRole="button"
              accessibilityLabel={t('profile.signOut')}
              className="mt-8 items-center rounded-2xl bg-ink py-3.5">
              <Text className="text-base font-semibold text-white">{t('profile.signOut')}</Text>
            </Pressable>
          </View>
        ) : (
          <View className="mt-8 gap-3">
            <Field
              label={t('profile.email')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              textContentType="emailAddress"
            />
            <Field
              label={t('profile.password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType={mode === 'signUp' ? 'newPassword' : 'password'}
            />
            {error ? <Text className="text-sm text-accent">{error}</Text> : null}
            {notice ? <Text className="text-sm text-ink">{notice}</Text> : null}
            <Pressable
              onPress={() => {
                void submit();
              }}
              disabled={submitting || !auth.configured}
              accessibilityRole="button"
              accessibilityLabel={mode === 'signIn' ? t('profile.signIn') : t('profile.signUp')}
              className="mt-2 items-center rounded-2xl bg-accent py-3.5">
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-base font-semibold text-white">
                  {mode === 'signIn' ? t('profile.signIn') : t('profile.signUp')}
                </Text>
              )}
            </Pressable>
            <Pressable
              onPress={() => {
                void magic();
              }}
              disabled={submitting || !auth.configured}
              accessibilityRole="button"
              accessibilityLabel={t('profile.magicLink')}
              className="items-center rounded-2xl border border-line py-3.5">
              <Text className="text-base font-semibold text-ink">{t('profile.magicLink')}</Text>
            </Pressable>
            {appleSignInEnabled ? (
              <Pressable
                onPress={() => Alert.alert(t('profile.apple'), t('profile.appleSoon'))}
                accessibilityRole="button"
                accessibilityLabel={t('profile.apple')}
                className="items-center rounded-2xl bg-ink py-3.5">
                <Text className="text-base font-semibold text-white">{t('profile.apple')}</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => {
                setMode((current) => (current === 'signIn' ? 'signUp' : 'signIn'));
                setError(null);
              }}
              accessibilityRole="button"
              accessibilityLabel={mode === 'signIn' ? t('profile.switchToSignUp') : t('profile.switchToSignIn')}
              className="items-center py-2">
              <Text className="text-sm font-medium text-muted">
                {mode === 'signIn' ? t('profile.switchToSignUp') : t('profile.switchToSignIn')}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  ...props
}: React.ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View>
      <Text className="mb-1.5 text-sm font-medium text-ink">{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholder={label}
        placeholderTextColor="#a8a29e"
        autoCorrect={false}
        className="rounded-2xl border border-line bg-surface px-4 py-3 text-base text-ink"
      />
    </View>
  );
}
