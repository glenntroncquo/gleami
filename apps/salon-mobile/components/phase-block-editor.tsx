import { Pressable } from '@/components/pressable-scale';
import { Colors } from '@/constants/theme';
import {
  clientDurationFromPhases,
  parsePhaseType,
  staffDurationFromPhases,
  type PhaseDraft,
  type PhaseType,
} from '@/lib/api/services';
import { COLOR_BG_MAP, COLOR_MAP, COLOR_TEXT_MAP, mapTreatmentColorToEventColor } from '@/lib/treatment-colors';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

export type EditorPhase = PhaseDraft & { key: string };

const STEP_MINUTES = 5;
const MIN_MINUTES = 5;
const DEFAULT_BLOCK_MINUTES = 30;
const PHASE_TYPES: PhaseType[] = ['busy', 'free', 'buffer'];

let phaseKeySeq = 0;
export function createPhaseKey(): string {
  phaseKeySeq += 1;
  return `phase-${phaseKeySeq}`;
}

export function defaultEditorPhases(): EditorPhase[] {
  return [{ key: createPhaseKey(), phase_type: 'busy', duration_minutes: DEFAULT_BLOCK_MINUTES }];
}

export function editorPhasesFromDrafts(phases: PhaseDraft[]): EditorPhase[] {
  if (phases.length === 0) return defaultEditorPhases();
  return phases.map((phase) => ({
    key: createPhaseKey(),
    phase_type: parsePhaseType(phase.phase_type),
    duration_minutes: Math.max(MIN_MINUTES, Number(phase.duration_minutes) || DEFAULT_BLOCK_MINUTES),
  }));
}

function withAlpha(hex: string, alpha: number): string {
  const raw = hex.replace('#', '');
  if (raw.length !== 6) return hex;
  const red = Number.parseInt(raw.slice(0, 2), 16);
  const green = Number.parseInt(raw.slice(2, 4), 16);
  const blue = Number.parseInt(raw.slice(4, 6), 16);
  return `rgba(${red},${green},${blue},${alpha})`;
}

function StripeOverlay({ color, dashed }: { color: string; dashed?: boolean }) {
  const count = dashed ? 10 : 14;
  const step = dashed ? 12 : 10;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: count }, (_, index) => (
        <View
          key={index}
          style={[
            dashed ? styles.dashStripe : styles.hatchStripe,
            {
              left: index * step - 24,
              backgroundColor: color,
            },
          ]}
        />
      ))}
    </View>
  );
}

type Props = {
  phases: EditorPhase[];
  onChange: (phases: EditorPhase[]) => void;
  serviceColor: string | null;
  theme: typeof Colors.light;
};

export function PhaseBlockEditor({ phases, onChange, serviceColor, theme }: Props) {
  const { t } = useTranslation();
  const [notice, setNotice] = React.useState<string | null>(null);

  const eventColor = mapTreatmentColorToEventColor(serviceColor);
  const busyColor = COLOR_MAP[eventColor];
  const freeFill = COLOR_BG_MAP[eventColor];
  const freeText = COLOR_TEXT_MAP[eventColor];
  const bufferFill = withAlpha(busyColor, 0.16);
  const bufferStripe = withAlpha(busyColor, 0.45);

  const busyCount = phases.filter((phase) => phase.phase_type === 'busy').length;
  const clientMinutes = clientDurationFromPhases(phases);
  const staffMinutes = staffDurationFromPhases(phases);

  const updateAt = (index: number, patch: Partial<EditorPhase>) => {
    onChange(phases.map((phase, phaseIndex) => (phaseIndex === index ? { ...phase, ...patch } : phase)));
  };

  const handleTypeChange = (index: number, nextType: PhaseType) => {
    const current = phases[index];
    if (!current || current.phase_type === nextType) return;
    if (current.phase_type === 'busy' && nextType !== 'busy' && busyCount <= 1) {
      setNotice(t('service.keepOneBusy'));
      return;
    }
    setNotice(null);
    updateAt(index, { phase_type: nextType });
  };

  const handleMinutes = (index: number, next: number) => {
    const minutes = Math.max(MIN_MINUTES, Math.round(next / STEP_MINUTES) * STEP_MINUTES);
    updateAt(index, { duration_minutes: minutes });
  };

  const handleDelete = (index: number) => {
    const current = phases[index];
    if (!current) return;
    if (current.phase_type === 'busy' && busyCount <= 1) {
      setNotice(t('service.keepOneBusy'));
      return;
    }
    setNotice(null);
    onChange(phases.filter((_, phaseIndex) => phaseIndex !== index));
  };

  const handleAdd = (phaseType: PhaseType) => {
    setNotice(null);
    onChange([
      ...phases,
      {
        key: createPhaseKey(),
        phase_type: phaseType,
        duration_minutes: DEFAULT_BLOCK_MINUTES,
      },
    ]);
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.sectionLabel, { color: theme.muted }]}>{t('service.blocks')}</Text>

      <View style={[styles.bar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {phases.map((phase) => {
          const showLabel = phase.duration_minutes >= 10 || phases.length <= 4;
          const isBusy = phase.phase_type === 'busy';
          const isFree = phase.phase_type === 'free';
          const backgroundColor = isBusy ? busyColor : isFree ? freeFill : bufferFill;
          const labelColor = isBusy ? '#ffffff' : isFree ? freeText : theme.muted;
          return (
            <View
              key={phase.key}
              style={[
                styles.barSegment,
                {
                  flexGrow: phase.duration_minutes,
                  flexShrink: 1,
                  backgroundColor,
                  borderColor: phase.phase_type === 'buffer' ? withAlpha(busyColor, 0.4) : 'transparent',
                  borderStyle: phase.phase_type === 'buffer' ? 'dashed' : 'solid',
                },
              ]}>
              {isFree ? <StripeOverlay color={busyColor} /> : null}
              {phase.phase_type === 'buffer' ? <StripeOverlay color={bufferStripe} dashed /> : null}
              {showLabel ? (
                <Text numberOfLines={1} style={[styles.barLabel, { color: labelColor }]}>
                  {`${phase.duration_minutes}`}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>

      <View style={styles.totalsRow}>
        <View style={[styles.totalChip, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <Text style={[styles.totalValue, { color: theme.text }]}>
            {t('service.clientSees', { minutes: clientMinutes })}
          </Text>
        </View>
        <View style={[styles.totalChip, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <Text style={[styles.totalValue, { color: theme.text }]}>
            {t('service.staffOccupied', { minutes: staffMinutes })}
          </Text>
        </View>
      </View>

      {phases.map((phase, index) => (
        <View key={phase.key} style={[styles.rowCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <View style={styles.typeRow}>
            {PHASE_TYPES.map((type) => (
              <TypeChip
                key={type}
                label={t(phaseTypeLabelKey(type))}
                selected={phase.phase_type === type}
                theme={theme}
                onPress={() => handleTypeChange(index, type)}
              />
            ))}
            <Pressable
              onPress={() => handleDelete(index)}
              hitSlop={8}
              style={[styles.deleteButton, { borderColor: theme.border }]}>
              <Text style={[styles.deleteText, { color: theme.error }]}>{t('common.delete')}</Text>
            </Pressable>
          </View>

          {phase.phase_type === 'free' ? (
            <Text style={[styles.hint, { color: theme.muted }]}>{t('service.phaseFreeHint')}</Text>
          ) : null}
          {phase.phase_type === 'buffer' ? (
            <Text style={[styles.hint, { color: theme.muted }]}>{t('service.phaseBufferHint')}</Text>
          ) : null}

          <View style={styles.stepperRow}>
            <Pressable
              style={[styles.stepperButton, { borderColor: theme.border, backgroundColor: theme.background }]}
              onPress={() => handleMinutes(index, phase.duration_minutes - STEP_MINUTES)}>
              <Text style={[styles.stepperButtonText, { color: theme.text }]}>{`−${STEP_MINUTES}`}</Text>
            </Pressable>
            <Text style={[styles.minutesValue, { color: theme.text }]}>
              {`${phase.duration_minutes} ${t('appointment.minutesShort')}`}
            </Text>
            <Pressable
              style={[styles.stepperButton, { borderColor: theme.border, backgroundColor: theme.background }]}
              onPress={() => handleMinutes(index, phase.duration_minutes + STEP_MINUTES)}>
              <Text style={[styles.stepperButtonText, { color: theme.text }]}>{`+${STEP_MINUTES}`}</Text>
            </Pressable>
          </View>
        </View>
      ))}

      {notice ? <Text style={[styles.notice, { color: theme.error }]}>{notice}</Text> : null}

      <View style={styles.addRow}>
        <AddButton label={t('service.addBusy')} theme={theme} onPress={() => handleAdd('busy')} />
        <AddButton label={t('service.addFree')} theme={theme} onPress={() => handleAdd('free')} />
        <AddButton label={t('service.addBuffer')} theme={theme} onPress={() => handleAdd('buffer')} />
      </View>
    </View>
  );
}

function phaseTypeLabelKey(type: PhaseType): string {
  if (type === 'free') return 'service.phaseFree';
  if (type === 'buffer') return 'service.phaseBuffer';
  return 'service.phaseBusy';
}

function TypeChip({
  label,
  selected,
  theme,
  onPress,
}: {
  label: string;
  selected: boolean;
  theme: typeof Colors.light;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.typeChip,
        { borderColor: theme.border, backgroundColor: theme.background },
        selected && { backgroundColor: theme.tint, borderColor: theme.tint },
      ]}>
      <Text style={[styles.typeChipText, { color: selected ? theme.onTint : theme.text }]}>{label}</Text>
    </Pressable>
  );
}

function AddButton({
  label,
  theme,
  onPress,
}: {
  label: string;
  theme: typeof Colors.light;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.addButton, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <Text style={[styles.addButtonText, { color: theme.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  bar: {
    flexDirection: 'row',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    gap: 2,
  },
  barSegment: {
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  barLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  hatchStripe: {
    position: 'absolute',
    top: -16,
    width: 2,
    height: 76,
    opacity: 0.28,
    transform: [{ rotate: '28deg' }],
  },
  dashStripe: {
    position: 'absolute',
    top: -16,
    width: 1.5,
    height: 76,
    opacity: 0.55,
    transform: [{ rotate: '28deg' }],
  },
  totalsRow: {
    gap: 8,
  },
  totalChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  rowCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  typeChip: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: 72,
    alignItems: 'center',
  },
  typeChipText: {
    fontSize: 14,
    fontWeight: '700',
  },
  deleteButton: {
    marginLeft: 'auto',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  deleteText: {
    fontSize: 14,
    fontWeight: '600',
  },
  hint: {
    fontSize: 13,
  },
  notice: {
    fontSize: 13,
    fontWeight: '600',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 64,
    alignItems: 'center',
  },
  stepperButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  minutesValue: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  addRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  addButton: {
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    minWidth: 96,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
