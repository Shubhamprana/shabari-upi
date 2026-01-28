import { NativeModules, Platform } from 'react-native';

const { OpenInBrowser } = NativeModules;

export const openInBrowser = (url: string) => {
  if (Platform.OS === 'android') {
    OpenInBrowser.open(url);
  } else {
    // Fallback for iOS/Web
    // (Actual linking or WebBrowser would be used here)
  }
};
