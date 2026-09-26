import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { forwardRef, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { SocialProvider } from '@/src/auth/social';
import { t } from '@/src/i18n';
import { brandColors } from '@/src/theme/colors';

export const authColors = {
  ink: brandColors.navy,
  muted: brandColors.muted,
  focus: brandColors.lavender,
  border: '#E1E4EC',
  disabled: '#A9ADB6',
  field: '#F4F5F8',
  danger: '#D64545',
};

// ---------------------------------------------------------------------------
// Screen shell
// ---------------------------------------------------------------------------

type AuthScreenProps = {
  title: string;
  subtitle?: string;
  /** Rendered bold on its own line under the subtitle (an email address). */
  emphasis?: string;
  leading?: 'back' | 'close';
  onLeading?: () => void;
  children: React.ReactNode;
};

export function AuthScreen({ title, subtitle, emphasis, leading = 'back', onLeading, children }: AuthScreenProps) {
  const insets = useSafeAreaInsets();
  // iOS presents the flow as a page sheet, which already clears the status bar.
  const top = Platform.OS === 'ios' ? 0 : insets.top;
  return (
    <View style={[styles.screen, { paddingTop: top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={onLeading ?? (() => router.back())}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={leading === 'close' ? t('auth.close') : t('common.back')}
          style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.5 }]}>
          <Ionicons name={leading === 'close' ? 'close' : 'arrow-back'} size={26} color={authColors.ink} />
        </Pressable>
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle}>
            {subtitle}
            {emphasis ? `\n${emphasis}` : ''}
          </Text>
        ) : null}
        <View style={styles.body}>{children}</View>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Fields
// ---------------------------------------------------------------------------

type AuthFieldProps = TextInputProps & {
  label: string;
  /** Password field with a show/hide toggle. */
  secure?: boolean;
  /** Shows a clear button while focused and non-empty. */
  clearable?: boolean;
  disabled?: boolean;
  invalid?: boolean;
};

export const AuthField = forwardRef<TextInput, AuthFieldProps>(function AuthField(
  { label, secure, clearable, disabled, invalid, style, onFocus, onBlur, ...props },
  ref,
) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <AuthInput
        ref={ref}
        {...props}
        accessibilityLabel={label}
        secure={secure}
        clearable={clearable}
        disabled={disabled}
        invalid={invalid}
        onFocus={onFocus}
        onBlur={onBlur}
        style={style}
      />
    </View>
  );
});

type AuthInputProps = Omit<AuthFieldProps, 'label'>;

export const AuthInput = forwardRef<TextInput, AuthInputProps>(function AuthInput(
  { secure, clearable, disabled, invalid, style, onFocus, onBlur, value, onChangeText, ...props },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const showClear = clearable && focused && Boolean(value);
  return (
    <View
      style={[
        styles.inputBox,
        focused && styles.inputFocused,
        invalid && !focused && styles.inputInvalid,
        disabled && styles.inputDisabled,
      ]}>
      <TextInput
        ref={ref}
        {...props}
        value={value}
        onChangeText={onChangeText}
        editable={!disabled}
        secureTextEntry={secure && !revealed}
        autoCorrect={false}
        placeholderTextColor="#A9ADB6"
        selectionColor={authColors.focus}
        cursorColor={authColors.ink}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[styles.input, disabled && { color: authColors.muted }, style]}
      />
      {secure ? (
        <Pressable
          onPress={() => setRevealed((current) => !current)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={revealed ? t('auth.hidePassword') : t('auth.showPassword')}
          style={styles.accessory}>
          <Ionicons name={revealed ? 'eye-off-outline' : 'eye-outline'} size={21} color={authColors.ink} />
        </Pressable>
      ) : showClear ? (
        <Pressable
          onPress={() => onChangeText?.('')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('auth.clear')}
          style={styles.accessory}>
          <Ionicons name="close" size={21} color={authColors.ink} />
        </Pressable>
      ) : null}
    </View>
  );
});

export function FieldError({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <Text accessibilityLiveRegion="polite" style={styles.error}>
      {message}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
};

export function PrimaryButton({ label, onPress, disabled, loading }: PrimaryButtonProps) {
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.primary,
        { backgroundColor: disabled ? authColors.disabled : authColors.ink },
        pressed && styles.pressed,
      ]}>
      {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryLabel}>{label}</Text>}
    </Pressable>
  );
}

export function SocialButton({
  provider,
  onPress,
  loading,
  disabled,
}: {
  provider: SocialProvider;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const label = provider === 'apple' ? t('auth.continueWithApple') : t('auth.continueWithGoogle');
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: loading }}
      style={({ pressed }) => [styles.social, pressed && styles.pressed, disabled && !loading && { opacity: 0.5 }]}>
      <View style={styles.socialIcon}>
        {provider === 'apple' ? (
          <Ionicons name="logo-apple" size={21} color="#000000" />
        ) : (
          <Image source={require('@/assets/google-g.svg')} style={{ width: 19, height: 19 }} contentFit="contain" />
        )}
      </View>
      {loading ? <ActivityIndicator color={authColors.ink} /> : <Text style={styles.socialLabel}>{label}</Text>}
    </Pressable>
  );
}

export function TextLink({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={8} accessibilityRole="link" accessibilityLabel={label}>
      {({ pressed }) => (
        <Text style={[styles.link, (pressed || disabled) && { opacity: disabled ? 0.45 : 0.6 }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function OrDivider() {
  return (
    <View style={styles.divider} accessible={false}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerLabel}>{t('auth.or')}</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// One-time code
// ---------------------------------------------------------------------------

type CodeInputProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  invalid?: boolean;
  /** Change to replay the shake (e.g. an attempt counter). */
  shakeKey?: number;
  disabled?: boolean;
};

export function CodeInput({ value, onChange, length = 6, invalid, shakeKey = 0, disabled }: CodeInputProps) {
  const ref = useRef<TextInput>(null);
  // Starts focused (autoFocus) so the first box is lit on the first frame.
  const [focused, setFocused] = useState(true);
  const offset = useSharedValue(0);

  useEffect(() => {
    if (shakeKey === 0) return;
    offset.value = withSequence(
      withTiming(-9, { duration: 45 }),
      withRepeat(withTiming(9, { duration: 90 }), 3, true),
      withTiming(0, { duration: 45 }),
    );
  }, [shakeKey, offset]);

  const shake = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));
  const activeIndex = Math.min(value.length, length - 1);

  return (
    <Animated.View style={[styles.codeRow, shake]}>
      {Array.from({ length }, (_, index) => {
        const char = value[index];
        const active = focused && !disabled && index === activeIndex;
        return (
          <View
            key={index}
            style={[styles.codeBox, active && styles.codeBoxActive, invalid && !active && styles.inputInvalid]}>
            {char ? <Text style={styles.codeChar}>{char}</Text> : active ? <Caret /> : null}
          </View>
        );
      })}
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(next) => onChange(next.replace(/\D/g, '').slice(0, length))}
        maxLength={length}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        autoFocus
        editable={!disabled}
        caretHidden
        contextMenuHidden={false}
        selectionColor="transparent"
        accessibilityLabel={t('auth.codeLabel')}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.codeHiddenInput}
      />
    </Animated.View>
  );
}

function Caret() {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(withSequence(withTiming(1, { duration: 450 }), withTiming(0, { duration: 450 })), -1);
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.caret, style]} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  header: { height: 58, justifyContent: 'flex-end', paddingHorizontal: 14, paddingBottom: 4 },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 18, paddingTop: 10 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -0.4, color: authColors.ink },
  subtitle: { marginTop: 10, fontSize: 14, lineHeight: 20, color: authColors.muted },
  body: { marginTop: 24, gap: 18 },
  label: { marginBottom: 8, fontSize: 14, fontWeight: '600', color: authColors.ink },
  inputBox: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: authColors.border,
    backgroundColor: '#ffffff',
  },
  inputFocused: { borderColor: authColors.focus, borderWidth: 1.5, boxShadow: `0 0 0 3px ${authColors.focus}1A` },
  inputInvalid: { borderColor: authColors.danger },
  inputDisabled: { backgroundColor: authColors.field, borderColor: authColors.field },
  input: {
    flex: 1,
    minHeight: 42,
    paddingHorizontal: 13,
    fontSize: 15.5,
    color: authColors.ink,
  },
  accessory: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  error: { marginTop: -8, fontSize: 13.5, lineHeight: 19, color: authColors.danger },
  primary: {
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
  },
  primaryLabel: { fontSize: 15.5, fontWeight: '600', color: '#ffffff' },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.92 },
  social: {
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: authColors.border,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialIcon: { position: 'absolute', left: 20, top: 0, bottom: 0, justifyContent: 'center' },
  socialLabel: { fontSize: 15, fontWeight: '600', color: authColors.ink },
  link: { fontSize: 14, fontWeight: '500', color: authColors.focus },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: '#D5D9E2' },
  dividerLabel: { fontSize: 13.5, color: authColors.muted },
  codeRow: { flexDirection: 'row', justifyContent: 'center', gap: 7, paddingVertical: 4 },
  codeBox: {
    width: 36,
    height: 47,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: authColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  codeBoxActive: { borderColor: authColors.focus, borderWidth: 1.5 },
  codeChar: { fontSize: 20, fontWeight: '600', color: authColors.ink, fontVariant: ['tabular-nums'] },
  caret: { width: 1.5, height: 22, borderRadius: 1, backgroundColor: authColors.ink },
  codeHiddenInput: {
    ...StyleSheet.absoluteFill,
    color: 'transparent',
    opacity: 0.02,
    fontSize: 1,
  },
});
