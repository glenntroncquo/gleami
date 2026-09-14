import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import type { ColorValue } from 'react-native';

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

/**
 * Every icon the app uses, by a stable semantic name — not tied to either
 * icon set's own naming. Renders the real SF Symbol on iOS (via
 * `expo-symbols`) and falls back to Material Icons on Android/web, since SF
 * Symbols don't exist outside Apple platforms.
 */
const ICONS = {
  orders: { symbol: 'bag', material: 'shopping-bag' },
  dashboard: { symbol: 'chart.bar', material: 'bar-chart' },
  settings: { symbol: 'gearshape', material: 'settings' },
  privacy: { symbol: 'doc.text', material: 'description' },
  terms: { symbol: 'checkmark.shield', material: 'verified-user' },
  add: { symbol: 'plus', material: 'add' },
  back: { symbol: 'chevron.left', material: 'arrow-back' },
  calendar: { symbol: 'calendar', material: 'calendar-today' },
  camera: { symbol: 'camera.fill', material: 'photo-camera' },
  check: { symbol: 'checkmark', material: 'check' },
  checkCircle: { symbol: 'checkmark.circle.fill', material: 'check-circle' },
  chevronLeft: { symbol: 'chevron.left', material: 'chevron-left' },
  chevronRight: { symbol: 'chevron.right', material: 'chevron-right' },
  close: { symbol: 'xmark', material: 'close' },
  delete: { symbol: 'trash', material: 'delete-outline' },
  cut: { symbol: 'scissors', material: 'content-cut' },
  eventBusy: { symbol: 'calendar.badge.exclamationmark', material: 'event-busy' },
  expandMore: { symbol: 'chevron.down', material: 'expand-more' },
  gridView: { symbol: 'square.grid.2x2', material: 'grid-view' },
  groups: { symbol: 'person.3.fill', material: 'groups' },
  arrowDown: { symbol: 'chevron.down', material: 'keyboard-arrow-down' },
  arrowUp: { symbol: 'chevron.up', material: 'keyboard-arrow-up' },
  note: { symbol: 'note.text', material: 'edit-note' },
  peopleOutline: { symbol: 'person.2', material: 'people-outline' },
  person: { symbol: 'person', material: 'person' },
  personAdd: { symbol: 'person.badge.plus', material: 'person-add' },
  pointOfSale: { symbol: 'creditcard', material: 'point-of-sale' },
  refresh: { symbol: 'arrow.clockwise', material: 'refresh' },
  schedule: { symbol: 'clock', material: 'schedule' },
  search: { symbol: 'magnifyingglass', material: 'search' },
  viewAgenda: { symbol: 'list.bullet.rectangle', material: 'view-agenda' },
  viewList: { symbol: 'list.bullet', material: 'view-list' },
  viewWeek: { symbol: 'rectangle.split.3x1', material: 'view-week' },
} satisfies Record<string, { symbol: SFSymbol; material: MaterialIconName }>;

export type AppIconName = keyof typeof ICONS;

type Props = {
  name: AppIconName;
  size?: number;
  color?: ColorValue;
};

export function AppIcon({ name, size = 24, color }: Props) {
  const { symbol, material } = ICONS[name];
  return (
    <SymbolView
      name={symbol}
      size={size}
      tintColor={color}
      // Fixed layout box (rather than relying on the native symbol's own
      // intrinsic-size measurement) so Yoga can center it synchronously —
      // otherwise it's laid out a frame late, the same class of bug as the
      // tab bar's label-reservation issue, and shows up as the icon sitting
      // off-center inside its header-button capsule.
      style={{ width: size, height: size }}
      fallback={<MaterialIcons name={material} size={size} color={color as string} />}
    />
  );
}
