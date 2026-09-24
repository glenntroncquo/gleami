import AsyncStorage from '@react-native-async-storage/async-storage';

const COMPANY_KEY = 'gleami.selectedCompanyId';
const LOCATION_KEY_PREFIX = 'gleami.selectedLocationId.';
const locationKey = (companyId: string) => `${LOCATION_KEY_PREFIX}${companyId}`;

export async function readPreferredCompanyId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(COMPANY_KEY);
  } catch {
    return null;
  }
}

export async function writePreferredCompanyId(companyId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(COMPANY_KEY, companyId);
  } catch {
    // Preference write is best-effort — hydrate must still finish.
  }
}

export async function readPreferredLocationId(companyId: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(locationKey(companyId));
  } catch {
    return null;
  }
}

export async function writePreferredLocationId(companyId: string, locationId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(locationKey(companyId), locationId);
  } catch {
    // Preference write is best-effort — hydrate must still finish.
  }
}

/** Drop persisted company/location selection so it cannot outlive memberships. */
export async function clearSessionPreferences(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const sessionKeys = keys.filter((key) => key === COMPANY_KEY || key.startsWith(LOCATION_KEY_PREFIX));
    if (sessionKeys.length > 0) {
      await AsyncStorage.multiRemove(sessionKeys);
    }
  } catch {
    // Preference clear is best-effort — sign-out must still finish.
  }
}

export type CalendarViewMode = 'month' | 'week' | 'list' | 'dayGrid' | 'weekGrid';
const CALENDAR_VIEW_KEY = 'gleami.calendarView';

export async function readPreferredCalendarView(): Promise<CalendarViewMode> {
  try {
    const saved = await AsyncStorage.getItem(CALENDAR_VIEW_KEY);
    if (saved === 'month' || saved === 'week' || saved === 'list' || saved === 'dayGrid' || saved === 'weekGrid') {
      return saved;
    }
  } catch {
    // An unavailable preference must not prevent opening the calendar.
  }
  return 'month';
}

// Preserve selection order if the user switches views quickly.
let calendarViewWrite = Promise.resolve();
export function writePreferredCalendarView(mode: CalendarViewMode): Promise<void> {
  calendarViewWrite = calendarViewWrite.then(async () => {
    try {
      await AsyncStorage.setItem(CALENDAR_VIEW_KEY, mode);
    } catch {
      // Keep the selected view usable if local storage is unavailable.
    }
  });
  return calendarViewWrite;
}
