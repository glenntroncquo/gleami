import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Supabase session storage.
 * Native: expo-secure-store, chunked because a session JWT can exceed the
 * 2048-byte Keychain value limit. Web (screenshots / Expo web): localStorage,
 * because SecureStore has no web keychain.
 * salon-mobile persists the same session in AsyncStorage; this app uses
 * SecureStore as requested for the consumer client.
 */
const CHUNK = 1800;

function chunkCountKey(key: string): string {
  return `${key}.n`;
}

function chunkKey(key: string, index: number): string {
  return `${key}.${index}`;
}

async function deleteQuietly(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Missing keys throw. That is the state we wanted.
  }
}

const webStorage = {
  getItem(key: string): Promise<string | null> {
    if (typeof window === 'undefined') return Promise.resolve(null);
    return Promise.resolve(window.localStorage.getItem(key));
  },
  setItem(key: string, value: string): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    window.localStorage.setItem(key, value);
    return Promise.resolve();
  },
  removeItem(key: string): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    window.localStorage.removeItem(key);
    return Promise.resolve();
  },
};

export const authStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return webStorage.getItem(key);
    const countRaw = await SecureStore.getItemAsync(chunkCountKey(key));
    if (!countRaw) return SecureStore.getItemAsync(key);
    const count = Number(countRaw);
    if (!Number.isFinite(count) || count <= 0) return null;
    let value = '';
    for (let index = 0; index < count; index += 1) {
      const part = await SecureStore.getItemAsync(chunkKey(key, index));
      if (part == null) return null;
      value += part;
    }
    return value;
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      await webStorage.setItem(key, value);
      return;
    }
    if (value.length <= CHUNK) {
      await deleteQuietly(chunkCountKey(key));
      await SecureStore.setItemAsync(key, value);
      return;
    }
    const count = Math.ceil(value.length / CHUNK);
    await SecureStore.setItemAsync(chunkCountKey(key), String(count));
    for (let index = 0; index < count; index += 1) {
      await SecureStore.setItemAsync(chunkKey(key, index), value.slice(index * CHUNK, (index + 1) * CHUNK));
    }
    await deleteQuietly(key);
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      await webStorage.removeItem(key);
      return;
    }
    const countRaw = await SecureStore.getItemAsync(chunkCountKey(key));
    const count = Number(countRaw);
    if (Number.isFinite(count) && count > 0) {
      for (let index = 0; index < count; index += 1) {
        await deleteQuietly(chunkKey(key, index));
      }
    }
    await deleteQuietly(chunkCountKey(key));
    await deleteQuietly(key);
  },
};
