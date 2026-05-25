import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getAuth } from '@react-native-firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  where,
  FirebaseFirestoreTypes
} from '@react-native-firebase/firestore';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { Typography } from '../constants/Typography';
import PhonkText from '../components/PhonkText';
import { triggerSubtleHaptic } from '../utils/haptics';
import { logger } from '../utils/logger';
import { toArabicDigits } from '../utils/numbers';

/*
  UI Format based on design specs:
  - Header: Left arrow, Title "Redemption History"
  - Card: 
    - Vendor image, Vendor Name, "Total Paid: XX QAR", "Estimated savings: YY QAR"
    - "Offer Redeemed": "ZZ% Student Discount", "Redeem Again" button
    - Bottom of card: "Redeemed on Jul 7 08:07 AM"
*/

interface Transaction {
  id: string;
  type: string;
  vendorId: string;
  vendorName: string;
  vendorNameAr?: string;
  totalAmount: number;
  discountAmount?: number;
  finalAmount?: number;
  offer?: {
    discountType?: string;
    discountValue?: number;
    titleEn?: string;
    titleAr?: string;
  } | null;
  createdAt?: any;
  offerAmount?: number;
  paidAmount?: number;
  amount?: number;
  timestamp?: any;
}

export default function RedemptionHistoryScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const currency = t('currency_qar');
  const fmt = (n: number, decimals = 0) => isArabic ? toArabicDigits(n.toFixed(decimals)) : n.toFixed(decimals);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [vendorLogos, setVendorLogos] = useState<Record<string, string>>({});

  useEffect(() => {
    let isMounted = true;

    const fetchHistory = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;

        const db = getFirestore();
        const q = query(
          collection(db, 'transactions'),
          where('userId', '==', user.uid),
          where('type', 'in', ['offer', 'online_redemption']),
          orderBy('createdAt', 'desc'),
          limit(10)
        );

        const snap = await getDocs(q);
        const fetchedTransactions: Transaction[] = [];
        const uniqueVendorIds = new Set<string>();

        snap.forEach((docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
          const data = docSnap.data();
          fetchedTransactions.push({
            id: docSnap.id,
            ...data
          } as Transaction);

          if (data.vendorId) {
            uniqueVendorIds.add(data.vendorId);
          }
        });

        if (isMounted) {
          setTransactions(fetchedTransactions);
        }

        // Fetch vendor details (for logos) in parallel
        const logos: Record<string, string> = {};
        await Promise.all(
          Array.from(uniqueVendorIds).map(async (vendorId) => {
            const vSnap = await getDoc(doc(db, 'vendors', vendorId));
            if (vSnap.exists()) {
              logos[vendorId] = vSnap.data()?.profilePicture || '';
            }
          })
        );

        if (isMounted) {
          setVendorLogos(logos);
          setLoading(false);
        }
      } catch (error) {
        logger.error('Error fetching redemptions:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchHistory();

    return () => {
      isMounted = false;
    };
  }, []);

  const renderItem = ({ item }: { item: Transaction }) => {
    const logoUri = vendorLogos[item.vendorId];
    const isOnlineRedemption = item.type === 'online_redemption';
    const savings = isOnlineRedemption ? 0 : item.discountAmount || 0;
    const paid = isOnlineRedemption ? 0 : item.finalAmount || 0;

    const discountText =
      isOnlineRedemption
        ? t('online_vendor_title')
        : item.offer?.discountType === 'buy1get1'
        ? t('buy1get1_label')
        : item.offer?.discountType && item.offer?.discountValue
        ? `${item.offer.discountValue}${item.offer.discountType === 'percentage' ? '%' : ''} OFF`
        : t('offer_redeemed_label');

    const dateValue = item.createdAt?.toDate ? item.createdAt.toDate() : item.createdAt;
    const dateStr = dateValue
      ? new Date(dateValue).toLocaleDateString(isArabic ? 'ar-QA' : 'en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '';

    return (
      <View style={{ marginBottom: 24 }}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.vendorInfo}>
              <View style={styles.logoContainer}>
                {logoUri ? (
                  <Image source={{ uri: logoUri }} style={styles.logo} contentFit="contain" />
                ) : (
                  <Ionicons name="storefront" size={24} color="#CCC" />
                )}
              </View>
              <View style={styles.vendorTextContainer}>
                <Text style={styles.vendorName} numberOfLines={1}>
                  {isArabic ? (item.vendorNameAr || item.vendorName || 'VENDOR') : (item.vendorName || 'VENDOR')}
                </Text>
                <Text style={[styles.savingsText, { writingDirection: isArabic ? 'rtl' : 'ltr' }]}>
                  {t('estimated_savings', {
                    amount: t('amount_with_currency', { amount: fmt(savings), currency }),
                  })}
                </Text>
              </View>
            </View>

            <View style={styles.paidInfo}>
              <Text style={styles.paidLabel}>{t('total_paid')}</Text>
              <PhonkText style={[styles.paidAmount, { writingDirection: isArabic ? 'rtl' : 'ltr' }]}>
                {t('amount_with_currency', { amount: fmt(paid), currency })}
              </PhonkText>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.cardFooter}>
            <View style={styles.offerInfo}>
              <Text style={styles.offerLabel}>{t('offer_redeemed_label')}</Text>
              <Text style={[styles.offerValue, { writingDirection: isArabic ? 'rtl' : 'ltr' }]} numberOfLines={1}>
                {discountText}
              </Text>
            </View>

            {item.vendorId && (
              <TouchableOpacity
                style={styles.redeemButton}
                activeOpacity={0.8}
                onPress={() => {
                  triggerSubtleHaptic();
                  router.push({
                    pathname: '/vendor/[id]',
                    params: { id: item.vendorId },
                  });
                }}
              >
                <Text style={styles.redeemButtonText}>{t('redeem_again')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Text style={[styles.dateText, { writingDirection: isArabic ? 'rtl' : 'ltr' }]}>{t('redeemed_on', { date: dateStr })}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            triggerSubtleHaptic();
            router.back();
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('redemption_history')}</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.brandGreen} />
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('no_redemptions_found')}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: Typography.poppins.medium,
    color: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#F9F9F9',
    borderRadius: 24,
    padding: 20,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  vendorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  logoContainer: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logo: {
    width: 50,
    height: 50,
  },
  vendorTextContainer: {
    flex: 1,
  },
  vendorName: {
    fontSize: 18,
    fontFamily: Typography.poppins.semiBold,
    color: '#000',
    marginBottom: 4,
  },
  savingsText: {
    fontSize: 12,
    fontFamily: Typography.poppins.medium,
    color: '#888',
  },
  paidInfo: {
    alignItems: 'flex-end',
  },
  paidLabel: {
    fontSize: 12,
    fontFamily: Typography.poppins.medium,
    color: '#000',
    marginBottom: 4,
  },
  paidAmount: {
    fontSize: 16,
    color: '#000',
  },
  divider: {
    height: 1,
    backgroundColor: '#EAEAEA',
    marginVertical: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  offerInfo: {
    flex: 1,
    marginRight: 12,
  },
  offerLabel: {
    fontSize: 12,
    fontFamily: Typography.poppins.medium,
    color: '#000',
    marginBottom: 4,
  },
  offerValue: {
    fontSize: 14,
    fontFamily: Typography.poppins.semiBold,
    color: '#000',
  },
  redeemButton: {
    backgroundColor: Colors.brandGreen || '#1AD04F',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  redeemButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: Typography.poppins.semiBold,
  },
  dateText: {
    fontSize: 12,
    fontFamily: Typography.poppins.medium,
    color: '#888',
    marginLeft: 8,
  },
  emptyContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: Typography.poppins.medium,
    color: '#888',
  },
});
