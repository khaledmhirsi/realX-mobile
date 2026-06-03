import Ionicons from '@expo/vector-icons/Ionicons';
import { getAuth } from '@react-native-firebase/auth';
import { collection, deleteDoc, doc, getDocs, getFirestore, limit, orderBy, query } from '@react-native-firebase/firestore';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, I18nManager, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import PhonkText from '../components/PhonkText';
import { useAppTheme } from '../context/AppThemeContext';
import { Typography } from '../constants/Typography';
import { triggerSubtleHaptic } from '../utils/haptics';
import { logger } from '../utils/logger';

type SavedOffer = {
  id: string;
  type?: string;
  vendorId: string;
  offerIndex: number;
  vendorName?: string;
  vendorNameAr?: string;
  vendorLogo?: string;
  vendorCoverImage?: string;
  titleEn?: string;
  titleAr?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  discountType?: string;
  discountValue?: number | null;
  xcard?: boolean;
};

export default function SavedOffersScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { isDark, theme } = useAppTheme();
  const isArabic = i18n.language === 'ar' || I18nManager.isRTL;
  const [savedOffers, setSavedOffers] = useState<SavedOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  const fetchSavedOffers = useCallback(async () => {
    const user = getAuth().currentUser;
    if (!user) {
      setSavedOffers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const db = getFirestore();
      const savedRef = collection(db, 'students', user.uid, 'savedItems');
      const savedQuery = query(savedRef, orderBy('createdAt', 'desc'), limit(50));
      const snapshot = await getDocs(savedQuery);
      setSavedOffers(snapshot.docs
        .map((docSnap: any) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }))
        .filter((item: SavedOffer) => !item.type || item.type === 'offer') as SavedOffer[]);
    } catch (error) {
      logger.error('Error loading saved offers:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSavedOffers();
  }, [fetchSavedOffers]);

  const removeSavedOffer = async (item: SavedOffer) => {
    const user = getAuth().currentUser;
    if (!user || removingIds.has(item.id)) return;

    setRemovingIds((previous) => new Set(previous).add(item.id));
    try {
      const db = getFirestore();
      await deleteDoc(doc(db, 'students', user.uid, 'savedItems', item.id));
      setSavedOffers((previous) => previous.filter((offer) => offer.id !== item.id));
    } catch (error) {
      logger.error('Error removing saved offer:', error);
    } finally {
      setRemovingIds((previous) => {
        const next = new Set(previous);
        next.delete(item.id);
        return next;
      });
    }
  };

  const openVendor = (item: SavedOffer) => {
    triggerSubtleHaptic();
    router.push({ pathname: '/vendor/[id]', params: { id: item.vendorId } });
  };

  const redeemOffer = (item: SavedOffer) => {
    triggerSubtleHaptic();
    router.push(`/redeem/${item.vendorId}?vendorId=${item.vendorId}&offerIndex=${item.offerIndex}`);
  };

  const renderItem = ({ item }: { item: SavedOffer }) => {
    const title = isArabic ? (item.titleAr || item.titleEn || '') : (item.titleEn || item.titleAr || '');
    const vendorName = isArabic ? (item.vendorNameAr || item.vendorName || '') : (item.vendorName || item.vendorNameAr || '');
    const description = isArabic ? (item.descriptionAr || item.descriptionEn || '') : (item.descriptionEn || item.descriptionAr || '');

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
        activeOpacity={0.9}
        onPress={() => openVendor(item)}
      >
        <Image
          source={item.vendorCoverImage ? { uri: item.vendorCoverImage } : undefined}
          style={[styles.cover, { backgroundColor: theme.cardMuted }]}
          contentFit="cover"
        />
        <View style={styles.content}>
          <View style={[styles.logoWrap, { backgroundColor: theme.logoTile, borderColor: theme.logoTileBorder }]}>
            {item.vendorLogo ? (
              <Image source={{ uri: item.vendorLogo }} style={styles.logo} contentFit="cover" />
            ) : (
              <Ionicons name="storefront-outline" size={22} color={theme.brand} />
            )}
          </View>
          <View style={styles.textBlock}>
            <Text style={[styles.vendorName, { color: theme.mutedText, textAlign: isArabic ? 'right' : 'left' }]} numberOfLines={1}>
              {vendorName || t('unknown_vendor')}
            </Text>
            <PhonkText style={[styles.offerTitle, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]} numberOfLines={2}>
              {title || t('saved_offer')}
            </PhonkText>
            {description ? (
              <Text style={[styles.description, { color: theme.subtleText, textAlign: isArabic ? 'right' : 'left' }]} numberOfLines={2}>
                {description}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.redeemButton, { backgroundColor: theme.actionSolid }]}
            onPress={() => redeemOffer(item)}
          >
            <Ionicons name="flash" size={18} color={theme.onActionSolid} />
            <Text style={[styles.redeemText, { color: theme.onActionSolid }]} numberOfLines={1}>{t('redeem_caps')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.removeButton, { borderColor: theme.border }]}
            onPress={() => void removeSavedOffer(item)}
            disabled={removingIds.has(item.id)}
          >
            <Ionicons name="bookmark" size={18} color={theme.brand} />
            <Text style={[styles.removeText, { color: theme.text }]} numberOfLines={1}>{t('remove')}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.card }]}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={22} color={theme.icon} />
        </TouchableOpacity>
        <PhonkText style={[styles.headerTitle, { color: theme.text }, isArabic && styles.headerTitleRTL]}>
          {t('saved_offers')}
        </PhonkText>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.brand} />
        </View>
      ) : savedOffers.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="bookmark-outline" size={58} color={theme.brand} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>{t('no_saved_offers')}</Text>
          <Text style={[styles.emptySubtitle, { color: theme.mutedText }]}>{t('no_saved_offers_hint')}</Text>
        </View>
      ) : (
        <FlatList
          data={savedOffers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
  },
  headerTitleRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
    gap: 16,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cover: {
    width: '100%',
    height: 120,
    backgroundColor: '#F2F2F2',
  },
  content: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  logoWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  textBlock: {
    flex: 1,
  },
  vendorName: {
    fontSize: 13,
    fontFamily: Typography.poppins.medium,
  },
  offerTitle: {
    fontSize: 20,
    marginTop: 2,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Typography.poppins.medium,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  actionButton: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  redeemButton: {
  },
  redeemText: {
    flexShrink: 1,
    fontFamily: Typography.poppins.semiBold,
    fontSize: 13,
  },
  removeButton: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  removeText: {
    flexShrink: 1,
    fontFamily: Typography.poppins.semiBold,
    fontSize: 13,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 20,
    fontFamily: Typography.poppins.semiBold,
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Typography.poppins.medium,
    textAlign: 'center',
  },
});
