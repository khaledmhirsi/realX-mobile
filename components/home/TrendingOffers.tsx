import { collection, getDocs, getFirestore, limit, query, where } from '@react-native-firebase/firestore';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, I18nManager, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import PhonkText from '../PhonkText';
import RestaurantCard from '../category/RestaurantCard';
import { useTranslation } from 'react-i18next';
import { logger } from '../../utils/logger';
import { useAppTheme } from '../../context/AppThemeContext';
import { fetchCmsDocument, fetchVendor } from '../../utils/firebaseQueries';
import { queryClient, queryKeys } from '../../utils/queryClient';

type TrendingOffersProps = {
    onVendorPress?: (vendor: any) => void;
};

const OFFER_CARD_GAP = 12;
const OFFER_SIDE_PADDING = 30;
const OFFER_CARD_WIDTH_RATIO = 0.60;
const OFFER_AUTO_SCROLL_MS = 4000;
const TRENDING_FALLBACK_LIMIT = 10;

type TrendingOfferBannerItem = {
    trendingOfferBannerId?: string;
    vendorId?: string;
    images?: {
        mobile?: string;
    };
    altText?: string;
    isActive?: boolean;
};

const mapVendorDocToCard = (vendorId: string, vendorData: any, customBannerImage?: string) => ({
    id: vendorId,
    vendorId,
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
    bannerImage: customBannerImage || vendorData.bannerImage,
    xcard: vendorData.xcard || false,
    isTrending: true,
});

export default function TrendingOffers({ onVendorPress }: TrendingOffersProps) {
    const { t } = useTranslation();
    const { theme } = useAppTheme();
    const isRTL = I18nManager.isRTL;
    const {
        data: vendors = [],
        error,
        isLoading,
    } = useQuery({
        queryKey: queryKeys.trendingOffers(),
        queryFn: async () => {
            const db = getFirestore();
            const fetchLegacyTrendingVendors = async () => {
                const q = query(
                    collection(db, 'vendors'),
                    where('isTrending', '==', true),
                    limit(TRENDING_FALLBACK_LIMIT)
                );
                const snapshot = await getDocs(q);

                return snapshot.docs.map((docSnap: any) => {
                    const vendorData = docSnap.data();
                    queryClient.setQueryData(queryKeys.vendor(docSnap.id), { id: docSnap.id, data: vendorData });
                    return mapVendorDocToCard(docSnap.id, vendorData);
                });
            };

            const cmsData = await fetchCmsDocument<{ items?: TrendingOfferBannerItem[] }>('trending-offer-banners');
            const cmsItems = cmsData?.items || [];

            const activeCmsItems = cmsItems.filter(item => (
                item.isActive !== false
                && !!item.vendorId?.trim()
                && !!item.images?.mobile?.trim()
            ));

            let fetchedResults: any[] = [];

            if (activeCmsItems.length > 0) {
                const vendorResults = await Promise.all(activeCmsItems.map(async (item) => {
                    const vendorId = item.vendorId?.trim();
                    const customBannerImage = item.images?.mobile?.trim();
                    if (!vendorId || !customBannerImage) return null;

                    const vendorResult = await queryClient.fetchQuery({
                        queryKey: queryKeys.vendor(vendorId),
                        queryFn: () => fetchVendor(vendorId),
                    });
                    if (!vendorResult) return null;

                    return mapVendorDocToCard(vendorResult.id, vendorResult.data, customBannerImage);
                }));

                fetchedResults = vendorResults.filter(Boolean);
            }

            if (fetchedResults.length === 0) {
                logger.warn('[TrendingOffers] Using bounded legacy vendor fallback', {
                    limit: TRENDING_FALLBACK_LIMIT,
                });
                fetchedResults = await fetchLegacyTrendingVendors();
            }

            return fetchedResults;
        },
    });
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollViewRef = useRef<ScrollView | null>(null);
    const isUserInteractingRef = useRef(false);
    const { width: screenWidth } = useWindowDimensions();
    const router = useRouter();
    const displayedVendors = useMemo(() => (isRTL ? [...vendors].reverse() : vendors), [vendors, isRTL]);
    const offerCardWidth = screenWidth * OFFER_CARD_WIDTH_RATIO;
    const offerScrollInterval = offerCardWidth + OFFER_CARD_GAP;
    const trendingLabelPrefix = t('trending_label_prefix');
    const trendingLabelHighlight = t('trending_label_highlight');

    useEffect(() => {
        if (error) logger.error('Error fetching trending vendors:', error);
    }, [error]);

    useEffect(() => {
        if (displayedVendors.length <= 1) {
            return;
        }

        const interval = setInterval(() => {
            if (isUserInteractingRef.current) {
                return;
            }

            setCurrentIndex((prevIndex) => (prevIndex + 1) % displayedVendors.length);
        }, OFFER_AUTO_SCROLL_MS);

        return () => clearInterval(interval);
    }, [displayedVendors.length]);

    useEffect(() => {
        if (!scrollViewRef.current || displayedVendors.length === 0) {
            return;
        }

        const maxIndex = Math.max(0, displayedVendors.length - 1);
        const safeIndex = Math.min(currentIndex, maxIndex);

        scrollViewRef.current.scrollTo({
            x: safeIndex * offerScrollInterval,
            animated: true,
        });
    }, [currentIndex, displayedVendors.length, offerScrollInterval]);

    const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (displayedVendors.length <= 1) {
            isUserInteractingRef.current = false;
            return;
        }

        const maxIndex = Math.max(0, displayedVendors.length - 1);
        const nextIndex = Math.min(
            maxIndex,
            Math.max(0, Math.round(event.nativeEvent.contentOffset.x / offerScrollInterval)),
        );

        setCurrentIndex((prevIndex) => (prevIndex === nextIndex ? prevIndex : nextIndex));
        isUserInteractingRef.current = false;
    };

    const handleScrollBegin = () => {
        isUserInteractingRef.current = true;
    };

    const handleVendorPress = (vendor: any) => {
        if (onVendorPress) {
            onVendorPress(vendor);
        } else if (vendor.vendorId) {
            router.push({ pathname: '/vendor/[id]', params: { id: vendor.vendorId } });
        }
    };

    if (isLoading) {
        return (
            <View style={[styles.container, styles.loaderContainer]}>
                <ActivityIndicator size="small" color={theme.brand} />
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
                    <PhonkText style={[styles.trendingText, { color: theme.text, writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                        {trendingLabelPrefix}
                    </PhonkText>
                    <PhonkText style={[styles.offersText, { color: theme.brand, writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                        {trendingLabelHighlight}
                    </PhonkText>
                </View>
            </View>
            <ScrollView
                ref={scrollViewRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                nestedScrollEnabled
                directionalLockEnabled
                canCancelContentTouches
                keyboardShouldPersistTaps="always"
                snapToInterval={offerScrollInterval}
                decelerationRate="fast"
                disableIntervalMomentum
                scrollEventThrottle={16}
                onScrollBeginDrag={handleScrollBegin}
                onMomentumScrollBegin={handleScrollBegin}
                onScrollEndDrag={handleScrollEnd}
                onMomentumScrollEnd={handleScrollEnd}
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
                            style={{ width: offerCardWidth }}
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
        letterSpacing: 1,
    },
    offersText: {
        fontSize: 20,
        fontWeight: '900',
        fontStyle: 'normal',
        letterSpacing: 1,
    },
    loaderContainer: {
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingHorizontal: OFFER_SIDE_PADDING,
        gap: OFFER_CARD_GAP,

    },
});
