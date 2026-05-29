import { Ionicons } from '@expo/vector-icons';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { getAuth, signInWithCustomToken } from '@react-native-firebase/auth';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  I18nManager,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
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
  OnboardingStateMotion,
  OnboardingStaggerItem,
} from '../../components/onboarding/OnboardingMotion';
import { logger } from '../../utils/logger';
import { useTranslation } from 'react-i18next';

// Email normalization
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

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const isRTL = I18nManager.isRTL;
  const arrowIconName = isRTL ? 'arrow-forward' : 'arrow-back';
  const inputTextAlign: 'left' | 'right' = isRTL ? 'right' : 'left';
  const { prefillEmail } = useLocalSearchParams<{ prefillEmail?: string }>();
  const [email, setEmail] = useState(prefillEmail || '');
  const [isLoading, setIsLoading] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleBack = () => {
    router.back();
  };

  const handleLogin = async () => {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return;

    setIsLoading(true);

    try {
      const fnInstance = getFunctions(undefined, 'me-central1');
      const sendOtp = httpsCallable(fnInstance, 'sendOtp');
      const result = await sendOtp({ email: normalizedEmail, purpose: 'login' });
      const data = result.data as { success?: boolean; customToken?: string };

      if (data.customToken) {
        const authInstance = getAuth();
        await signInWithCustomToken(authInstance, data.customToken);
        return;
      }

      router.replace({
        pathname: '/(onboarding)/verify',
        params: { email: normalizedEmail, purpose: 'login' },
      });
    } catch (err: any) {
      logger.error(err);

      // If account not found, show signup modal
      if (err.code === 'not-found') {
        setShowSignUpModal(true);
        return;
      }

      Alert.alert(t('error'), err.message || t('onboarding_generic_error_message'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = async () => {
    await handleLogin();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />

      <KeyboardAvoidingView
        style={styles.contentArea}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
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

        <OnboardingCardMotion style={[styles.cardContainer, { backgroundColor: theme.background }]}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.card}>
              <OnboardingStaggerItem delay={120}>
              <View style={[styles.iconCircle, { backgroundColor: theme.brandSoft }]}>
                <Ionicons name="log-in-outline" size={36} color={theme.brand} />
              </View>
              </OnboardingStaggerItem>

              <OnboardingStaggerItem delay={170}>
              <View style={styles.textContainer}>
                <PhonkText style={styles.titleLarge}>
                  <Text style={[styles.greenText, { color: theme.brand }]}>{t('onboarding_login_title')}</Text>
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
                    autoFocus={true}
                  />
                </View>
              </OnboardingStaggerItem>

              <OnboardingStaggerItem delay={270}>
              <Text style={[styles.infoText, { color: theme.subtleText }]}>
                {t('onboarding_login_info')}
              </Text>
              </OnboardingStaggerItem>
            </View>
          </TouchableWithoutFeedback>
        </OnboardingCardMotion>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { backgroundColor: theme.background }]}>
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
            <Text style={[styles.buttonText, { color: theme.onActionSolid }]}>
              {t('onboarding_login_title')}
            </Text>
          )}
        </TouchableOpacity>
        </OnboardingButtonMotion>
      </View>

      <Modal
        visible={showSignUpModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSignUpModal(false)}
      >
        <View style={styles.modalOverlay}>
          <OnboardingStateMotion style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={[styles.modalIconContainer, { backgroundColor: theme.brandSoft }]}>
              <Ionicons name="person-add-outline" size={40} color={theme.brand} />
            </View>
            <PhonkText style={[styles.modalTitle, { color: theme.brand }]}>{t('onboarding_account_not_found_title')}</PhonkText>
            <Text style={[styles.modalText, { color: theme.mutedText }]}>{t('onboarding_account_not_found_message')}</Text>

            <TouchableOpacity
              style={styles.modalPrimaryButton}
              onPress={() => {
                setShowSignUpModal(false);
                router.push({ pathname: '/(onboarding)/email', params: { role: 'student', mode: 'signup' } });
              }}
            >
              <Text style={[styles.modalPrimaryButtonText, { color: theme.onActionSolid }]}>{t('onboarding_sign_up')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalSecondaryButton}
              onPress={() => setShowSignUpModal(false)}
            >
              <Text style={[styles.modalSecondaryButtonText, { color: theme.subtleText }]}>{t('cancel')}</Text>
            </TouchableOpacity>
          </OnboardingStateMotion>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentArea: {
    flex: 1,
  },
  headerBackground: {
    height: 250,
    backgroundColor: Colors.brandGreen,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  topButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
  },
  topButtonsRTL: {
    flexDirection: 'row-reverse',
  },
  iconButton: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  cardContainer: {
    flex: 1,
    borderTopLeftRadius: 50, borderTopRightRadius: 50,
    marginTop: -80, paddingHorizontal: 28, paddingTop: 36,
  },
  card: {
    flex: 1, alignItems: 'center',
  },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16, marginTop: 8,
  },
  textContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  titleLarge: {
    fontSize: 32, textAlign: 'center', lineHeight: 38,
  },
  greenText: {
  },
  inputWrapper: {
    marginBottom: 20, width: '100%',
  },
  singleInputContainer: {
    borderRadius: 16,
    height: 58, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, borderWidth: 2, borderColor: 'transparent',
  },
  inputFocused: {},
  inputIcon: { marginRight: 10 },
  input: {
    fontSize: 16,
    fontFamily: Typography.poppins.medium,
    paddingVertical: 0,
    includeFontPadding: false,
  },
  infoText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
    fontFamily: Typography.poppins.medium,
  },
  footer: {
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
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
  buttonText: {
    fontSize: 17, fontFamily: Typography.poppins.semiBold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 30,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 13,
    elevation: 10,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    marginBottom: 15,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    fontFamily: Typography.poppins.medium,
    lineHeight: 24,
  },
  modalPrimaryButton: {
    backgroundColor: Colors.brandGreen,
    height: 56,
    borderRadius: 28,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalPrimaryButtonText: {
    fontSize: 16,
    fontFamily: Typography.poppins.semiBold,
  },
  modalSecondaryButton: {
    height: 56,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSecondaryButtonText: {
    fontSize: 16,
    fontFamily: Typography.poppins.medium,
  },
});
