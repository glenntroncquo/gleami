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
