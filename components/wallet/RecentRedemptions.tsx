import { getAuth } from '@react-native-firebase/auth';
import { collection, doc, getDoc, getFirestore, limit, onSnapshot, orderBy, query, where } from '@react-native-firebase/firestore';
import { FlashList } from '@shopify/flash-list';
import { useEffect, useState } from 'react';
import { ActivityIndicator, I18nManager, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/Colors';
import { Typography } from '../../constants/Typography';
import RedemptionItem, { RedemptionData } from './RedemptionItem';
import { logger } from '../../utils/logger';
import { toArabicDigits } from '../../utils/numbers';
import { useAppTheme } from '../../context/AppThemeContext';

const LOGO_COLORS = ['#3D5A80', '#C41E3A', '#8B4513', '#2A9D8F', '#E76F51', '#E9C46A'];

export default function RecentRedemptions() {
    const [redemptions, setRedemptions] = useState<RedemptionData[]>([]);
    const [loading, setLoading] = useState(true);
    const { t, i18n } = useTranslation();
    const { theme } = useAppTheme();
    const isRTL = I18nManager.isRTL;
    const isArabic = i18n.language === 'ar' || isRTL;

    useEffect(() => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) {
            setLoading(false);
            return;
        }

        const db = getFirestore();
        const q = query(
            collection(db, 'transactions'),
            where('userId', '==', user.uid),
            where('type', '==', 'giftcard'),
            orderBy('createdAt', 'desc'),
            limit(3)
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const db = getFirestore();

            // Deduplicate vendor IDs and batch fetch
            const vendorIds: string[] = [];
            snapshot.docs.forEach((d: any) => {
                const vendorId = d.data()?.vendorId;
                if (typeof vendorId === 'string' && vendorId.length > 0) {
                    vendorIds.push(vendorId);
                }
            });
            const uniqueVendorIds = [...new Set(vendorIds)];
            const vendorMap = new Map<string, any>();

            await Promise.all(uniqueVendorIds.map(async (vid) => {
                try {
                    const vDoc = await getDoc(doc(db, 'vendors', vid));
                    if (vDoc.exists()) {
                        vendorMap.set(vid, vDoc.data());
                    }
                } catch (e) {
                    logger.warn(`Error fetching vendor ${vid}:`, e);
                }
            }));

            const formattedData: RedemptionData[] = snapshot.docs.map((snapshotDoc: any) => {
                const data = snapshotDoc.data();

                let dateStr = '';
                if (data.createdAt) {
                    const date = new Date(data.createdAt.seconds * 1000);
                    const day = String(date.getDate()).padStart(2, '0');
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const year = date.getFullYear();
                    dateStr = isArabic ? toArabicDigits(`${day}/${month}/${year}`) : `${day}/${month}/${year}`;
                }

                let logoUrl = null;
                let vendorDocNameAr = null;
                let vendorDocName = null;
                const vendorData = data.vendorId ? vendorMap.get(data.vendorId) : null;
                if (vendorData) {
                    logoUrl = vendorData?.profilePicture || vendorData?.logoUrl || vendorData?.imageUrl || null;
                    vendorDocNameAr = vendorData?.nameAr || vendorData?.vendorNameAr || null;
                    vendorDocName = vendorData?.name || vendorData?.vendorName || null;
                }

                const vendorNameFallback = data.vendorName || t('unknown_vendor');
                const finalEnglishName = vendorDocName || vendorNameFallback;
                const finalArabicName = vendorDocNameAr || data.vendorNameAr || finalEnglishName;
                const resolvedVendorName = isArabic ? finalArabicName : finalEnglishName;

                const charCode = resolvedVendorName.charCodeAt(0) || 0;
                const color = LOGO_COLORS[charCode % LOGO_COLORS.length];

                return {
                    id: snapshotDoc.id,
                    merchantName: resolvedVendorName,
                    date: dateStr,
                    offerType: t('gift_card'),
                    savedAmount: data.finalAmount || 0,
                    totalBill: data.totalAmount || 0,
                    remainingToPay: data.remainingAmount || 0,
                    currency: 'QR',
                    logoBackgroundColor: color,
                    logoUrl: logoUrl,
                };
            });

            setRedemptions(formattedData);
            setLoading(false);
        }, (err) => {
            logger.warn('RecentRedemptions fetch error:', err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [t, isArabic]);

    const renderItem = ({ item }: { item: RedemptionData }) => (
        <RedemptionItem item={item} />
    );

    const renderSeparator = () => (
        <View style={[styles.separator, isArabic && styles.separatorRTL]} />
    );

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.textRow}>
                    <Text style={[styles.sectionTitle, { color: theme.text }, isArabic && styles.textRTL]}>
                        {t('recent_redemptions')}
                    </Text>
                </View>
                <ActivityIndicator
                    size="small"
                    color={Colors.brandGreen}
                    style={styles.loader}
                />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.textRow}>
                <Text style={[styles.sectionTitle, { color: theme.text }, isArabic && styles.textRTL]}>
                    {t('recent_redemptions')}
                </Text>
            </View>
            {redemptions.length > 0 ? (
                <FlashList
                    data={redemptions}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    ItemSeparatorComponent={renderSeparator}
                    scrollEnabled={false}
                    contentContainerStyle={[styles.listContent, { backgroundColor: theme.background }]}
                />
            ) : (
                <View style={styles.textRow}>
                    <Text style={[styles.emptyText, { color: theme.subtleText }, isArabic && styles.textRTL]}>
                        {t('no_recent_redemptions')}
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingTop: 24,
    },
    textRow: {
        width: '100%',
        alignItems: 'flex-start',
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontFamily: Typography.poppins.semiBold,
        marginBottom: 16,
    },
    listContent: {
    },
    separator: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginLeft: 84,
    },
    separatorRTL: {
        marginLeft: 0,
        marginRight: 84,
    },
    emptyText: {
        fontSize: 14,
        fontFamily: Typography.poppins.medium,
        paddingTop: 10,
    },
    textRTL: {
        textAlign: 'right',
        writingDirection: 'rtl',
    },
    loader: {
        paddingTop: 20,
    },
});
