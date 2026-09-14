import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

/** In-app browser first (expo-web-browser); fall back to the system handler. */
export async function openExternalUrl(url: string): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      throw new Error('Cannot open URL');
    }
    await Linking.openURL(url);
  }
}
