import { Ionicons } from '@expo/vector-icons';
import { getAuth, signOut } from '@react-native-firebase/auth';
import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, I18nManager, ImageBackground, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Updates from 'expo-updates';

import { logger } from '../../utils/logger';
import { toArabicDigits } from '../../utils/numbers';
import { Typography } from '../../constants/Typography';
import PhonkText from '../../components/PhonkText';
import i18n, { setStoredLanguage } from '../../src/localization/i18n';
import { applyRTL } from '../../src/localization/rtl';
import { useStudent } from '../../context/StudentContext';
import UserAvatar from '../../components/UserAvatar';
import { useAppTheme } from '../../context/AppThemeContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isDark, theme } = useAppTheme();
  const isRTL = I18nManager.isRTL;
  const { studentData: userData } = useStudent();

  const changeLanguage = async (language: 'en' | 'ar') => {
    if (i18n.language === language) {
      return;
    }

    try {
      await i18n.changeLanguage(language);
      await setStoredLanguage(language);
      applyRTL(language);
      await Updates.reloadAsync();
    } catch (error) {
      logger.error('Language change error:', error);
      Alert.alert(t('restart_required'), t('restart_message'));
    }
  };

  const handleChangeLanguage = () => {
    Alert.alert(
      t('select_language'),
      '',
      [
        { text: t('english'), onPress: () => void changeLanguage('en') },
        { text: t('arabic'), onPress: () => void changeLanguage('ar') },
        { text: t('cancel'), style: 'cancel' },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      t('logout_title'),
      t('logout_message'),
      [
        {
          text: t('cancel'),
          style: 'cancel',
        },
        {
          text: t('log_out'),
          style: 'destructive',
          onPress: async () => {
            try {
              const auth = getAuth();
              if (auth.currentUser) {
                await signOut(auth);
              }
            } catch (error) {
              logger.error('Logout error:', error);
              Alert.alert(t('error'), t('logout_failed'));
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <PhonkText
            style={[
              { color: theme.text, textAlign: isRTL ? 'right' : 'left' },
              styles.headerText,
            ]}
          >
            {t('profile')}
          </PhonkText>
        </View>

        <View style={[styles.topPill, { backgroundColor: theme.cardMuted }]}>
          <View style={[styles.profileTopRow]}>
            <UserAvatar
              firstName={userData?.firstName}
              lastName={userData?.lastName}
              email={userData?.email || getAuth().currentUser?.email}
              photoURL={userData?.photoURL || getAuth().currentUser?.photoURL}
              role={userData?.role}
              seed={getAuth().currentUser?.uid}
              size={80}
            />
            <View style={[styles.badge, { backgroundColor: theme.brand }]}>
              <PhonkText style={[{ color: '#FFFFFF', textAlign: isRTL ? 'right' : 'left' }, styles.badgeText]}>{t('rookie_badge')}</PhonkText>
            </View>
          </View>
        </View>

        <View style={[styles.bottomPill, { backgroundColor: theme.cardMuted }]}>
          <View style={[styles.profileBottomRow]}>
            <View style={styles.userInfo}>
              <Text style={[{ color: theme.text, fontFamily: Typography.poppins.medium, textAlign: isRTL ? 'right' : 'left' }, styles.userName]}>
                {userData ? `${userData.firstName} ${userData.lastName}` : 'Darren Watkins'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: theme.surfaceElevated }]}
              onPress={() => router.push('/profile-details')}
            >
              <Ionicons name="create-outline" size={16} color={theme.iconMuted} />
              <PhonkText style={[{ color: theme.text, textAlign: isRTL ? 'right' : 'left' }, styles.editButtonText]}>
                {t('profile')}
              </PhonkText>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <PhonkText
            style={[
              { color: theme.text, textAlign: isRTL ? 'right' : 'left' },
              styles.sectionTitle,
              { textTransform: isRTL ? 'none' : 'uppercase' },
            ]}
          >
            {t('savings_tracker')}
          </PhonkText>
        </View>

        <View style={[styles.savingsCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
          <Text
            style={[
              { color: theme.text, fontFamily: Typography.poppins.medium },
              styles.savingsLabel,
              { textAlign: isRTL ? 'right' : 'left' },
            ]}
          >
            {t('all_time_saved')}
          </Text>
          <View style={[styles.savingsAmountContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}> 
            <PhonkText style={[{ color: theme.brandText, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }, styles.savingsAmountGreen]}>
              {t('amount_with_currency', { amount: isRTL ? toArabicDigits((userData?.savings ?? 0).toFixed(2)) : (userData?.savings ?? 0).toFixed(2), currency: t('currency_qar') })}
            </PhonkText>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.universityBanner} 
          onPress={() => router.push('/x-academy')}
          activeOpacity={0.9}
        >
          <ImageBackground
            source={require('../../assets/images/uni.png')}
            style={styles.universityBannerBg}
            imageStyle={{ borderRadius: 20 }}
          >
            <View style={styles.universityBannerOverlay}>
              <View style={[styles.onlyOnRealxBadge, isRTL && styles.badgeRTL]}>
                <PhonkText style={styles.onlyOnRealxText}>{t('only_on_realx')}</PhonkText>
              </View>
              
              <PhonkText style={[styles.universityBannerTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                {t('apply_to_universities')}
              </PhonkText>
              
              <TouchableOpacity
                style={[styles.universityBannerButton, { backgroundColor: theme.logoTile }]}
                onPress={() => router.push('/x-academy')}
                activeOpacity={0.8}
              >
                <PhonkText style={[styles.universityBannerButtonText, { color: theme.logoTileText }]}>{t('apply_now')}</PhonkText>
              </TouchableOpacity>
            </View>
          </ImageBackground>
        </TouchableOpacity>

        <View style={styles.menuContainer}>
          <MenuItem icon="bookmark-outline" label={t('saved_offers')} onPress={() => router.push('/saved-offers' as any)} isRTL={isRTL} />
          <MenuItem icon="time-outline" label={t('redemption_history')} onPress={() => router.push('/redemption-history' as any)} isRTL={isRTL} />
          <MenuItem icon="language-outline" label={t('change_language')} onPress={handleChangeLanguage} isRTL={isRTL} />
          <MenuItem
            icon="mail-outline"
            label={t('contact_us')}
            onPress={() => Linking.openURL('mailto:info@realx.qa')}
            isRTL={isRTL}
          />
          <MenuItem
            icon="document-text-outline"
            label={t('terms_and_conditions')}
            onPress={() => router.push('/terms')}
            isRTL={isRTL}
          />
          <MenuItem
            icon="shield-checkmark-outline"
            label={t('privacy_policy')}
            onPress={() => router.push('/privacy')}
            isRTL={isRTL}
          />
          <TouchableOpacity
            style={[styles.logoutPill, { backgroundColor: isDark ? 'rgba(255,107,95,0.12)' : '#FFF1F0', borderColor: theme.danger }]}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={[styles.logoutContent]}> 
              <Ionicons name="log-out-outline" size={20} color={theme.danger} />
              <PhonkText style={[styles.logoutText, { color: theme.danger, textAlign: isRTL ? 'right' : 'left' }]}>{t('log_out').toUpperCase()}</PhonkText>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  color,
  bgColor,
  isRTL,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  color?: string;
  bgColor?: string;
  isRTL: boolean;
}) {
  const { theme } = useAppTheme();

  return (
    <TouchableOpacity
      style={[
        styles.menuItem,
        { backgroundColor: bgColor || theme.cardMuted },
      ]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={[styles.menuItemLeft]}>
        <Ionicons name={icon} size={24} color={color || theme.icon} />
        <Text
          style={[
            { color: color || theme.text, fontFamily: Typography.poppins.medium },
            styles.menuItemLabel,
            { textAlign: isRTL ? 'right' : 'left' },
          ]}
        >
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 16,
  },
  headerText: {
    fontSize: 28,
    letterSpacing: 0.5,
  },
  topPill: {
    borderRadius: 30,
    padding: 8,
  },
  bottomPill: {
    borderRadius: 30,
    paddingVertical: 24,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  profileTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 30,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  profileBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
  },
  userName: {
    fontSize: 20,
    fontFamily: Typography.poppins.semiBold,
    paddingHorizontal: 4,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 30,
    gap: 6,
  },
  editButtonText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  sectionHeader: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    textTransform: 'uppercase',
  },
  savingsCard: {
    borderRadius: 32,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 2,
  },
  savingsLabel: {
    fontSize: 14,
    fontFamily: Typography.poppins.medium,
  },
  savingsAmountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  savingsAmountGreen: {
    fontSize: 32,
  },
  universityBanner: {
    marginBottom: 24,
    borderRadius: 30,
    overflow: 'hidden',
    height: 160,
  },
  universityBannerBg: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  universityBannerOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(100, 20, 20, 0.5)',
    padding: 16,
    justifyContent: 'space-between',
  },
  onlyOnRealxBadge: {
    backgroundColor: '#1AD04F',
    alignSelf: 'flex-end',
    marginTop: -18,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeRTL: {
    alignSelf: 'flex-start',
  },
  onlyOnRealxText: {
    color: '#FFF',
    fontSize: 10,
  },
  universityBannerTitle: {
    color: '#FFF',
    fontSize: 22,
    marginTop: -16,
    marginBottom: 8,
    lineHeight: 24,
  },
  universityBannerButton: {
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  universityBannerButtonText: {
    fontSize: 16,
  },
  menuContainer: {
    gap: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 24,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  menuItemLabel: {
    fontSize: 16,
    fontFamily: Typography.poppins.semiBold,
  },
  logoutPill: {
    borderRadius: 30,
    paddingVertical: 20,
    alignItems: 'center',
    borderWidth: 1,
  },
  logoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoutText: {
    fontSize: 14,
  },
});
