import { Ionicons } from '@expo/vector-icons';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  I18nManager,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
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
  OnboardingStaggerItem,
} from '../../components/onboarding/OnboardingMotion';
import { logger } from '../../utils/logger';
import { useTranslation } from 'react-i18next';

const normalizeEmail = (email: string): string => {
  const trimmed = email.trim().toLowerCase();
  const [local, domain] = trimmed.split('@');
  if (!domain) return trimmed;
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    const cleanLocal = local.split('+')[0].replace(/\./g, '');
    return `${cleanLocal}@gmail.com`;
  }
  return trimmed;
};

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: string }>();
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const isRTL = I18nManager.isRTL;
  const arrowIconName = isRTL ? 'arrow-forward' : 'arrow-back';
  const inputTextAlign: 'left' | 'right' = isRTL ? 'right' : 'left';

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleBack = () => {
    router.back();
  };

  const handleContinue = async () => {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return;

    setIsLoading(true);
    try {
      const fnInstance = getFunctions(undefined, 'me-central1');
      const sendOtp = httpsCallable(fnInstance, 'sendOtp');
      await sendOtp({ email: normalizedEmail, purpose: 'verification' });

      router.replace({
        pathname: '/(onboarding)/verify',
        params: { email: normalizedEmail, purpose: 'verification', role },
      });
    } catch (err: any) {
      logger.error(err);
      Alert.alert(t('error'), err.message || t('onboarding_generic_error_message'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
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
              <Ionicons name="shield-checkmark-outline" size={36} color={theme.brand} />
            </View>
            </OnboardingStaggerItem>

            <OnboardingStaggerItem delay={170}>
            <View style={styles.textContainer}>
              <Text style={[styles.titleSmall, { color: theme.mutedText }]}>{t('onboarding_verify_email_title_prefix')}</Text>
              <PhonkText style={styles.titleLarge}>
                <Text style={[styles.greenText, { color: theme.brand }]}>{t('onboarding_verify_email_title_suffix')}</Text>
              </PhonkText>
            </View>
            </OnboardingStaggerItem>

            <OnboardingStaggerItem delay={220} style={styles.inputWrapper}>
              <View
                style={[
                  styles.singleInputContainer,
                  { backgroundColor: email ? theme.brandSoft : theme.cardMuted, borderColor: email ? theme.brand : 'transparent' },
                ]}
              >
                <Ionicons name="mail-outline" size={20} color={email ? theme.brand : theme.iconMuted} style={styles.inputIcon} />
                <TextInput
                  ref={inputRef}
                  style={[styles.input, { color: theme.text, textAlign: inputTextAlign, flex: 1 }]}
                  placeholder={t('onboarding_email_placeholder')}
                  placeholderTextColor={theme.inputPlaceholder}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={setEmail}
                  editable={!isLoading}
                  autoFocus
                />
              </View>
            </OnboardingStaggerItem>

            <OnboardingStaggerItem delay={270}>
            <Text style={[styles.infoText, { color: theme.subtleText }]}>{t('onboarding_verify_email_description')}</Text>
            </OnboardingStaggerItem>
          </View>
        </TouchableWithoutFeedback>

        <View style={styles.footer}>
          <OnboardingButtonMotion enabled={Boolean(email && !isLoading)}>
          <TouchableOpacity
            style={[styles.button, email && !isLoading && styles.buttonEnabled]}
            onPress={handleContinue}
            disabled={isLoading || !email}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color={theme.onActionSolid} />
            ) : (
              <Text style={[styles.buttonText, { color: theme.onActionSolid }]}>{t('onboarding_continue')}</Text>
            )}
          </TouchableOpacity>
          </OnboardingButtonMotion>
        </View>
      </OnboardingCardMotion>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBackground: { height: 250, backgroundColor: Colors.brandGreen },
  headerContent: { paddingHorizontal: 20, paddingTop: 10 },
  topButtons: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10 },
  topButtonsRTL: { flexDirection: 'row-reverse' },
  iconButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 1)',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  cardContainer: {
    flex: 1,
    borderTopLeftRadius: 50, borderTopRightRadius: 50,
    marginTop: -80, paddingHorizontal: 28, paddingTop: 36,
  },
  card: { flex: 1, alignItems: 'center' },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16, marginTop: 8,
  },
  textContainer: { marginBottom: 32, alignItems: 'center' },
  titleSmall: {
    fontSize: 14, fontFamily: Typography.poppins.medium,
    textTransform: 'uppercase', letterSpacing: 2,
    marginBottom: 4, textAlign: 'center',
  },
  titleLarge: { fontSize: 32, textAlign: 'center', lineHeight: 38 },
  greenText: {},
  inputWrapper: { marginBottom: 20, width: '100%' },
  singleInputContainer: {
    borderRadius: 16,
    height: 58, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, borderWidth: 2, borderColor: 'transparent',
  },
  inputFocused: {},
  inputIcon: { marginRight: 10 },
  input: { fontSize: 16, fontFamily: Typography.poppins.medium, paddingVertical: 0, includeFontPadding: false },
  infoText: {
    fontSize: 14, textAlign: 'center',
    lineHeight: 20, paddingHorizontal: 10,
    fontFamily: Typography.poppins.medium, margin: 8,
  },
  footer: { paddingBottom: 40, marginTop: 'auto' },
  button: {
    backgroundColor: Colors.brandGreen, height: 62, borderRadius: 31,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  buttonEnabled: {
    opacity: 1,
    shadowColor: Colors.brandGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  buttonText: { fontSize: 17, fontFamily: Typography.poppins.semiBold },
});
