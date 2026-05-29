import { Ionicons } from '@expo/vector-icons';
import { getAuth, signInWithCustomToken } from '@react-native-firebase/auth';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  I18nManager,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
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
  OnboardingShakeMotion,
  OnboardingStateMotion,
  OnboardingStaggerItem,
} from '../../components/onboarding/OnboardingMotion';
import { logger } from '../../utils/logger';
import { useTranslation } from 'react-i18next';
import { savePendingVerification } from '../../utils/verificationPending';
import { getVerificationImages, clearVerificationImages } from '../../utils/verificationStore';

const OTP_LENGTH = 6;

export default function VerifyOtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; purpose?: string; role?: string }>();
  const { email, purpose, role } = params;
  const { t } = useTranslation();
  const { theme } = useAppTheme();

  const isRTL = I18nManager.isRTL;
  const arrowIconName = isRTL ? 'arrow-forward' : 'arrow-back';
  const _inputTextAlign: 'left' | 'right' = isRTL ? 'right' : 'left';
  void _inputTextAlign;

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorAnimationKey, setErrorAnimationKey] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(60);
  const [resendLoading, setResendLoading] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const handleOtpChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];

    // Handle paste of full code
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, OTP_LENGTH);
      for (let i = 0; i < OTP_LENGTH; i++) {
        newOtp[i] = digits[i] || '';
      }
      setOtp(newOtp);
      const focusIndex = Math.min(digits.length, OTP_LENGTH - 1);
      inputRefs.current[focusIndex]?.focus();
      return;
    }

    newOtp[index] = value;
    setOtp(newOtp);
    setError(null);

    // Auto-advance
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
    }
  };

  const isOtpComplete = otp.every((digit) => digit !== '');

  const handleVerify = useCallback(async () => {
    if (!isOtpComplete || !email || !purpose || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const fnInstance = getFunctions(undefined, 'me-central1');
      const verifyOtpFn = httpsCallable(fnInstance, 'verifyOtp');
      const result = await verifyOtpFn({
        email,
        code: otp.join(''),
        purpose,
      });

      // Handle verification purpose (student ID verification)
      if (purpose === 'verification') {
        const { emailVerified } = result.data as { emailVerified: boolean };
        if (emailVerified) {
          // Submit the verification request with stored images
          const images = getVerificationImages();
          const submitFn = httpsCallable(fnInstance, 'submitVerificationRequest');
          await submitFn({
            email,
            idFrontBase64: images.frontBase64,
            idBackBase64: images.backBase64,
            role: role || 'student',
          });
          clearVerificationImages();
          await savePendingVerification(email, role || 'student');
          router.replace({
            pathname: '/(onboarding)/pending',
            params: { email },
          });
        }
        return;
      }

      const { customToken } = result.data as { customToken: string };

      // Sign in with custom token
      const authInstance = getAuth();
      await signInWithCustomToken(authInstance, customToken);

      // Navigate based on purpose
      if (purpose === 'signup') {
        router.replace({
          pathname: '/(onboarding)/details',
          params: { role: role || 'student', email },
        });
      }
      // Login: _layout.tsx auto-routes to (tabs) via onAuthStateChanged
    } catch (err: any) {
      logger.error(err);

      const code = err.code || '';
      const message = err.message || t('onboarding_otp_generic_error');

      if (code === 'invalid-argument') {
        // Wrong code
        setError(message);
        setErrorAnimationKey((value) => value + 1);
        // Clear OTP input
        setOtp(Array(OTP_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
      } else if (code === 'deadline-exceeded' || code === 'permission-denied' || code === 'resource-exhausted') {
        setError(message);
      } else if (code === 'not-found') {
        setError(message);
      } else {
        Alert.alert(t('error'), message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [otp, email, purpose, role, isLoading, router, t, isOtpComplete]);

  const handleResend = async () => {
    if (cooldownSeconds > 0 || resendLoading || !email || !purpose) return;

    setResendLoading(true);
    setError(null);
    setOtp(Array(OTP_LENGTH).fill(''));

    try {
      const fnInstance = getFunctions(undefined, 'me-central1');
      const sendOtpFn = httpsCallable(fnInstance, 'sendOtp');
      await sendOtpFn({ email, purpose });
      setCooldownSeconds(60);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      logger.error(err);
      Alert.alert(t('error'), err.message || t('onboarding_otp_send_failed'));
    } finally {
      setResendLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const titleText = purpose === 'login'
    ? t('onboarding_otp_check_email_title')
    : purpose === 'verification'
    ? t('onboarding_otp_verify_title')
    : t('onboarding_otp_verify_title');

  // Split title into first words and last word for visual hierarchy
  const titleWords = titleText.split(' ');
  const titlePrefix = titleWords.slice(0, -1).join(' ');
  const titleSuffix = titleWords[titleWords.length - 1];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />

      <OnboardingScreenMotion style={styles.headerBackground}>
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <View style={[styles.topButtons, isRTL && styles.topButtonsRTL]}>
            <TouchableOpacity onPress={handleBack} style={[styles.iconButton, { backgroundColor: theme.logoTile }]}>
              <Ionicons name={arrowIconName} size={24} color={theme.logoTileText} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.replace('/')} style={[styles.iconButton, { backgroundColor: theme.logoTile }]}>
              <Ionicons name="close" size={24} color={theme.logoTileText} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </OnboardingScreenMotion>

      <OnboardingCardMotion style={[styles.cardContainer, { backgroundColor: theme.background, flex: 1 }]}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.card}>
            <OnboardingStaggerItem delay={120}>
            <View style={[styles.iconCircle, { backgroundColor: theme.brandSoft }]}>
              <Ionicons name="mail-open-outline" size={40} color={theme.brand} />
            </View>
            </OnboardingStaggerItem>

            <OnboardingStaggerItem delay={170}>
            <View style={styles.textContainer}>
              <Text style={[styles.titleSmall, { color: theme.mutedText }]}>{titlePrefix}</Text>
              <PhonkText style={styles.titleLarge}>
                <Text style={[styles.greenText, { color: theme.brand }]}>{titleSuffix}</Text>
              </PhonkText>
            </View>
            </OnboardingStaggerItem>

            <OnboardingStaggerItem delay={220}>
            <Text style={[styles.subtitle, { color: theme.subtleText }]}>
              {t('onboarding_otp_subtitle', { email: '' })}
            </Text>
            {email ? <Text style={[styles.emailText, { color: theme.text }]}>{email}</Text> : null}
            </OnboardingStaggerItem>

            <OnboardingShakeMotion trigger={errorAnimationKey}>
            <View style={[styles.otpContainer, isRTL && styles.otpContainerRTL]}>
              {Array.from({ length: OTP_LENGTH }).map((_, index) => (
                <OnboardingStateMotion key={index} delay={260 + index * 25} style={[
                  styles.otpBox,
                  {
                    backgroundColor: otp[index] ? theme.brandSoft : theme.cardMuted,
                    borderColor: otp[index]
                      ? theme.brand
                      : (!otp[index] && index === otp.findIndex(d => d === '') ? theme.borderStrong : 'transparent'),
                  },
                ]}>
                  <TextInput
                    ref={(ref) => { inputRefs.current[index] = ref; }}
                    style={[styles.otpInput, { color: theme.text }]}
                    keyboardType="number-pad"
                    maxLength={OTP_LENGTH}
                    value={otp[index]}
                    onChangeText={(value) => handleOtpChange(value, index)}
                    onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                    editable={!isLoading}
                    autoFocus={index === 0}
                    selectTextOnFocus
                  />
                </OnboardingStateMotion>
              ))}
            </View>
            </OnboardingShakeMotion>

            {error && (
              <OnboardingStateMotion>
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={16} color="#E53935" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
              </OnboardingStateMotion>
            )}

            <OnboardingStaggerItem delay={430}>
            <View style={styles.resendContainer}>
              {cooldownSeconds > 0 ? (
                <Text style={[styles.cooldownText, { color: theme.subtleText }]}>
                  {t('onboarding_otp_resend_in', { seconds: cooldownSeconds })}
                </Text>
              ) : (
                <TouchableOpacity onPress={handleResend} disabled={resendLoading} style={styles.resendButton}>
                  {resendLoading ? (
                    <ActivityIndicator size="small" color={theme.brand} />
                  ) : (
                    <Text style={[styles.resendText, { color: theme.brandText }]}>{t('onboarding_otp_resend')}</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
            </OnboardingStaggerItem>
          </View>
        </TouchableWithoutFeedback>
      </OnboardingCardMotion>

      <View style={[styles.footer, { backgroundColor: theme.background }]}>
        <OnboardingButtonMotion enabled={Boolean(isOtpComplete && !isLoading)}>
        <TouchableOpacity
          style={[styles.button, isOtpComplete && !isLoading && styles.buttonEnabled]}
          onPress={handleVerify}
          disabled={!isOtpComplete || isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color={theme.onActionSolid} />
          ) : (
            <Text style={[styles.buttonText, { color: theme.onActionSolid }]}>{t('onboarding_otp_verify_button')}</Text>
          )}
        </TouchableOpacity>
        </OnboardingButtonMotion>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBackground: { height: 250, backgroundColor: Colors.brandGreen },
  headerContent: { paddingHorizontal: 20, paddingTop: 10 },
  topButtons: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10 },
  topButtonsRTL: { flexDirection: 'row-reverse' },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContainer: {
    flex: 1,
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    marginTop: -80,
    paddingHorizontal: 28,
    paddingTop: 36,
  },
  card: { flex: 1, alignItems: 'center' },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  textContainer: { marginBottom: 12, alignItems: 'center' },
  titleSmall: {
    fontSize: 16,
    fontFamily: Typography.poppins.medium,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 4,
    textAlign: 'center',
  },
  titleLarge: { fontSize: 36, textAlign: 'center', lineHeight: 42 },
  greenText: {},
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: Typography.poppins.medium,
    marginBottom: 2,
    paddingHorizontal: 10,
  },
  emailText: {
    fontSize: 14,
    textAlign: 'center',
    fontFamily: Typography.poppins.semiBold,
    marginBottom: 28,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  otpContainerRTL: {
    flexDirection: 'row-reverse',
  },
  otpBox: {
    width: 50,
    height: 58,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBoxFilled: {},
  otpBoxActive: {},
  otpInput: {
    width: '100%',
    height: '100%',
    fontSize: 24,
    fontFamily: Typography.poppins.semiBold,
    textAlign: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 0,
    includeFontPadding: false,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 8,
    gap: 6,
  },
  errorText: {
    fontSize: 13,
    color: '#E53935',
    fontFamily: Typography.poppins.medium,
    flex: 1,
  },
  resendContainer: {
    marginTop: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  resendButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  cooldownText: {
    fontSize: 14,
    fontFamily: Typography.poppins.medium,
  },
  resendText: {
    fontSize: 14,
    fontFamily: Typography.poppins.semiBold,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  button: {
    backgroundColor: Colors.brandGreen,
    height: 62,
    borderRadius: 31,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonEnabled: {
    opacity: 1,
    shadowColor: Colors.brandGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontSize: 17,
    fontFamily: Typography.poppins.semiBold,
  },
});
