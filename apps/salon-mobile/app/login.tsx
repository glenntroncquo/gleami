import { ScreenScrollView } from '@/components/screen-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable } from '@/components/pressable-scale';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TextInput,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/auth-context';
import { Colors, Design } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setIsSubmitting(true);

    const { error } = await signIn(email.trim(), password);

    if (error) {
      setError(error.toLowerCase().includes('invalid login credentials') ? t('auth.invalidCredentials') : error);
    }

    setIsSubmitting(false);
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]}>
      <ScreenScrollView contentContainerStyle={styles.container}>
        <ThemedText type="title" style={styles.title}>
          Gleami
        </ThemedText>
        <ThemedText style={styles.subtitle} lightColor={theme.muted} darkColor={theme.muted}>
          {t('auth.signInSubtitle')}
        </ThemedText>

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              color: theme.text,
            },
          ]}
          placeholder={t('auth.email')}
          placeholderTextColor={theme.muted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          value={email}
          onChangeText={setEmail}
          editable={!isSubmitting}
        />

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              color: theme.text,
            },
          ]}
          placeholder={t('auth.password')}
          placeholderTextColor={theme.muted}
          secureTextEntry
          textContentType="password"
          value={password}
          onChangeText={setPassword}
          editable={!isSubmitting}
          onSubmitEditing={handleSubmit}
        />

        {error ? (
          <ThemedText style={styles.error} lightColor={theme.error} darkColor={theme.error}>
            {error}
          </ThemedText>
        ) : null}

        <Pressable
          style={[styles.button, { backgroundColor: theme.tint, opacity: canSubmit ? 1 : 0.5 }]}
          onPress={handleSubmit}
          disabled={!canSubmit}>
          {isSubmitting ? (
            <ActivityIndicator color={theme.onTint} />
          ) : (
            <ThemedText style={styles.buttonText} lightColor={theme.onTint} darkColor={theme.onTint}>
              {t('auth.signIn')}
            </ThemedText>
          )}
        </Pressable>
      </ScreenScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingVertical: 24,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 12,
  },
  input: {
    minHeight: 48,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: Design.controlRadius,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  error: {
    textAlign: 'center',
  },
  button: {
    minHeight: 48,
    paddingVertical: 12,
    borderRadius: Design.controlRadius,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
