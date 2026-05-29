import { doc, getDoc, getFirestore } from '@react-native-firebase/firestore';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { triggerSubtleHaptic } from '../../utils/haptics';
import { logger } from '../../utils/logger';
import { useAppTheme } from '../../context/AppThemeContext';

const BANNER_HEIGHT = 192;
const BANNER_SIDE_PADDING = 24;
const BANNER_GAP = 12;
const BANNER_AUTO_SCROLL_MS = 4000;

export type BannerItem = {
    bannerId: string;
    altText: string;
    id?: string;
    images: {
        desktop?: string;
        mobile?: string;
    };
    isActive: boolean;
    vendorId?: string;
    lastUpdated?: string;
};

type PromoBannerProps = {
    onBannerPress?: (banner: BannerItem) => void;
};

export default function PromoBanner({ onBannerPress }: PromoBannerProps) {
    const { theme } = useAppTheme();
    const [banners, setBanners] = useState<BannerItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollViewRef = useRef<ScrollView | null>(null);
    const isUserInteractingRef = useRef(false);
    const { width: screenWidth } = useWindowDimensions();
    const router = useRouter();
    const bannerWidth = screenWidth - (BANNER_SIDE_PADDING * 2);
    const bannerScrollInterval = bannerWidth + BANNER_GAP;

    useEffect(() => {
        const fetchBanners = async () => {
            try {
                const db = getFirestore();
                const cmsDocRef = doc(db, 'cms', 'banner');
                const cmsSnap = await getDoc(cmsDocRef);

                if (cmsSnap.exists()) {
                    const data = cmsSnap.data();
                    const activeBanners = (data?.banners || [])
                        .filter((b: any) => b.isActive) as BannerItem[];
                    setBanners(activeBanners);
                }
            } catch (error) {
                logger.error('Error fetching banners:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchBanners();
    }, []);

    useEffect(() => {
        if (banners.length <= 1) {
            return;
        }

        const interval = setInterval(() => {
            if (isUserInteractingRef.current) {
                return;
            }

            setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
        }, BANNER_AUTO_SCROLL_MS);

        return () => clearInterval(interval);
    }, [banners.length]);

    useEffect(() => {
        if (!scrollViewRef.current || banners.length === 0) {
            return;
        }

        const maxIndex = Math.max(0, banners.length - 1);
        const safeIndex = Math.min(currentIndex, maxIndex);

        scrollViewRef.current.scrollTo({
            x: safeIndex * bannerScrollInterval,
            animated: true,
        });
    }, [bannerScrollInterval, banners.length, currentIndex]);

    const getBannerVendorId = (banner: BannerItem) => {
        const vendorId = banner.vendorId?.trim() || banner.id?.trim();
        return vendorId || null;
    };

    const handleScrollBegin = () => {
        isUserInteractingRef.current = true;
    };

    const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (banners.length <= 1) {
            isUserInteractingRef.current = false;
            return;
        }

        const maxIndex = Math.max(0, banners.length - 1);
        const nextIndex = Math.min(
            maxIndex,
            Math.max(0, Math.round(event.nativeEvent.contentOffset.x / bannerScrollInterval)),
        );

        setCurrentIndex((prevIndex) => (prevIndex === nextIndex ? prevIndex : nextIndex));
        isUserInteractingRef.current = false;
    };

    const handlePress = (banner: BannerItem) => {
        const vendorId = getBannerVendorId(banner);

        if (!vendorId) {
            logger.warn('Promo banner is missing a linked vendorId:', banner.bannerId);
            return;
        }

        triggerSubtleHaptic();
        if (onBannerPress) {
            onBannerPress({ ...banner, vendorId });
        } else {
            router.push({ pathname: '/vendor/[id]', params: { id: vendorId } });
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.loaderContainer]}>
                <ActivityIndicator size="large" color={theme.brand} />
            </View>
        );
    }

    if (banners.length === 0) {
        return (
            <View style={[styles.container, styles.loaderContainer]}>
                <Text style={{ color: theme.subtleText, fontFamily: 'System' }}>No banners available</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                ref={scrollViewRef}
                horizontal
                style={styles.carousel}
                showsHorizontalScrollIndicator={false}
                nestedScrollEnabled
                directionalLockEnabled
                canCancelContentTouches
                keyboardShouldPersistTaps="always"
                snapToInterval={bannerScrollInterval}
                decelerationRate="fast"
                disableIntervalMomentum
                scrollEventThrottle={16}
                onScrollBeginDrag={handleScrollBegin}
                onMomentumScrollBegin={handleScrollBegin}
                onScrollEndDrag={handleScrollEnd}
                onMomentumScrollEnd={handleScrollEnd}
                contentContainerStyle={styles.scrollContent}
            >
                {banners.map((banner, index) => {
                    const imageUri = banner.images.mobile || banner.images.desktop;

                    return (
                        <Pressable
                            key={banner.bannerId || banner.vendorId || banner.id || index}
                            style={({ pressed }) => [
                                styles.bannerColumn,
                                { width: bannerWidth },
                                pressed && styles.bannerPressed,
                            ]}
                            onPress={() => handlePress(banner)}
                            accessibilityRole="button"
                            accessibilityLabel={banner.altText || 'Open vendor'}
                        >
                            <View style={styles.topPill}>
                                <Image
                                    source={{ uri: imageUri }}
                                    style={styles.topImage}
                                    contentFit="cover"
                                    cachePolicy="memory-disk"
                                    accessibilityLabel={banner.altText || 'Banner Image'}
                                />
                            </View>

                            <View style={styles.bottomPill}>
                                <Image
                                    source={{ uri: imageUri }}
                                    style={styles.bottomImage}
                                    contentFit="cover"
                                    cachePolicy="memory-disk"
                                    accessibilityLabel={banner.altText || 'Banner Image'}
                                />
                            </View>
                        </Pressable>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 12,
    },
    loaderContainer: {
        height: BANNER_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
    },
    carousel: {
        height: BANNER_HEIGHT,
    },
    scrollContent: {
        paddingHorizontal: BANNER_SIDE_PADDING,
        gap: BANNER_GAP,
    },
    bannerColumn: {
        height: BANNER_HEIGHT,
    },
    bannerPressed: {
        opacity: 0.9,
    },
    topPill: {
        flex: 1,
        borderRadius: 30,
        overflow: 'hidden',
    },
    bottomPill: {
        flex: 1,
        borderRadius: 30,
        overflow: 'hidden',
    },
    topImage: {
        width: '100%',
        height: '200%',
    },
    bottomImage: {
        width: '100%',
        height: '200%',
        transform: [{ translateY: '-50%' }],
    },
});
