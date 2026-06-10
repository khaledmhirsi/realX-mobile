import { Ionicons } from '@expo/vector-icons';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { useAppTheme } from '../../context/AppThemeContext';
import { Typography } from '../../constants/Typography';
import PhonkText from '../../components/PhonkText';
import {
  OnboardingButtonMotion,
  OnboardingCardMotion,
  OnboardingScreenMotion,
  OnboardingStateMotion,
} from '../../components/onboarding/OnboardingMotion';
import { logger } from '../../utils/logger';
import { useTranslation } from 'react-i18next';
import { clearPendingVerification } from '../../utils/verificationPending';

export default function PendingVerificationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; role?: string; statusToken?: string }>();
  const { email, statusToken } = params;
  const { t } = useTranslation();
  const { theme } = useAppTheme();

  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [checking, setChecking] = useState(false);
  const appStateRef = useRef(AppState.currentState);

  const checkStatus = useCallback(async () => {
    if (!email || !statusToken || status !== 'pending') return;
    setChecking(true);
    try {
      const fnInstance = getFunctions(undefined, 'me-central1');
      const checkFn = httpsCallable(fnInstance, 'checkVerificationStatus');
      const result = await checkFn({ email, statusToken });
      const data = result.data as { status: string; role?: string; rejectionReason?: string };

      setLastChecked(new Date());

      if (data.status === 'approved') {
        setStatus('approved');
        await clearPendingVerification();
        setTimeout(() => {
          router.replace({
            pathname: '/(onboarding)/login',
            params: { prefillEmail: email },
          } as any);
        }, 2000);
      } else if (data.status === 'rejected') {
        setStatus('rejected');
        setRejectionReason(data.rejectionReason || null);
        await clearPendingVerification();
      }
    } catch (err) {
      logger.error('Status check error:', err);
    } finally {
      setChecking(false);
    }
  }, [email, router, status, statusToken]);

  // Check on mount + whenever app comes back to foreground
  useEffect(() => {
    checkStatus();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        checkStatus();
      }
      appStateRef.current = nextState;
    });

    return () => subscription.remove();
  }, [checkStatus]);

  const handleCheckNow = () => {
    if (status !== 'pending') return;
    checkStatus();
  };

  const handleTryAgain = () => {
    router.replace('/(onboarding)' as any);
  };

  const renderPending = () => (
    <>
      <View style={[styles.iconCircle, { backgroundColor: theme.brandSoft }]}>
        <Ionicons name="time-outline" size={48} color={theme.brand} />
      </View>
      <PhonkText style={styles.titleLarge}>
        <Text style={[styles.greenText, { color: theme.brand }]}>{t('onboarding_pending_title')}</Text>
      </PhonkText>
      <Text style={[styles.subtitle, { color: theme.mutedText }]}>{t('onboarding_pending_email_notification')}</Text>

      {email && (
        <View style={[styles.emailBadge, { backgroundColor: theme.cardMuted }]}>
          <Ionicons name="mail-outline" size={16} color={theme.iconMuted} />
          <Text style={[styles.emailText, { color: theme.text }]} numberOfLines={1}>{email}</Text>
        </View>
      )}

      <OnboardingButtonMotion enabled={!checking} disabledOpacity={0.7}>
        <TouchableOpacity
          style={[styles.checkButton, { backgroundColor: theme.brandSoft }]}
          onPress={handleCheckNow}
          disabled={checking}
          activeOpacity={0.7}
        >
          {checking ? (
            <ActivityIndicator color={theme.brand} size="small" />
          ) : (
            <Text style={[styles.checkButtonText, { color: theme.brandText }]}>{t('onboarding_pending_check_status')}</Text>
          )}
        </TouchableOpacity>
      </OnboardingButtonMotion>

      {lastChecked && (
        <Text style={[styles.lastCheckedText, { color: theme.subtleText }]}>
          {t('onboarding_pending_last_checked', {
            time: lastChecked.toLocaleTimeString(),
          })}
        </Text>
      )}
    </>
  );

  const renderApproved = () => (
    <>
      <View style={[styles.iconCircle, { backgroundColor: theme.brandSoft }]}>
        <Ionicons name="checkmark-circle-outline" size={56} color={theme.brand} />
      </View>
      <PhonkText style={styles.titleLarge}>
        <Text style={[styles.greenText, { color: theme.brand }]}>{t('onboarding_pending_approved_title')}</Text>
      </PhonkText>
      <Text style={[styles.subtitle, { color: theme.mutedText }]}>{t('onboarding_pending_approved_message')}</Text>
      <ActivityIndicator color={theme.brand} size="large" style={styles.spinner} />
    </>
  );

  const renderRejected = () => (
    <>
      <View style={[styles.iconCircle, { backgroundColor: '#FFEBEE' }]}>
        <Ionicons name="close-circle-outline" size={56} color="#E53935" />
      </View>
      <PhonkText style={styles.titleLarge}>
        <Text style={styles.redText}>{t('onboarding_pending_rejected_title')}</Text>
      </PhonkText>
      <Text style={[styles.subtitle, { color: theme.mutedText }]}>
        {rejectionReason
          ? t('onboarding_pending_rejection_reason', { reason: rejectionReason })
          : t('onboarding_pending_rejected_default')}
      </Text>
      <OnboardingButtonMotion enabled={true}>
        <TouchableOpacity style={[styles.tryAgainButton, { backgroundColor: theme.actionSolid }]} onPress={handleTryAgain} activeOpacity={0.8}>
          <Text style={[styles.tryAgainButtonText, { color: theme.onActionSolid }]}>{t('onboarding_pending_try_again')}</Text>
        </TouchableOpacity>
      </OnboardingButtonMotion>
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />

      <OnboardingScreenMotion style={styles.headerBackground}>
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          {/* No navigation buttons — user cannot leave this screen */}
        </SafeAreaView>
      </OnboardingScreenMotion>

      <OnboardingCardMotion style={[styles.cardContainer, { backgroundColor: theme.background }]}>
        <View style={styles.card}>
          <View style={styles.centerContent}>
            {status === 'pending' && (
              <OnboardingStateMotion key="pending" style={styles.statusContent}>
                {renderPending()}
              </OnboardingStateMotion>
            )}
            {status === 'approved' && (
              <OnboardingStateMotion key="approved" style={styles.statusContent}>
                {renderApproved()}
              </OnboardingStateMotion>
            )}
            {status === 'rejected' && (
              <OnboardingStateMotion key="rejected" style={styles.statusContent}>
                {renderRejected()}
              </OnboardingStateMotion>
            )}
          </View>
        </View>
      </OnboardingCardMotion>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBackground: { height: 250, backgroundColor: Colors.brandGreen },
  headerContent: { paddingHorizontal: 20, paddingTop: 10 },
  cardContainer: {
    flex: 1,
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    marginTop: -80,
    paddingHorizontal: 28,
    paddingTop: 36,
  },
  card: { flex: 1 },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  statusContent: {
    alignItems: 'center',
    width: '100%',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  titleLarge: { fontSize: 28, textAlign: 'center', lineHeight: 34, marginBottom: 16 },
  greenText: {},
  redText: { color: '#E53935' },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: Typography.poppins.medium,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  emailBadge: {
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
    maxWidth: '100%',
  },
  emailText: {
    flexShrink: 1,
    fontSize: 15,
    fontFamily: Typography.poppins.medium,
  },
  checkButton: {
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginBottom: 12,
  },
  checkButtonText: {
    fontSize: 14,
    fontFamily: Typography.poppins.semiBold,
  },
  lastCheckedText: {
    fontSize: 12,
    fontFamily: Typography.poppins.medium,
  },
  spinner: {
    marginTop: 16,
  },
  tryAgainButton: {
    borderRadius: 28,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  tryAgainButtonText: {
    fontSize: 16,
    fontFamily: Typography.poppins.semiBold,
  },
});
