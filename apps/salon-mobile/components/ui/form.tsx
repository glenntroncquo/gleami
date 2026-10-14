import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon, type AppIconName } from '@/components/app-icon';
import { Pressable } from '@/components/pressable-scale';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { Design } from '@/constants/theme';

import { useTheme } from './use-theme';

/**
 * Standard create/edit screen: large title, scrolling body, and an optional
 * footer pinned above the keyboard. With `closable`, the title and a close
 * button share one fixed top row; pair it with `useModalHeader()`, which hides
 * the native header so the two don't stack.
 */
export function FormScreen({
  title,
  subtitle,
  footer,
  children,
  contentStyle,
  closable,
  onClose,
}: {
  title?: string;
  subtitle?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  closable?: boolean;
  onClose?: () => void;
}) {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const showTopBar = closable || !!onClose;

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: theme.background }]}
      // iOS modals are inset cards with no status bar overlap; Android modals are full screen.
      edges={showTopBar && Platform.OS !== 'ios' ? ['top', 'left', 'right', 'bottom'] : ['left', 'right', 'bottom']}>
      {showTopBar ? (
        <View style={styles.topBar}>
          <View style={styles.flex}>{title ? <ScreenTitle title={title} subtitle={subtitle} /> : null}</View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            hitSlop={8}
            onPress={onClose ?? (() => router.back())}
            style={styles.closeButton}>
            <AppIcon name="close" size={26} color={theme.text} />
          </Pressable>
        </View>
      ) : null}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
        <ScreenScrollView contentContainerStyle={[styles.body, showTopBar && styles.bodyBelowTopBar, contentStyle]}>
          {title && !showTopBar ? <ScreenTitle title={title} subtitle={subtitle} /> : null}
          {children}
        </ScreenScrollView>
        {footer ? <FormFooter>{footer}</FormFooter> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.titleBlock}>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: theme.muted }]}>{subtitle}</Text> : null}
    </View>
  );
}

export function FormFooter({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return <View style={[styles.footer, { borderTopColor: theme.separator, backgroundColor: theme.background }]}>{children}</View>;
}

/** Label + control + helper/error text. */
export function Field({
  label,
  optional,
  helper,
  error,
  trailing,
  children,
  style,
}: {
  label?: string;
  optional?: string;
  helper?: string;
  error?: string | null;
  trailing?: React.ReactNode;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.field, style]}>
      {label ? (
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: theme.text }]}>
            {label}
            {optional ? <Text style={[styles.optional, { color: theme.muted }]}> {optional}</Text> : null}
          </Text>
          {trailing}
        </View>
      ) : null}
      {children}
      {error ? (
        <Text style={[styles.helper, { color: theme.error }]}>{error}</Text>
      ) : helper ? (
        <Text style={[styles.helper, { color: theme.muted }]}>{helper}</Text>
      ) : null}
    </View>
  );
}

export const TextField = React.forwardRef<
  TextInput,
  TextInputProps & { label?: string; optional?: string; helper?: string; error?: string | null; containerStyle?: StyleProp<ViewStyle> }
>(function TextField({ label, optional, helper, error, containerStyle, style, multiline, ...input }, ref) {
  const theme = useTheme();
  const [focused, setFocused] = React.useState(false);
  return (
    <Field label={label} optional={optional} helper={helper} error={error} style={containerStyle}>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor={theme.muted}
        multiline={multiline}
        {...input}
        onFocus={(e) => { setFocused(true); input.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); input.onBlur?.(e); }}
        style={[
          styles.control,
          styles.input,
          multiline && styles.multiline,
          { color: theme.text, backgroundColor: theme.field, borderColor: error ? theme.error : focused ? theme.focus : theme.border },
          style,
        ]}
      />
    </Field>
  );
});

/** Tappable field that opens a picker (date, time, list sheet). */
export function SelectField({
  label,
  optional,
  value,
  placeholder,
  onPress,
  leading,
  icon = 'expandMore',
  helper,
  error,
  disabled,
  style,
}: {
  label?: string;
  optional?: string;
  value?: string | null;
  placeholder?: string;
  onPress: () => void;
  leading?: React.ReactNode;
  icon?: AppIconName;
  helper?: string;
  error?: string | null;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <Field label={label} optional={optional} helper={helper} error={error} style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}: ${value ?? placeholder ?? ''}` : undefined}
        disabled={disabled}
        onPress={onPress}
        style={[styles.control, styles.select, { backgroundColor: theme.field, borderColor: error ? theme.error : theme.border, opacity: disabled ? 0.5 : 1 }]}>
        {leading}
        <Text style={[styles.selectText, { color: value ? theme.text : theme.muted }]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <AppIcon name={icon} size={16} color={theme.muted} />
      </Pressable>
    </Field>
  );
}

export function FieldRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.fieldRow}>{React.Children.map(children, (child) => <View style={styles.flex}>{child}</View>)}</View>;
}

export function ErrorBanner({ message }: { message?: string | null }) {
  const theme = useTheme();
  if (!message) return null;
  return (
    <View accessibilityRole="alert" style={[styles.banner, { backgroundColor: theme.errorSurface }]}>
      <AppIcon name="eventBusy" size={16} color={theme.error} />
      <Text style={[styles.bannerText, { color: theme.error }]}>{message}</Text>
    </View>
  );
}

/** Selectable card used for presets and type choices (horizontal rows or grids). */
export function OptionCard({
  title,
  subtitle,
  icon,
  selected,
  onPress,
  style,
}: {
  title: string;
  subtitle?: string;
  icon?: AppIconName;
  selected?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={[
        styles.option,
        { backgroundColor: selected ? theme.blueTint : theme.background, borderColor: selected ? theme.brandBlue : theme.border, borderWidth: 1.5, padding: 14 },
        style,
      ]}>
      {icon ? <AppIcon name={icon} size={24} color={selected ? theme.brandBlue : theme.text} /> : null}
      <Text style={[styles.optionTitle, { color: theme.text }]} numberOfLines={1}>{title}</Text>
      {subtitle ? <Text style={[styles.optionSubtitle, { color: theme.muted }]} numberOfLines={1}>{subtitle}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { paddingHorizontal: Design.screenPadding, paddingTop: 4, paddingBottom: 32, gap: 22 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Design.screenPadding, paddingTop: 20, paddingBottom: 12 },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  bodyBelowTopBar: { paddingTop: 8 },
  titleBlock: { gap: 4 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '600', letterSpacing: -0.4 },
  subtitle: { fontSize: 15, lineHeight: 21 },
  footer: { paddingHorizontal: Design.screenPadding, paddingTop: 12, paddingBottom: 8, borderTopWidth: StyleSheet.hairlineWidth, gap: 10 },
  field: { gap: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 14, fontWeight: '600' },
  optional: { fontWeight: '400' },
  helper: { fontSize: 12, lineHeight: 16 },
  control: { minHeight: 50, borderWidth: 1, borderRadius: Design.controlRadius, paddingHorizontal: 14 },
  input: { fontSize: 16, paddingVertical: 12 },
  multiline: { minHeight: 100, textAlignVertical: 'top', paddingTop: 14 },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 10 },
  selectText: { flex: 1, fontSize: 16 },
  fieldRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: Design.controlRadius },
  bannerText: { flex: 1, fontSize: 13, fontWeight: '600' },
  option: { width: 140, borderRadius: Design.cardRadius, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', gap: 8 },
  optionTitle: { fontSize: 15, fontWeight: '600', marginTop: 4 },
  optionSubtitle: { fontSize: 12 },
});
