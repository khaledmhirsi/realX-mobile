import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, getFirestore } from '@react-native-firebase/firestore';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { logger } from '../utils/logger';
import {
  ActivityIndicator,
  Dimensions,
  I18nManager,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import PhonkText from '../components/PhonkText';
import { useAppTheme } from '../context/AppThemeContext';
import { Typography } from '../constants/Typography';

const { width } = Dimensions.get('window');

type University = {
  nameEn?: string;
  nameAr?: string;
  bannerUrl?: string;
  logoUrl?: string;
  bannerStatus?: boolean;
  link?: string;
};

export default function XAcademyScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { theme } = useAppTheme();
  const isRTL = I18nManager.isRTL;

  const [universities, setUniversities] = useState<(University & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUniversities = async () => {
      try {
        const db = getFirestore();
        const uniDocRef = doc(db, 'cms', 'university');
        const docSnap = await getDoc(uniDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data) {
            const unis = (data.universities || []) as (University & { id: string })[];
            setUniversities(unis);
          }
        }
      } catch (error) {
        logger.error('XAcademyScreen: Error fetching universities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUniversities();
  }, []);

  const bannerUnis = universities.filter(u => u.bannerStatus === true);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={['top']}
    >
      <View style={[styles.header, { borderBottomColor: theme.border }, isRTL && styles.rowReverse]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons
            name={isRTL ? 'arrow-forward' : 'arrow-back'}
            size={28}
            color={theme.icon}
          />
        </TouchableOpacity>

        <PhonkText style={styles.headerTitle}>
          <Text style={{ color: theme.brand }}>{t('x_academy_title_x')} </Text>
          <Text style={{ color: theme.text }}>{t('x_academy_title_academy')}</Text>
        </PhonkText>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          <ActivityIndicator size="large" color={theme.brand} style={styles.loader} />
        ) : (
          <>
            {/* Banners */}
            {bannerUnis.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[
                  styles.bannerScrollContent,
                  isRTL && styles.rowReverse,
                ]}
                snapToInterval={width * 0.85 + 16}
                decelerationRate="fast"
              >
                {bannerUnis.map(uni => (
                  <TouchableOpacity
                    key={`banner-${uni.id}`}
                    style={styles.carouselBanner}
                    onPress={() => uni.link && Linking.openURL(uni.link)}
                    activeOpacity={0.9}
                  >
                    <Image
                      source={{ uri: uni.bannerUrl }}
                      style={styles.carouselBannerImage}
                      contentFit="cover"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Section Title */}
            <View style={styles.sectionHeader}>
              <PhonkText
                style={[
                  styles.sectionTitle,
                  { color: theme.text, textAlign: isRTL ? 'right' : 'left' },
                ]}
              >
                {t('universities')}
              </PhonkText>
            </View>

            {/* Universities List */}
            <View style={styles.listContainer}>
              {universities.map(uni => {
                const uniName =
                  i18n.language === 'ar'
                    ? uni.nameAr || uni.nameEn
                    : uni.nameEn || uni.nameAr;

                return (
                  <TouchableOpacity
                    key={uni.id}
                    style={styles.uniCard}
                    onPress={() => uni.link && Linking.openURL(uni.link)}
                    activeOpacity={0.9}
                  >
                    <View style={styles.uniCardBgContainer}>
                      <Image
                        source={{ uri: uni.bannerUrl }}
                        style={styles.uniCardBg}
                        contentFit="cover"
                      />
                      <View style={styles.uniCardOverlay} />
                    </View>

                    <View style={[styles.uniCardContent, isRTL && styles.rowReverse]}>
                      <View style={[styles.logoContainer, { backgroundColor: theme.logoTile }]}>
                        <Image
                          source={{ uri: uni.logoUrl }}
                          style={styles.uniLogo}
                          contentFit="contain"
                        />
                      </View>

                      <View
                        style={[
                          styles.uniDetails,
                          { alignItems: isRTL ? 'flex-end' : 'flex-start' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.uniName,
                            { textAlign: isRTL ? 'right' : 'left' },
                          ]}
                          numberOfLines={2}
                        >
                          {uniName}
                        </Text>

                        <View style={[styles.applyButton, { backgroundColor: theme.logoTile }, isRTL && styles.rowReverse]}>
                          <Text style={[styles.applyButtonText, { color: theme.logoTileText }]}>
                            {t('apply_now').toUpperCase()}
                          </Text>
                          <Ionicons
                            name={
                              isRTL
                                ? 'arrow-back-outline'
                                : 'arrow-forward-outline'
                            }
                            size={16}
                            color={theme.logoTileText}
                            style={
                              isRTL
                                ? { marginRight: 4 }
                                : { marginLeft: 4 }
                            }
                          />
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  rowReverse: { flexDirection: 'row-reverse' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },

  backButton: { marginRight: 16 },

  headerTitle: { fontSize: 24, letterSpacing: 0.5 },

  scrollContent: { paddingBottom: 40 },

  loader: { marginTop: 60 },

  bannerScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    gap: 16,
  },

  carouselBanner: {
    width: width * 0.85,
    height: 180,
    borderRadius: 24,
    overflow: 'hidden',
  },

  carouselBannerImage: { width: '100%', height: '100%' },

  sectionHeader: {
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 22,
    textTransform: 'uppercase',
  },

  listContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },

  uniCard: {
    borderRadius: 24,
    overflow: 'hidden',
    height: 100,
    backgroundColor: '#000',
  },

  uniCardBgContainer: {
    ...StyleSheet.absoluteFill,
  },

  uniCardBg: { width: '100%', height: '100%' },

  uniCardOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(21, 33, 56, 0.7)',
  },

  uniCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 16,
  },

  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',

  },

  uniLogo: { width: '100%', height: '100%' },

  uniDetails: {
    flex: 1,
  },

  uniName: {
    color: '#FFF',
    fontFamily: Typography.poppins.semiBold,
    fontSize: 16,
    marginBottom: 2,
  },

  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 100,
  },

  applyButtonText: {
    fontFamily: Typography.hanson.bold,
    fontSize: 10,
  },
});
