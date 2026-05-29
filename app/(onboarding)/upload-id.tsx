import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  I18nManager,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
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
import { useTranslation } from 'react-i18next';
import { setVerificationImages } from '../../utils/verificationStore';

const MAX_SIZE_BYTES = 3 * 1024 * 1024; // 3MB

export default function UploadIdScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const isRTL = I18nManager.isRTL;
  const arrowIconName = isRTL ? 'arrow-forward' : 'arrow-back';
  const { role } = useLocalSearchParams<{ role?: string }>();

  const [frontImage, setFrontImage] = useState<{ uri: string; base64: string } | null>(null);
  const [backImage, setBackImage] = useState<{ uri: string; base64: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const pickImage = async (side: 'front' | 'back') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
      allowsEditing: true,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];

    if (asset.base64 && Math.ceil((asset.base64.length * 3) / 4) > MAX_SIZE_BYTES) {
      Alert.alert(t('error'), t('onboarding_upload_image_too_large'));
      return;
    }

    const imageData = {
      uri: asset.uri,
      base64: asset.base64 || '',
    };

    if (side === 'front') {
      setFrontImage(imageData);
    } else {
      setBackImage(imageData);
    }
  };

  const handleContinue = () => {
    if (!frontImage || !backImage || isLoading) return;

    setIsLoading(true);
    try {
      setVerificationImages(frontImage.base64, backImage.base64);
      router.push({
        pathname: '/(onboarding)/verify-email',
        params: { mode: 'verification', role },
      } as any);
    } catch (err: any) {
      Alert.alert(t('error'), err.message || t('onboarding_generic_error_message'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const bothUploaded = frontImage && backImage;

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

      <OnboardingCardMotion style={[styles.cardContainer, { backgroundColor: theme.background }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.card}
        >
          <OnboardingStaggerItem delay={120}>
          <View style={[styles.iconCircle, { backgroundColor: theme.brandSoft }]}>
            <Ionicons name="card-outline" size={32} color={theme.brand} />
          </View>
          </OnboardingStaggerItem>

          <OnboardingStaggerItem delay={170}>
          <View style={styles.textContainer}>
            <Text style={[styles.titleSmall, { color: theme.mutedText }]}>{t('onboarding_upload_id_title_prefix')}</Text>
            <PhonkText style={styles.titleLarge}>
              <Text style={[styles.greenText, { color: theme.brand }]}>{t('onboarding_upload_id_title_suffix')}</Text>
            </PhonkText>
          </View>
          </OnboardingStaggerItem>

          <OnboardingStaggerItem delay={220}>
          <Text style={[styles.subtitle, { color: theme.mutedText }]}>{t('onboarding_upload_id_description')}</Text>
          </OnboardingStaggerItem>

          <OnboardingStaggerItem delay={270} style={styles.uploadContainer}>
            {/* Front upload */}
            <TouchableOpacity
              style={[
                styles.uploadZone,
                { backgroundColor: theme.cardMuted, borderColor: theme.border },
                frontImage && { backgroundColor: theme.brandSoft, borderColor: theme.brand, borderStyle: 'solid' },
              ]}
              onPress={() => pickImage('front')}
              activeOpacity={0.7}
            >
              {frontImage ? (
                <OnboardingStateMotion key="front-preview" style={styles.previewContainer}>
                  <Image source={{ uri: frontImage.uri }} style={styles.previewImage} contentFit="contain" />
                  <View style={styles.replaceBadge}>
                    <Text style={styles.replaceText}>{t('onboarding_upload_replace')}</Text>
                  </View>
                </OnboardingStateMotion>
              ) : (
                <OnboardingStateMotion key="front-placeholder" style={styles.uploadPlaceholder}>
                  <Ionicons name="camera-outline" size={32} color={theme.iconMuted} />
                  <Text style={[styles.uploadLabel, { color: theme.subtleText }]}>{t('onboarding_upload_front')}</Text>
                </OnboardingStateMotion>
              )}
            </TouchableOpacity>

            {/* Back upload */}
            <TouchableOpacity
              style={[
                styles.uploadZone,
                { backgroundColor: theme.cardMuted, borderColor: theme.border },
                backImage && { backgroundColor: theme.brandSoft, borderColor: theme.brand, borderStyle: 'solid' },
              ]}
              onPress={() => pickImage('back')}
              activeOpacity={0.7}
            >
              {backImage ? (
                <OnboardingStateMotion key="back-preview" style={styles.previewContainer}>
                  <Image source={{ uri: backImage.uri }} style={styles.previewImage} contentFit="contain" />
                  <View style={styles.replaceBadge}>
                    <Text style={styles.replaceText}>{t('onboarding_upload_replace')}</Text>
                  </View>
                </OnboardingStateMotion>
              ) : (
                <OnboardingStateMotion key="back-placeholder" style={styles.uploadPlaceholder}>
                  <Ionicons name="camera-outline" size={32} color={theme.iconMuted} />
                  <Text style={[styles.uploadLabel, { color: theme.subtleText }]}>{t('onboarding_upload_back')}</Text>
                </OnboardingStateMotion>
              )}
            </TouchableOpacity>
          </OnboardingStaggerItem>

          <OnboardingStaggerItem delay={330}>
          <Text style={[styles.infoText, { color: theme.subtleText }]}>{t('onboarding_upload_id_info')}</Text>
          </OnboardingStaggerItem>
        </KeyboardAvoidingView>

        <View style={styles.footer}>
          <OnboardingButtonMotion enabled={Boolean(bothUploaded && !isLoading)}>
          <TouchableOpacity
            style={[styles.button, bothUploaded && !isLoading && styles.buttonEnabled]}
            onPress={handleContinue}
            disabled={!bothUploaded || isLoading}
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
    marginBottom: 12, marginTop: 4,
  },
  textContainer: { marginBottom: 12, alignItems: 'center' },
  titleSmall: {
    fontSize: 14, fontFamily: Typography.poppins.medium,
    textTransform: 'uppercase', letterSpacing: 2,
    marginBottom: 4, textAlign: 'center',
  },
  titleLarge: { fontSize: 32, textAlign: 'center', lineHeight: 38 },
  greenText: {},
  subtitle: {
    fontSize: 14, textAlign: 'center',
    lineHeight: 20, fontFamily: Typography.poppins.medium,
    marginBottom: 24, paddingHorizontal: 10,
  },
  uploadContainer: {
    flexDirection: 'row', gap: 14, marginBottom: 20, width: '100%',
  },
  uploadZone: {
    flex: 1, height: 170, borderRadius: 20,
    borderWidth: 2, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  uploadZoneFilled: {
    borderWidth: 2,
  },
  uploadPlaceholder: {
    justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  uploadLabel: {
    fontSize: 13, fontFamily: Typography.poppins.medium,
    textAlign: 'center',
  },
  previewContainer: {
    width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center',
  },
  previewImage: {
    width: '100%', height: '100%', borderRadius: 18,
  },
  replaceBadge: {
    position: 'absolute', bottom: 8, right: 8,
    backgroundColor: Colors.brandGreen, borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  replaceText: {
    color: '#fff', fontSize: 11, fontFamily: Typography.poppins.semiBold,
  },
  infoText: {
    fontSize: 13, textAlign: 'center',
    lineHeight: 18, fontFamily: Typography.poppins.medium,
    paddingHorizontal: 10,
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
