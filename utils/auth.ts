import { getAuth, signOut } from '@react-native-firebase/auth';
import { unregisterExpoPushTokenForCurrentUser } from './pushNotifications';

// Auth utility helpers
// Magic link helpers have been removed — OTP auth is now used instead.

const INVALID_SESSION_AUTH_CODES = [
  'auth/invalid-user-token',
  'auth/user-disabled',
  'auth/user-not-found',
  'auth/user-token-expired',
];

export const isInvalidAuthSessionError = (error: unknown) => {
  const code = String((error as { code?: unknown } | null)?.code || '').toLowerCase();
  return INVALID_SESSION_AUTH_CODES.some((invalidCode) => code.includes(invalidCode));
};

export const clearLocalAuthSession = async () => {
  try {
    await unregisterExpoPushTokenForCurrentUser();
    await signOut(getAuth());
  } catch (error) {
    const code = String((error as { code?: unknown } | null)?.code || '').toLowerCase();

    // Firebase may clear a deleted user before our explicit sign-out runs.
    if (!code.includes('auth/no-current-user')) {
      throw error;
    }
  }
};
