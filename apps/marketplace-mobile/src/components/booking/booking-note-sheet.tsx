import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/src/components/auth/auth-ui';
import { t } from '@/src/i18n';
import { brandColors } from '@/src/theme/colors';

export function BookingNoteSheet({ value, onSave, onClose }: {
  value: string;
  onSave: (value: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  return (
    <Modal animationType={reduceMotion ? 'none' : 'slide'} presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView className="flex-1 bg-canvas" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View accessibilityViewIsModal className="flex-1" style={{ paddingTop: Platform.OS === 'ios' ? 12 : insets.top }}>
          <View className="flex-row justify-end px-4">
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('booking.close')}
              className="h-11 w-11 items-center justify-center active:opacity-60">
              <Ionicons name="close" size={24} color={brandColors.navy} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24 }}>
            <Text accessibilityRole="header" className="text-2xl font-bold tracking-tight text-ink">{t('booking.notes')}</Text>
            <Text className="mt-2 text-base text-muted">{t('booking.noteBody')}</Text>
            <TextInput value={draft} onChangeText={setDraft} multiline autoFocus
              accessibilityLabel={t('booking.notes')} placeholder={t('booking.notesHint')}
              placeholderTextColor={brandColors.muted} textAlignVertical="top"
              className="mt-6 rounded-2xl border border-line bg-surface p-4 text-base text-ink"
              style={{ minHeight: 160 }} />
          </ScrollView>
          <View className="px-6 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 20) }}>
            <PrimaryButton label={t('booking.saveNote')} onPress={() => onSave(draft.trim())} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
