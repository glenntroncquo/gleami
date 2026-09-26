import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DEFAULT_RADIUS_KM } from '@/src/config';
import { useCategories } from '@/src/hooks/use-marketplace';
import { useDiscovery } from '@/src/store/discovery';
import { brandColors as colors } from '@/src/theme/colors';

/** Mounted afresh on each opening: closing discards the draft. */
export function DiscoveryFilters({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const selected = useDiscovery((state) => state.categoryIds);
  const radius = useDiscovery((state) => state.radiusKm);
  const bbox = useDiscovery((state) => state.bbox);
  const apply = useDiscovery((state) => state.setFilters);
  const [categoryIds, setCategoryIds] = useState(selected);
  const [distance, setDistance] = useState(radius);
  const categories = useCategories();
  const toggleCategory = (id: string) => setCategoryIds((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);

  // A page sheet so iOS gives the same swipe-down dismiss as the auth flow.
  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      statusBarTranslucent>
      <View style={styles.overlay}>
        <View accessibilityViewIsModal style={[styles.sheet, { marginTop: Platform.OS === 'ios' ? 0 : insets.top }]}>
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={styles.title}>Filters</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Sluit filters" onPress={onClose} style={styles.close}>
              <Ionicons name="close" size={28} color={colors.navy} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.salonLabel}><Ionicons name="storefront-outline" size={20} color={colors.navy} /><Text style={styles.label}>Salons en behandelingen</Text></View>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Zoekafstand</Text>
            <View style={styles.distances}>
              {[5, 15, DEFAULT_RADIUS_KM].map((km) => <Pressable key={km} accessibilityRole="radio" accessibilityState={{ checked: distance === km }} onPress={() => setDistance(km)} style={[styles.distance, distance === km && styles.selected]}>
                <Ionicons name="location-outline" size={26} color={distance === km ? colors.blue : colors.navy} />
                <Text style={[styles.label, distance === km && styles.selectedText]}>{km} km</Text>
              </Pressable>)}
            </View>
            <Text style={styles.hint}>{bbox && distance === radius ? 'Je zoekt in het huidige kaartgebied. Kies een afstand om rond je zoeklocatie te zoeken.' : `Zoeken binnen ${distance ?? DEFAULT_RADIUS_KM} km van je zoeklocatie.`}</Text>
            <View style={styles.divider} />
            <Text accessibilityRole="header" style={styles.sectionTitle}>Behandelingen</Text>
            <View style={styles.chips}>
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: categoryIds.length === 0 }} onPress={() => setCategoryIds([])} style={[styles.chip, categoryIds.length === 0 && styles.selected]}><Text style={[styles.chipText, categoryIds.length === 0 && styles.selectedText]}>Alle behandelingen</Text></Pressable>
              {categories.data?.map((category) => <Pressable key={category.id} accessibilityRole="checkbox" accessibilityState={{ checked: categoryIds.includes(category.id) }} onPress={() => toggleCategory(category.id)} style={[styles.chip, categoryIds.includes(category.id) && styles.selected]}>
                <Text style={[styles.chipText, categoryIds.includes(category.id) && styles.selectedText]}>{category.name}</Text>
              </Pressable>)}
            </View>
            {categories.isLoading ? <Text style={styles.hint}>Behandelingen laden…</Text> : null}
            {categories.isError ? <Pressable onPress={() => void categories.refetch()} accessibilityRole="button"><Text style={styles.hint}>Behandelingen laden lukt niet. Tik om opnieuw te proberen.</Text></Pressable> : null}
          </ScrollView>
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <Pressable accessibilityRole="button" onPress={() => { setCategoryIds([]); setDistance(DEFAULT_RADIUS_KM); }} style={styles.reset}><Text style={styles.buttonLabel}>Alles wissen</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => { apply(categoryIds, distance); onClose(); }} style={styles.apply}><Text style={[styles.buttonLabel, { color: '#fff' }]}>Toepassen</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#fff', justifyContent: 'flex-end' },
  sheet: { flex: 1, backgroundColor: '#fff', overflow: 'hidden' },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 12 },
  title: { fontSize: 23, fontWeight: '700', color: colors.navy },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingTop: 8, paddingBottom: 32 },
  salonLabel: { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: colors.surface, padding: 14, marginBottom: 28 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.navy, marginBottom: 20 },
  distances: { flexDirection: 'row', gap: 12 },
  distance: { flex: 1, minHeight: 112, gap: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.line, borderRadius: 20 },
  selected: { borderColor: colors.blue, backgroundColor: colors.blueTint },
  selectedText: { color: colors.blue },
  label: { fontSize: 16, color: colors.navy, fontWeight: '500' },
  hint: { fontSize: 13, lineHeight: 20, color: colors.muted, marginTop: 16 },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 28 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, borderWidth: 1.5, borderColor: colors.line },
  chipText: { fontSize: 14, color: colors.navy },
  footer: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: '#fff' },
  reset: { flex: 1, minHeight: 52, borderRadius: 28, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  apply: { flex: 1, minHeight: 52, borderRadius: 28, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  buttonLabel: { color: colors.navy, fontSize: 15, fontWeight: '600' },
});
