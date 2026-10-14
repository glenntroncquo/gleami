import Ionicons from '@expo/vector-icons/Ionicons';
import type { ColorValue } from 'react-native';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** Stable semantic names, using the same outline family as marketplace-mobile. */
const ICONS = {
  orders: 'bag-outline',
  dashboard: 'bar-chart-outline',
  settings: 'settings-outline',
  privacy: 'document-text-outline',
  terms: 'shield-checkmark-outline',
  add: 'add',
  back: 'chevron-back',
  barcode: 'scan-outline',
  calendar: 'calendar-outline',
  camera: 'camera-outline',
  check: 'checkmark',
  checkCircle: 'checkmark-circle-outline',
  chevronLeft: 'chevron-back',
  chevronRight: 'chevron-forward',
  close: 'close',
  delete: 'trash-outline',
  cut: 'cut-outline',
  eventBusy: 'calendar-clear-outline',
  expandMore: 'chevron-down',
  flash: 'flash-outline',
  gridView: 'grid-outline',
  groups: 'people-outline',
  arrowDown: 'chevron-down',
  arrowUp: 'chevron-up',
  inventory: 'cube-outline',
  note: 'document-text-outline',
  peopleOutline: 'people-outline',
  person: 'person-outline',
  personAdd: 'person-add-outline',
  pointOfSale: 'card-outline',
  refresh: 'refresh-outline',
  schedule: 'time-outline',
  edit: 'create-outline',
  restaurant: 'restaurant-outline',
  coffee: 'cafe-outline',
  search: 'search-outline',
  viewAgenda: 'albums-outline',
  viewList: 'list-outline',
  viewWeek: 'today-outline',
  language: 'language-outline',
  appearance: 'contrast-outline',
  signOut: 'log-out-outline',
} satisfies Record<string, IconName>;

export type AppIconName = keyof typeof ICONS;

type Props = {
  name: AppIconName;
  size?: number;
  color?: ColorValue;
};

export function AppIcon({ name, size = 24, color }: Props) {
  return <Ionicons name={ICONS[name]} size={size} color={color} />;
}
