import { NativeModules, Platform, Alert } from 'react-native';

const { OpenInBrowser } = NativeModules;

/**
 * Open URL in an external browser (Android: tries known browsers explicitly)
 * Returns true if successful, false if no browser found.
 * On Android, does NOT fallback to implicit open (which could loop back to Shabari).
 */
export const openInBrowser = async (url: string): Promise<boolean> => {
  if (Platform.OS === 'android') {
    try {
      // Native module tries explicit known browsers first
      OpenInBrowser.open(url);
      return true;
    } catch (e) {
      console.error('[openInBrowser] Failed to open:', e);
      return false;
    }
  } else {
    // iOS/Web: not implemented yet
    return false;
  }
};
