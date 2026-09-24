import { Pressable } from '@/components/pressable-scale';
import { AppIcon } from '@/components/app-icon';
import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Design } from '@/constants/theme';
import type { ProductTaxonomyRow } from '@/lib/api/products';

type Props = {
  options: ProductTaxonomyRow[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  noneLabel: string;
  theme: typeof Colors.light;
  createLabel?: string;
  createPlaceholder?: string;
  onCreate?: (name: string) => Promise<ProductTaxonomyRow>;
};

/**
 * Horizontal chip row for picking (or creating) a product category/line —
 * the app has no native select dependency, so this mirrors the existing
 * color-swatch chip pattern in app/services/new.tsx instead of introducing one.
 */
export function TaxonomyChipPicker({
  options,
  selectedId,
  onSelect,
  noneLabel,
  theme,
  createLabel,
  createPlaceholder,
  onCreate,
}: Props) {
  const styles = createStyles(theme);
  const [adding, setAdding] = React.useState(false);
  const [draftName, setDraftName] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const handleCreate = async () => {
    const trimmed = draftName.trim();
    if (!trimmed || !onCreate) return;
    setSaving(true);
    try {
      const created = await onCreate(trimmed);
      onSelect(created.id);
      setDraftName('');
      setAdding(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <Pressable
          style={[styles.chip, selectedId === null && styles.chipSelected]}
          onPress={() => onSelect(null)}>
          <Text style={[styles.chipText, selectedId === null && styles.chipTextSelected]}>{noneLabel}</Text>
        </Pressable>
        {options.map((option) => {
          const isSelected = selectedId === option.id;
          return (
            <Pressable
              key={option.id}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => onSelect(option.id)}>
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {option.name || noneLabel}
              </Text>
            </Pressable>
          );
        })}
        {onCreate ? (
          <Pressable style={[styles.chip, styles.addChip]} onPress={() => setAdding(true)}>
            <AppIcon name="add" size={14} color={theme.text} />
            <Text style={styles.chipText}>{createLabel}</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {adding ? (
        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            placeholder={createPlaceholder}
            placeholderTextColor={theme.muted}
            value={draftName}
            onChangeText={setDraftName}
            autoFocus
            onSubmitEditing={handleCreate}
          />
          <Pressable style={styles.addConfirm} onPress={handleCreate} disabled={saving || !draftName.trim()}>
            <AppIcon name="check" size={18} color={theme.text} />
          </Pressable>
          <Pressable
            style={styles.addConfirm}
            onPress={() => {
              setAdding(false);
              setDraftName('');
            }}>
            <AppIcon name="close" size={18} color={theme.muted} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: 8,
      paddingVertical: 2,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      minHeight: Design.touchTarget,
      paddingHorizontal: 14,
      justifyContent: 'center',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.border,
    },
    chipSelected: {
      backgroundColor: theme.tint,
      borderColor: theme.tint,
    },
    addChip: {
      borderStyle: 'dashed',
    },
    chipText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    chipTextSelected: {
      color: theme.onTint,
    },
    addRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 8,
    },
    addInput: {
      flex: 1,
      minHeight: Design.touchTarget,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      fontSize: 14,
      color: theme.text,
    },
    addConfirm: {
      width: Design.touchTarget,
      height: Design.touchTarget,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
