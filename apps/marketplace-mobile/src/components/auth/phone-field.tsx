import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { FlatList, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthInput, authColors } from '@/src/components/auth/auth-ui';
import { t } from '@/src/i18n';

export type Country = { iso: string; name: string; dial: string; flag: string };

export const COUNTRIES: Country[] = [
  { iso: 'BE', name: 'België', dial: '+32', flag: '🇧🇪' },
  { iso: 'NL', name: 'Nederland', dial: '+31', flag: '🇳🇱' },
  { iso: 'FR', name: 'Frankrijk', dial: '+33', flag: '🇫🇷' },
  { iso: 'LU', name: 'Luxemburg', dial: '+352', flag: '🇱🇺' },
  { iso: 'DE', name: 'Duitsland', dial: '+49', flag: '🇩🇪' },
  { iso: 'GB', name: 'Verenigd Koninkrijk', dial: '+44', flag: '🇬🇧' },
  { iso: 'ES', name: 'Spanje', dial: '+34', flag: '🇪🇸' },
  { iso: 'IT', name: 'Italië', dial: '+39', flag: '🇮🇹' },
  { iso: 'PT', name: 'Portugal', dial: '+351', flag: '🇵🇹' },
  { iso: 'CH', name: 'Zwitserland', dial: '+41', flag: '🇨🇭' },
  { iso: 'MA', name: 'Marokko', dial: '+212', flag: '🇲🇦' },
  { iso: 'TR', name: 'Turkije', dial: '+90', flag: '🇹🇷' },
];

/** National digits without trunk zero, e.g. "0496 05 43 89" → "496054389". */
export function nationalDigits(value: string): string {
  return value.replace(/\D/g, '').replace(/^0+/, '');
}

/** E.164 or null when the national part is implausible. */
export function toE164(country: Country, value: string): string | null {
  const digits = nationalDigits(value);
  if (country.iso === 'BE' ? digits.length !== 9 : digits.length < 6 || digits.length > 12) return null;
  return `${country.dial}${digits}`;
}

/** Splits a stored E.164 number back into country + national part. */
export function fromE164(phone: string): { country: Country; national: string } {
  const match = [...COUNTRIES]
    .sort((a, b) => b.dial.length - a.dial.length)
    .find((country) => phone.startsWith(country.dial));
  return match
    ? { country: match, national: phone.slice(match.dial.length) }
    : { country: COUNTRIES[0], national: phone.replace(/^\+/, '') };
}

type PhoneFieldProps = {
  label: string;
  country: Country;
  onCountryChange: (country: Country) => void;
  value: string;
  onChangeText: (value: string) => void;
  invalid?: boolean;
  onSubmitEditing?: () => void;
};

export function PhoneField({ label, country, onCountryChange, value, onChangeText, invalid, onSubmitEditing }: PhoneFieldProps) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t('auth.countryCode', { code: country.dial })}
          accessibilityHint={t('auth.chooseCountry')}
          style={({ pressed }) => [styles.country, pressed && { backgroundColor: '#F7F8FC' }]}>
          <Text style={styles.countryDial}>{country.dial}</Text>
          <Ionicons name="chevron-down" size={15} color={authColors.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AuthInput
            value={value}
            onChangeText={(next) => onChangeText(next.replace(/[^\d\s]/g, ''))}
            accessibilityLabel={label}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel-national"
            clearable
            invalid={invalid}
            returnKeyType="done"
            onSubmitEditing={onSubmitEditing}
          />
        </View>
      </View>
      <CountrySheet
        visible={open}
        selected={country}
        onClose={() => setOpen(false)}
        onSelect={(next) => {
          void Haptics.selectionAsync();
          onCountryChange(next);
          setOpen(false);
        }}
      />
    </View>
  );
}

function CountrySheet({
  visible,
  selected,
  onClose,
  onSelect,
}: {
  visible: boolean;
  selected: Country;
  onClose: () => void;
  onSelect: (country: Country) => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}>
      <View style={[styles.sheet, { paddingTop: Platform.OS === 'ios' ? 0 : insets.top }]}>
        <View style={styles.sheetHeader}>
          <Text accessibilityRole="header" style={styles.sheetTitle}>
            {t('auth.chooseCountry')}
          </Text>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('auth.close')}
            style={styles.sheetClose}>
            <Ionicons name="close" size={24} color={authColors.ink} />
          </Pressable>
        </View>
        <FlatList
          data={COUNTRIES}
          keyExtractor={(item) => item.iso}
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 24 }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => {
            const active = item.iso === selected.iso;
            return (
              <Pressable
                onPress={() => onSelect(item)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${item.name} ${item.dial}`}
                style={({ pressed }) => [styles.countryRow, pressed && { opacity: 0.6 }]}>
                <Text style={styles.flag}>{item.flag}</Text>
                <Text style={styles.countryName}>{item.name}</Text>
                <Text style={styles.countryRowDial}>{item.dial}</Text>
                <View style={{ width: 24, alignItems: 'flex-end' }}>
                  {active ? <Ionicons name="checkmark" size={20} color={authColors.focus} /> : null}
                </View>
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: 8, fontSize: 14, fontWeight: '600', color: authColors.ink },
  row: { flexDirection: 'row', gap: 6 },
  country: {
    width: 76,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: authColors.border,
  },
  countryDial: { fontSize: 15.5, color: authColors.ink },
  sheet: { flex: 1, backgroundColor: '#ffffff' },
  sheetHeader: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 18,
    paddingRight: 8,
  },
  sheetTitle: { fontSize: 19, fontWeight: '700', color: authColors.ink, letterSpacing: -0.3 },
  sheetClose: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: authColors.border },
  countryRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 12 },
  flag: { fontSize: 22 },
  countryName: { flex: 1, fontSize: 15.5, color: authColors.ink },
  countryRowDial: { fontSize: 15, color: authColors.muted, fontVariant: ['tabular-nums'] },
});
