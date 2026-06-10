import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'verification_pending';
const STALE_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export type PendingVerificationData = {
  email: string;
  role: string;
  statusToken: string;
  submittedAt: string;
};

export async function savePendingVerification(email: string, role: string, statusToken: string): Promise<void> {
  const data: PendingVerificationData = {
    email,
    role,
    statusToken,
    submittedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function getPendingVerification(): Promise<PendingVerificationData | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data: PendingVerificationData = JSON.parse(raw);
    if (!data.email || !data.role || !data.statusToken || !data.submittedAt) {
      await clearPendingVerification();
      return null;
    }

    // Auto-clear if older than 30 days
    const submittedAt = new Date(data.submittedAt).getTime();
    if (Date.now() - submittedAt > STALE_THRESHOLD_MS) {
      await clearPendingVerification();
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

export async function clearPendingVerification(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
