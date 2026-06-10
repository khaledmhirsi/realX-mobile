import 'react-native-reanimated';
import { ensureFirebaseAppCheck } from '../utils/firebaseAppCheck';
import {
  getAuth,
  getIdToken,
  onAuthStateChanged,
  type FirebaseAuthTypes
} from '@react-native-firebase/auth';
import { QueryClientProvider } from '@tanstack/react-query';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { StudentProvider, useStudent } from '../context/StudentContext';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useMemo, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initI18n } from '../src/localization/i18n';
import { applyRTL } from '../src/localization/rtl';
import {
  setupNotificationChannels,
} from '../utils/notifications';
import { syncExpoPushTokenForUser } from '../utils/pushNotifications';
import {
  getPendingVerification,
  clearPendingVerification,
  type PendingVerificationData,
} from '../utils/verificationPending';
import { logger } from '../utils/logger';
import { AppThemeProvider, useAppTheme } from '../context/AppThemeContext';
import { queryClient } from '../utils/queryClient';
import { clearLocalAuthSession, isInvalidAuthSessionError } from '../utils/auth';

import CustomSplash from './splash';



void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Hanson: require('../assets/fonts/Hanson-Bold.otf'),
    Poppins: require('../assets/fonts/poppins.ttf'),
    JaliArabicRegular: require('../assets/fonts/jali-arabic-regular.ttf'),
    JaliArabicBold: require('../assets/fonts/jali-arabic-bold.ttf'),
    TajawalBlack: require('../assets/fonts/Tajawal-Black.ttf'),
  });

  const [i18nReady, setI18nReady] = useState(false);
  const [appCheckReady, setAppCheckReady] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const setupAppCheck = async () => {
      try {
        await ensureFirebaseAppCheck();
      } finally {
        if (!cancelled) {
          setAppCheckReady(true);
        }
      }
    };

    void setupAppCheck();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const setupLocalization = async () => {
      try {
        const language = await initI18n();
        applyRTL(language as 'en' | 'ar');
      } catch (err) {
        logger.error('Error initializing localization:', err);
      } finally {
        setI18nReady(true);
      }
    };

    void setupLocalization();
  }, []);

  useEffect(() => {
    const subscriber = onAuthStateChanged(getAuth(), (currentUser) => {
      setUser(currentUser);
      setInitializing(false);
    });
    return subscriber;
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AppThemeProvider>
          <StudentProvider>
            <LayoutContent
              user={user}
              loaded={loaded}
              error={error}
              i18nReady={i18nReady}
              appCheckReady={appCheckReady}
              initializing={initializing}
              showSplash={showSplash}
              onSplashFinish={() => setShowSplash(false)}
            />
          </StudentProvider>
        </AppThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

function LayoutContent({
  user,
  loaded,
  error,
  i18nReady,
  appCheckReady,
  initializing,
  showSplash,
  onSplashFinish,
}: {
  user: FirebaseAuthTypes.User | null;
  loaded: boolean;
  error: Error | null;
  i18nReady: boolean;
  appCheckReady: boolean;
  initializing: boolean;
  showSplash: boolean;
  onSplashFinish: () => void;
}) {
  const { docExists: hasProfile } = useStudent();
  const { isDark, theme } = useAppTheme();
  const router = useRouter();
  const segments = useSegments();
  const [appReady, setAppReady] = useState(false);
  const [pendingVerification, setPendingVerification] = useState<PendingVerificationData | null>(null);
  const [pendingCheckDone, setPendingCheckDone] = useState(false);
  const [validatedMissingProfileUid, setValidatedMissingProfileUid] = useState<string | null>(null);
  const navigationTheme = useMemo(() => {
    const baseTheme = isDark ? DarkTheme : DefaultTheme;

    return {
      ...baseTheme,
      dark: isDark,
      colors: {
        ...baseTheme.colors,
        primary: theme.brand,
        background: theme.background,
        card: theme.surfaceElevated,
        text: theme.text,
        border: theme.border,
        notification: theme.brand,
      },
    };
  }, [isDark, theme]);

  useEffect(() => {
    getPendingVerification().then((data) => {
      setPendingVerification(data);
      setPendingCheckDone(true);
    });
  }, []);

  useEffect(() => {
    if (
      i18nReady &&
      appCheckReady &&
      (loaded || error) &&
      !initializing &&
      (user === null || hasProfile !== null) &&
      pendingCheckDone
    ) {
      setAppReady(true);
    }
  }, [i18nReady, appCheckReady, loaded, error, initializing, user, hasProfile, pendingCheckDone]);

  // Set up local notification channels when user is authenticated with a profile
  useEffect(() => {
    if (user && hasProfile === true) {
      setupNotificationChannels();
    }
  }, [user, hasProfile]);

  useEffect(() => {
    if (!user || hasProfile !== true) return;

    let cancelled = false;

    const registerToken = async () => {
      try {
        if (cancelled) return;
        await getIdToken(user);
        if (cancelled) return;
        await syncExpoPushTokenForUser(user.uid);
      } catch (error) {
        logger.error('Error registering push token:', error);
      }
    };

    void registerToken();

    return () => {
      cancelled = true;
    };
  }, [user, hasProfile]);

  useEffect(() => {
    if (!user || hasProfile !== false) {
      setValidatedMissingProfileUid(null);
      return;
    }

    let cancelled = false;

    const validateMissingProfileSession = async () => {
      try {
        await getIdToken(user, true);
        if (!cancelled) {
          setValidatedMissingProfileUid(user.uid);
        }
      } catch (error) {
        if (cancelled) return;

        if (isInvalidAuthSessionError(error)) {
          logger.log('Signing out invalid Firebase Auth session after profile deletion', {
            uid: user.uid,
          });
          await clearLocalAuthSession().catch((signOutError) => {
            logger.error('Unable to clear invalid Firebase Auth session:', signOutError);
          });
          return;
        }

        logger.error('Unable to validate authenticated user with missing profile:', error);
      }
    };

    void validateMissingProfileSession();

    return () => {
      cancelled = true;
    };
  }, [user, hasProfile]);

  useEffect(() => {
    if (initializing || !loaded || !i18nReady || !pendingCheckDone) return;
    if (user && hasProfile === null) return;

    const inAuthGroup = (segments as string[]).indexOf('(onboarding)') !== -1;

    if (!user) {
      if (pendingVerification) {
        // Has a pending verification request — show pending screen
        const currentPath = segments.join('/');
        if (!currentPath.includes('pending')) {
          router.replace({
            pathname: '/(onboarding)/pending',
            params: {
              email: pendingVerification.email,
              role: pendingVerification.role,
              statusToken: pendingVerification.statusToken,
            },
          } as any);
        }
      } else if (!inAuthGroup) {
        router.replace('/(onboarding)' as any);
      }
    } else {
      if (hasProfile === true) {
        if (inAuthGroup) {
          router.replace('/(tabs)' as any);
        }
      } else if (hasProfile === false && validatedMissingProfileUid === user.uid) {
        const currentPath = segments.join('/');
        if (!currentPath.includes('details')) {
          // Fetch role from verification request for users who came through ID verification
          const fetchRoleAndNavigate = async () => {
            let role: string | undefined;
            try {
              if (user.email && pendingVerification?.statusToken) {
                const fnInstance = getFunctions(undefined, 'me-central1');
                const checkStatus = httpsCallable(fnInstance, 'checkVerificationStatus');
                const result = await checkStatus({
                  email: user.email,
                  statusToken: pendingVerification.statusToken,
                });
                const data = result.data as { status: string; role?: string };
                if (data.status !== 'none') {
                  role = data.role;
                }
              }
            } catch {
              // Fall through with no role — details.tsx defaults to 'student'
            }
            router.replace({
              pathname: '/(onboarding)/details',
              params: role ? { role } : undefined,
            } as any);
          };
          fetchRoleAndNavigate();
        }
      }
    }
  }, [user, initializing, loaded, i18nReady, pendingCheckDone, segments, hasProfile, pendingVerification, router, validatedMissingProfileUid]);

  // Clear pending verification once user authenticates
  useEffect(() => {
    if (user && pendingVerification) {
      clearPendingVerification();
      setPendingVerification(null);
    }
  }, [user, pendingVerification]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { path?: unknown } | undefined;
      const path = data?.path;

      if (typeof path === 'string' && path.startsWith('/')) {
        router.push(path as any);
      }
    });

    return () => subscription.remove();
  }, [router]);

  if (!appReady || showSplash) {
    return (
      <ThemeProvider value={navigationTheme}>
        <CustomSplash
          onFinish={onSplashFinish}
        />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack>
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="category" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ headerShown: false }} />
        <Stack.Screen name="vendor/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="redeem/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="redemption-history" options={{ headerShown: false }} />
        <Stack.Screen name="saved-offers" options={{ headerShown: false }} />
        <Stack.Screen name="profile-details" options={{ headerShown: false }} />
        <Stack.Screen name="terms" options={{ headerShown: false }} />
        <Stack.Screen name="privacy" options={{ headerShown: false }} />
        <Stack.Screen name="x-academy" options={{ headerShown: false }} />
        <Stack.Screen name="wakti" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="+not-found" options={{ title: 'Oops! Not Found' }} />
      </Stack>
    </ThemeProvider>
  );
}
