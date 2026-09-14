export type TreatmentColor =
  | 'blue'
  | 'orange'
  | 'violet'
  | 'rose'
  | 'emerald'
  | 'cyan'
  | 'lime'
  | 'pink'
  | 'indigo'
  | 'amber'
  | 'teal'
  | 'purple';

export type EventColor = TreatmentColor;

export const TREATMENT_COLORS: readonly TreatmentColor[] = [
  'blue',
  'orange',
  'violet',
  'rose',
  'emerald',
  'cyan',
  'lime',
  'pink',
  'indigo',
  'amber',
  'teal',
  'purple',
] as const;

export const COLOR_MAP: Record<TreatmentColor, string> = {
  blue: '#3B82F6',
  orange: '#F97316',
  violet: '#8B5CF6',
  rose: '#F43F5E',
  emerald: '#10B981',
  cyan: '#06B6D4',
  lime: '#84CC16',
  pink: '#EC4899',
  indigo: '#6366F1',
  amber: '#F59E0B',
  teal: '#14B8A6',
  purple: '#A855F7',
};

// Pastel chip background per color — matches the web calendar's
// `bg-{color}-200/50` event chips (Tailwind's 100 shade approximates the
// lightened, half-opacity look on a white canvas).
export const COLOR_BG_MAP: Record<TreatmentColor, string> = {
  blue: '#DBEAFE',
  orange: '#FFEDD5',
  violet: '#EDE9FE',
  rose: '#FFE4E6',
  emerald: '#D1FAE5',
  cyan: '#CFFAFE',
  lime: '#ECFCCB',
  pink: '#FCE7F3',
  indigo: '#E0E7FF',
  amber: '#FEF3C7',
  teal: '#CCFBF1',
  purple: '#F3E8FF',
};

// Readable text color on top of COLOR_BG_MAP — matches the web's
// `text-{color}-900/90`.
export const COLOR_TEXT_MAP: Record<TreatmentColor, string> = {
  blue: '#1E3A8A',
  orange: '#7C2D12',
  violet: '#4C1D95',
  rose: '#881337',
  emerald: '#064E3B',
  cyan: '#164E63',
  lime: '#365314',
  pink: '#831843',
  indigo: '#312E81',
  amber: '#78350F',
  teal: '#134E4A',
  purple: '#581C87',
};

export function mapTreatmentColorToEventColor(
  treatmentColor: string | null,
  treatmentName?: string
): EventColor {
  if (!treatmentColor) {
    if (treatmentName) {
      const name = treatmentName.toLowerCase();
      if (name.includes('hair') || name.includes('cut') || name.includes('color') || name.includes('style'))
        return 'emerald';
      if (name.includes('nail') || name.includes('manicure') || name.includes('pedicure')) return 'orange';
      if (name.includes('facial') || name.includes('beauty') || name.includes('makeup')) return 'violet';
      if (name.includes('massage') || name.includes('spa') || name.includes('relax')) return 'rose';
    }
    return 'blue';
  }

  const color = treatmentColor.toLowerCase();

  if (color.includes('blue')) return 'blue';
  if (color.includes('orange') || color.includes('yellow')) return 'orange';
  if (color.includes('violet') || color.includes('purple')) return 'violet';
  if (color.includes('rose') || color.includes('red') || color.includes('pink')) return 'pink';
  if (color.includes('green') || color.includes('emerald')) return 'emerald';
  if (color.includes('cyan')) return 'cyan';
  if (color.includes('lime')) return 'lime';
  if (color.includes('indigo')) return 'indigo';
  if (color.includes('amber')) return 'amber';
  if (color.includes('teal')) return 'teal';

  const hash = color.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  return TREATMENT_COLORS[hash % TREATMENT_COLORS.length];
}

export function getEventColorCSS(color: EventColor): string {
  return COLOR_MAP[color];
}
