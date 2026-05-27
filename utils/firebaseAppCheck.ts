import appCheck from '@react-native-firebase/app-check';
import { Platform } from 'react-native';

import { logger } from './logger';

let appCheckInitializationPromise: Promise<void> | null = null;

async function initializeFirebaseAppCheck(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  const provider = appCheck().newReactNativeFirebaseAppCheckProvider();

  provider.configure({
    android: {
      provider: __DEV__ ? 'debug' : 'playIntegrity',
    },
    apple: {
      provider: __DEV__ ? 'debug' : 'appAttestWithDeviceCheckFallback',
    },
  });

  await appCheck().initializeAppCheck({
    provider,
    isTokenAutoRefreshEnabled: true,
  });
}

export function ensureFirebaseAppCheck(): Promise<void> {
  if (!appCheckInitializationPromise) {
    appCheckInitializationPromise = initializeFirebaseAppCheck().catch((error) => {
      logger.error('Error initializing Firebase App Check:', error);
      throw error;
    });
  }

  return appCheckInitializationPromise;
}
