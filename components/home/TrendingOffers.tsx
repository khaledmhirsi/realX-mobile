import { collection, getDocs, getFirestore, query, where } from '@react-native-firebase/firestore';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, I18nManager, ScrollView, StyleSheet, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import PhonkText from '../PhonkText';
import RestaurantCard from '../category/RestaurantCard';
import { useTranslation } from 'react-i18next';
import { logger } from '../../utils/logger';

export default function TrendingOffers() {
    const { t } = useTranslation();
    const isRTL = I18nManager.isRTL;
    const [vendors, setVendors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollViewRef = useRef<ScrollView | null>(null);
    const router = useRouter();
    const displayedVendors = useMemo(() => (isRTL ? [...vendors].reverse() : vendors), [vendors, isRTL]);
    const trendingLabelPrefix = t('trending_label_prefix');
    const trendingLabelHighlight = t('trending_label_highlight');

    useEffect(() => {
        const fetchTrendingVendors = async () => {
            try {
                const db = getFirestore();
                const q = query(collection(db, 'vendors'), where('isTrending', '==', true));
                const snapshot = await getDocs(q);

                const fetchedResults = snapshot.docs.map((docSnap: any) => {
                    const vendorData = docSnap.data();

                    return {
                        id: docSnap.id,
                        vendorId: docSnap.id,
                        nameEn: vendorData.nameEn || vendorData.name,
                        nameAr: vendorData.nameAr || vendorData.name,
                        vendorName: vendorData.name,
                        vendorNameAr: vendorData.nameAr,
                        shortDescription: vendorData.shortDescription,
                        shortDescriptionAr: vendorData.shortDescriptionAr || vendorData.shortDescriptionAR,
                        brandDescription: vendorData.brandDescription,
                        descriptionEn: vendorData.descriptionEn,
                        descriptionAr: vendorData.descriptionAr,
                        vendorProfilePicture: vendorData.profilePicture,
                        coverImage: vendorData.coverImage,
                        bannerImage: vendorData.bannerImage,
                        xcard: vendorData.xcard || false,
                        isTrending: true,
                    };
                });

                setVendors(fetchedResults);
            } catch (error) {
                logger.error('Error fetching trending vendors:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTrendingVendors();
    }, []);

    useEffect(() => {
        if (displayedVendors.length <= 1) {
            return;
        }

        const interval = setInterval(() => {
            setCurrentIndex((prevIndex) => (prevIndex + 1) % displayedVendors.length);
        }, 4000);

        return () => clearInterval(interval);
    }, [displayedVendors.length]);

    useEffect(() => {
        if (!scrollViewRef.current || displayedVendors.length === 0) {
            return;
        }

        const cardWidth = 220;
        const gap = 12;
        const horizontalPadding = 20;
        const maxIndex = Math.max(0, displayedVendors.length - 1);
        const safeIndex = Math.min(currentIndex, maxIndex);
        const offset = horizontalPadding + safeIndex * (cardWidth + gap);

        scrollViewRef.current.scrollTo({ x: offset, animated: true });
    }, [currentIndex, displayedVendors.length]);

    const handleVendorPress = (vendor: any) => {
        if (vendor.vendorId) {
            router.push({ pathname: '/vendor/[id]', params: { id: vendor.vendorId } });
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.loaderContainer]}>
                <ActivityIndicator size="small" color={Colors.brandGreen} />
            </View>
        );
    }

    if (displayedVendors.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            <View style={styles.headerContainer}>
                <View style={styles.headerTitle}>
                    <PhonkText style={[styles.trendingText, { writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                        {trendingLabelPrefix}
                    </PhonkText>
                    <PhonkText style={[styles.offersText, { writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                        {trendingLabelHighlight}
                    </PhonkText>
                </View>
            </View>
            <ScrollView
                ref={scrollViewRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.scrollContent, { flexDirection: 'row' }]}
            >
                {displayedVendors.map((vendor) => {
                    const description = isRTL
                        ? (vendor.shortDescriptionAr || vendor.shortDescriptionAR || vendor.descriptionAr || vendor.brandDescription || '')
                        : (vendor.shortDescription || vendor.brandDescription || vendor.descriptionEn || '');
                    const name = isRTL
                        ? (vendor.nameAr || vendor.vendorNameAr || vendor.nameEn || vendor.vendorName || 'Vendor')
                        : (vendor.nameEn || vendor.vendorName || vendor.nameAr || vendor.vendorNameAr || 'Vendor');

                    return (
                        <RestaurantCard
                            key={vendor.id}
                            id={vendor.id}
                            name={name}
                            cashbackText={description}
                            isTrending={vendor.isTrending}
                            isTopRated={vendor.isTopRated}
                            imageUri={vendor.bannerImage || vendor.coverImage}
                            logoUri={vendor.vendorProfilePicture || vendor.profilePicture}
                            xcardEnabled={vendor.xcard}
                            onPress={() => handleVendorPress(vendor)}
                            style={styles.offerCard}
                        />
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 16,
    },
    headerContainer: {
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    headerTitle: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    trendingText: {
        fontSize: 20,
        color: Colors.light.text,
        letterSpacing: 1,
    },
    offersText: {
        fontSize: 20,
        color: Colors.brandGreen,
        fontStyle: 'italic',
        letterSpacing: 1,
    },
    loaderContainer: {
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingHorizontal: 30,
        gap: 12,

    },
    offerCard: {
        width: 220,
    },
});
