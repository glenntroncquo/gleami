import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { Pressable } from '@/components/pressable-scale';
import { StaffAvatar } from '@/components/staff-avatar';
import { Colors } from '@/constants/theme';
import { useLocation } from '@/contexts/location-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

const THUMB_SIZE = 20;

export function SalonSelector() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = createStyles(theme);
  const { locations, locationId, showLocationPicker, setLocationId } = useLocation();

  if (!showLocationPicker) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {locations.map((location) => {
        const isSelected = location.id === locationId;
        return (
          <Pressable
            key={location.id}
            style={[styles.chip, isSelected ? styles.chipSelected : styles.chipUnselected]}
            onPress={() => setLocationId(location.id)}>
            <StaffAvatar
              imagePath={location.image_url}
              name={location.name}
              size={THUMB_SIZE}
              backgroundColor={isSelected ? theme.onTint : theme.border}
              textColor={isSelected ? theme.tint : theme.muted}
              fontSize={9}
            />
            <Text style={[styles.label, isSelected ? styles.labelSelected : styles.labelUnselected]} numberOfLines={1}>
              {location.name}
            </Text>
            {isSelected ? <AppIcon name="check" size={13} color={theme.onTint} /> : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const createStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: 8,
      paddingTop: 10,
      paddingBottom: 10,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingLeft: 6,
      paddingRight: 10,
      minHeight: 44,
      borderRadius: 10,
      borderWidth: 1,
    },
    chipSelected: {
      backgroundColor: theme.tint,
      borderColor: theme.tint,
    },
    chipUnselected: {
      backgroundColor: theme.background,
      borderColor: theme.border,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
    },
    labelSelected: {
      color: theme.onTint,
    },
    labelUnselected: {
      color: theme.text,
    },
  });
