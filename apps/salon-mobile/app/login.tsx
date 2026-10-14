import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dimensions,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoadingDots } from '@/components/loading-dots';
import { Pressable } from '@/components/pressable-scale';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  beginResendCooldown,
  completeSessionFromUrl,
  isAuthCallbackUrl,
  isUnconfirmedEmailError,
  isValidEmail,
  lookupAuthEmail,
  normalizeEmail,
  resendSecondsLeft,
  signInWithSocial,
  startEmailAuth,
} from '@/lib/auth/salon-login';
import { supabase } from '@/lib/supabase';

type Step = 'email' | 'password' | 'verify' | 'resetSent';
type Busy = 'email' | 'password' | 'verify' | 'resend' | 'reset' | 'google' | 'apple' | null;

export default function LoginScreen() {
  const { t } = useTranslation();
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme];
  const dark = scheme === 'dark';
  const scrollRef = useRef<ScrollView>(null);
  const buttonRef = useRef<View>(null);
  const scrollY = useRef(0);
  const keyboardHeight = useRef(0);

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [verificationKind, setVerificationKind] = useState<'signup' | 'signin'>('signup');
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [focused, setFocused] = useState(false);
  const [keyboardPad, setKeyboardPad] = useState(0);

  const address = normalizeEmail(email);
  const primaryLabel =
    step === 'verify' ? t('auth.verifyCode') : step === 'password' ? (creatingAccount ? t('auth.createAccount') : t('auth.signIn')) : t('auth.continue');
  const title =
    step === 'verify'
      ? t('auth.checkEmailTitle')
      : step === 'resetSent'
        ? t('auth.resetSentTitle')
        : step === 'password'
          ? creatingAccount
            ? t('auth.createPasswordTitle')
            : t('auth.passwordTitle')
          : t('auth.startTitle');
  const subtitle =
    step === 'verify'
      ? t('auth.checkEmailBody', { email: address })
      : step === 'resetSent'
        ? t('auth.resetSentBody', { email: address })
        : step === 'password'
          ? creatingAccount
            ? t('auth.createPasswordBody')
            : t('auth.passwordBody', { email: address })
          : t('auth.startBody');

  const revealButton = () => {
    requestAnimationFrame(() => {
      buttonRef.current?.measureInWindow((_x, y, _width, height) => {
        const keyboardTop = keyboardHeight.current
          ? Dimensions.get('window').height - keyboardHeight.current
          : Dimensions.get('window').height;
        const overlap = y + height + 16 - keyboardTop;
        if (overlap > 0) {
          scrollRef.current?.scrollTo({ y: scrollY.current + overlap, animated: true });
        }
      });
    });
  };

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (event) => {
      keyboardHeight.current = event.endCoordinates.height;
      setKeyboardPad(event.endCoordinates.height);
      setTimeout(revealButton, 80);
    });
    const hide = Keyboard.addListener(hideEvent, () => {
      keyboardHeight.current = 0;
      setKeyboardPad(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [step]);

  useEffect(() => {
    if (step !== 'verify') return;
    let alive = true;
    const tick = () => {
      void resendSecondsLeft(address).then((seconds) => {
        if (alive) setResendSeconds(seconds);
      });
    };
    tick();
    const timer = setInterval(tick, 500);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [step, address]);

  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (!isAuthCallbackUrl(url)) return;
      void completeSessionFromUrl(url).catch((cause) => {
        setError(cause instanceof Error ? cause.message : t('auth.genericError'));
      });
    });
    return () => subscription.remove();
  }, [t]);

  const fail = (cause: unknown) => {
    const message = cause instanceof Error ? cause.message : t('auth.genericError');
    setError(message.toLowerCase().includes('invalid login credentials') ? t('auth.invalidCredentials') : message);
  };

  const openVerify = async (kind: 'signup' | 'signin') => {
    setVerificationKind(kind);
    if (kind === 'signin') await startEmailAuth(address);
    await beginResendCooldown(address);
    setOtp('');
    setStep('verify');
  };

  const submitEmail = async () => {
    if (busy) return;
    if (!isValidEmail(email)) {
      setError(t('auth.invalidEmail'));
      return;
    }
    setError(null);
    setBusy('email');
    try {
      const account = await lookupAuthEmail(address);
      if (account.exists && !account.hasPassword) {
        await openVerify('signin');
      } else {
        setCreatingAccount(!account.exists);
        setPassword('');
        setStep('password');
      }
    } catch (cause) {
      fail(cause);
    } finally {
      setBusy(null);
    }
  };

  const submitPassword = async () => {
    if (busy) return;
    if (creatingAccount && password.length < 8) {
      setError(t('auth.passwordMinLength'));
      return;
    }
    if (!password) {
      setError(t('auth.invalidCredentials'));
      return;
    }
    setError(null);
    setBusy('password');
    try {
      if (creatingAccount) {
        const { data, error: signUpError } = await supabase.auth.signUp({ email: address, password });
        if (signUpError) throw signUpError;
        if (data.session && data.user?.email_confirmed_at) return;
        if (data.session) await supabase.auth.signOut();
        await openVerify('signup');
        return;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: address, password });
      if (signInError) {
        if (isUnconfirmedEmailError(signInError)) {
          setError(t('auth.emailNotConfirmed'));
          await openVerify('signup');
          return;
        }
        throw signInError;
      }
      if (data.session && !data.user.email_confirmed_at) {
        await supabase.auth.signOut();
        setError(t('auth.emailNotConfirmed'));
        await openVerify('signup');
      }
    } catch (cause) {
      fail(cause);
    } finally {
      const { data } = await supabase.auth.getSession();
      if (!data.session) setBusy(null);
    }
  };

  const submitCode = async () => {
    if (busy || otp.length !== 6) return;
    setError(null);
    setBusy('verify');
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: address,
        token: otp,
        type: verificationKind === 'signup' ? 'signup' : 'email',
      });
      if (verifyError) throw verifyError;
      if (!data.user) throw new Error(t('auth.genericError'));
    } catch (cause) {
      fail(cause);
    } finally {
      const { data } = await supabase.auth.getSession();
      if (!data.session) setBusy(null);
    }
  };

  const resend = async () => {
    if (busy || resendSeconds > 0) return;
    setError(null);
    setBusy('resend');
    try {
      if (verificationKind === 'signup') {
        const { error: resendError } = await supabase.auth.resend({ type: 'signup', email: address });
        if (resendError) throw resendError;
      } else {
        await startEmailAuth(address);
      }
      await beginResendCooldown(address);
      setNotice(t('auth.codeSent'));
      setResendSeconds(60);
    } catch (cause) {
      fail(cause);
    } finally {
      setBusy(null);
    }
  };

  const forgot = async () => {
    if (busy) return;
    setError(null);
    setBusy('reset');
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(address);
      if (resetError) throw resetError;
      setStep('resetSent');
    } catch (cause) {
      fail(cause);
    } finally {
      setBusy(null);
    }
  };

  const social = async (provider: 'google' | 'apple') => {
    if (busy) return;
    setError(null);
    setBusy(provider);
    try {
      await signInWithSocial(provider);
    } catch (cause) {
      fail(cause);
    } finally {
      const { data } = await supabase.auth.getSession();
      if (!data.session) setBusy(null);
    }
  };

  const backToEmail = () => {
    setStep('email');
    setPassword('');
    setOtp('');
    setError(null);
    setNotice(null);
  };

  const buttonBusy = busy === 'email' || busy === 'password' || busy === 'verify';
  const primaryDisabled = buttonBusy || (step === 'verify' && otp.length !== 6);
  const ink = theme.text;
  const muted = theme.muted;
  const line = theme.border;
  const fieldBorder = focused ? theme.focus : line;
  const buttonBg = theme.text;
  const buttonText = theme.background;
  const linkColor = theme.tint;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          onScroll={(event) => {
            scrollY.current = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          contentContainerStyle={[styles.content, { paddingBottom: 28 + keyboardPad }]}>
          <View style={styles.header}>
            {step === 'email' ? (
              <View style={styles.headerButton} />
            ) : (
              <Pressable accessibilityRole="button" accessibilityLabel={t('auth.back')} hitSlop={12} onPress={backToEmail} style={styles.headerButton}>
                <Ionicons name="chevron-back" size={28} color={ink} />
              </Pressable>
            )}
          </View>

          <Image
            source={dark
              ? require('@/assets/images/gleami-wordmark-white.svg')
              : require('@/assets/images/gleami-wordmark.svg')}
            style={styles.logo}
            contentFit="contain"
            accessibilityLabel="Gleami"
            accessible
          />

          {step === 'email' ? null : <Text style={[styles.title, { color: ink }]}>{title}</Text>}
          <Text style={[styles.subtitle, { color: muted }]}>{subtitle}</Text>

          {step === 'email' ? (
            <Field
              label={t('auth.email')}
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                if (error) setError(null);
              }}
              placeholder={t('auth.email')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() => void submitEmail()}
              onFocus={() => {
                setFocused(true);
                revealButton();
              }}
              onBlur={() => setFocused(false)}
              ink={ink}
              muted={muted}
              border={fieldBorder}
              background={theme.field}
            />
          ) : null}

          {step === 'password' ? (
            <>
              <Field
                label={t('auth.password')}
                hint={creatingAccount ? t('auth.passwordMinLength') : undefined}
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  if (error) setError(null);
                }}
                placeholder={t('auth.password')}
                secureTextEntry={!revealed}
                autoCapitalize="none"
                autoFocus
                textContentType={creatingAccount ? 'newPassword' : 'password'}
                autoComplete={creatingAccount ? 'password-new' : 'password'}
                returnKeyType="go"
                onSubmitEditing={() => void submitPassword()}
                onFocus={() => {
                  setFocused(true);
                  revealButton();
                }}
                onBlur={() => setFocused(false)}
                ink={ink}
                muted={muted}
                border={fieldBorder}
                background={theme.field}
                accessory={
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={revealed ? t('auth.hidePassword') : t('auth.showPassword')}
                    hitSlop={8}
                    onPress={() => setRevealed((current) => !current)}
                    style={styles.accessory}>
                    <Ionicons name={revealed ? 'eye-off-outline' : 'eye-outline'} size={22} color={ink} />
                  </Pressable>
                }
              />
              {creatingAccount ? null : (
                <Pressable accessibilityRole="link" onPress={() => void forgot()} style={styles.linkWrap}>
                  <Text style={[styles.link, { color: linkColor }]}>{t('auth.forgotPassword')}</Text>
                </Pressable>
              )}
            </>
          ) : null}

          {step === 'verify' ? (
            <Field
              label={t('auth.codeLabel')}
              hint={t('auth.checkEmailHint')}
              value={otp}
              onChangeText={(value) => {
                setOtp(value.replace(/\D/g, '').slice(0, 6));
                if (error) setError(null);
              }}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              autoFocus
              maxLength={6}
              onFocus={() => {
                setFocused(true);
                revealButton();
              }}
              onBlur={() => setFocused(false)}
              ink={ink}
              muted={muted}
              border={fieldBorder}
              background={theme.field}
              center
            />
          ) : null}

          {error ? <Text style={[styles.error, { color: theme.error }]}>{error}</Text> : null}
          {notice ? <Text style={[styles.notice, { color: muted }]}>{notice}</Text> : null}

          {step === 'resetSent' ? null : (
            <View ref={buttonRef} collapsable={false}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ busy: buttonBusy, disabled: primaryDisabled }}
                disabled={primaryDisabled}
                onPress={() => {
                  if (step === 'email') void submitEmail();
                  else if (step === 'password') void submitPassword();
                  else void submitCode();
                }}
                style={[styles.primary, { backgroundColor: buttonBg, opacity: primaryDisabled && !buttonBusy ? 0.45 : 1 }]}>
                {buttonBusy ? <LoadingDots color={buttonText} /> : <Text style={[styles.primaryLabel, { color: buttonText }]}>{primaryLabel}</Text>}
              </Pressable>
            </View>
          )}

          {step === 'email' ? (
            <>
              <View style={styles.divider}>
                <View style={[styles.dividerLine, { backgroundColor: line }]} />
                <Text style={[styles.dividerLabel, { color: muted }]}>{t('auth.or')}</Text>
                <View style={[styles.dividerLine, { backgroundColor: line }]} />
              </View>
              <SocialButton
                label={t('auth.continueGoogle')}
                loading={busy === 'google'}
                ink={ink}
                border={line}
                background={theme.secondary}
                onPress={() => void social('google')}
                icon={<Image source={require('@/assets/images/google-g.svg')} style={styles.google} contentFit="contain" />}
              />
              <SocialButton
                label={t('auth.continueApple')}
                loading={busy === 'apple'}
                ink={ink}
                border={line}
                background={theme.secondary}
                onPress={() => void social('apple')}
                icon={<Ionicons name="logo-apple" size={22} color={ink} />}
              />
            </>
          ) : null}

          {step === 'verify' ? (
            <Pressable accessibilityRole="button" disabled={busy === 'resend' || resendSeconds > 0} onPress={() => void resend()} style={styles.linkWrap}>
              <Text style={[styles.link, { color: linkColor }, (busy === 'resend' || resendSeconds > 0) && { opacity: 0.55 }]}>
                {resendSeconds > 0 ? t('auth.resendIn', { seconds: resendSeconds }) : t('auth.resendEmail')}
              </Text>
            </Pressable>
          ) : null}

          {step !== 'email' ? (
            <Pressable accessibilityRole="button" onPress={backToEmail} style={styles.linkWrap}>
              <Text style={[styles.quietLink, { color: muted }]}>{t('auth.changeEmail')}</Text>
            </Pressable>
          ) : null}
        </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  hint,
  accessory,
  ink,
  muted,
  border,
  background,
  center,
  ...input
}: React.ComponentProps<typeof TextInput> & {
  label: string;
  hint?: string;
  accessory?: React.ReactNode;
  ink: string;
  muted: string;
  border: string;
  background: string;
  center?: boolean;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={[styles.label, { color: ink }]}>{label}</Text>
      <View style={[styles.inputBox, { borderColor: border, backgroundColor: background }]}>
        <TextInput
          {...input}
          placeholderTextColor={muted}
          autoCorrect={false}
          style={[styles.input, { color: ink }, center && styles.codeInput, accessory ? { paddingRight: 8 } : null]}
        />
        {accessory}
      </View>
      {hint ? <Text style={[styles.hint, { color: muted }]}>{hint}</Text> : null}
    </View>
  );
}

function SocialButton({
  label,
  loading,
  ink,
  border,
  background,
  onPress,
  icon,
}: {
  label: string;
  loading: boolean;
  ink: string;
  border: string;
  background: string;
  onPress: () => void;
  icon: React.ReactNode;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ busy: loading }} onPress={onPress} style={[styles.social, { borderColor: border, backgroundColor: background }]}>
      {loading ? (
        <LoadingDots color={ink} />
      ) : (
        <>
          <View style={styles.socialIcon}>{icon}</View>
          <Text style={[styles.socialLabel, { color: ink }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  header: { height: 48, justifyContent: 'center' },
  headerButton: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  logo: {
    width: 168,
    height: 48,
    alignSelf: 'center',
    marginTop: 28,
    marginBottom: 8,
  },
  title: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 22,
  },
  fieldBlock: { marginTop: 28 },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  inputBox: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: 54,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 22,
    letterSpacing: 8,
    fontVariant: ['tabular-nums'],
  },
  accessory: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  hint: { marginTop: 8, fontSize: 13, lineHeight: 18 },
  error: { marginTop: 12, fontSize: 14, lineHeight: 20 },
  notice: { marginTop: 12, textAlign: 'center', fontSize: 14 },
  primary: {
    marginTop: 22,
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: { fontSize: 17, fontWeight: '600' },
  divider: { marginTop: 28, marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerLabel: { fontSize: 13, letterSpacing: 1 },
  social: {
    height: 56,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  socialIcon: { position: 'absolute', left: 22 },
  socialLabel: { fontSize: 16, fontWeight: '600' },
  google: { width: 22, height: 22 },
  linkWrap: { alignSelf: 'center', marginTop: 16, minHeight: 32, justifyContent: 'center' },
  link: { fontSize: 15, fontWeight: '600' },
  quietLink: { fontSize: 15 },
});
