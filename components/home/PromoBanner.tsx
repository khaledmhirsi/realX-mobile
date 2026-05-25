import { doc, getDoc, getFirestore } from '@react-native-firebase/firestore';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { triggerSubtleHaptic } from '../../utils/haptics';
import { logger } from '../../utils/logger';

const { width: screenWidth } = Dimensions.get('window');
const BANNER_WIDTH = screenWidth - 48;
const BANNER_HEIGHT = 192;

export type BannerItem = {
    bannerId: string;
    altText: string;
    images: {
        desktop?: string;
        mobile?: string;
    };
    isActive: boolean;
    vendorId: string;
    lastUpdated?: string;
};

type PromoBannerProps = {
    onBannerPress?: (banner: BannerItem) => void;
};

export default function PromoBanner({ onBannerPress }: PromoBannerProps) {
    const [banners, setBanners] = useState<BannerItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeIndex, setActiveIndex] = useState(0);
    const router = useRouter();

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

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const contentOffsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffsetX / (BANNER_WIDTH + 10));
        setActiveIndex(index);
    };

    const handlePress = (banner: BannerItem) => {
        triggerSubtleHaptic();
        if (banner.vendorId) {
            if (onBannerPress) {
                onBannerPress(banner);
            } else {
                router.push({ pathname: '/vendor/[id]', params: { id: banner.vendorId } });
            }
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.loaderContainer]}>
                <ActivityIndicator size="large" color="#333" />
            </View>
        );
    }

    if (banners.length === 0) {
        return (
            <View style={[styles.container, styles.loaderContainer]}>
                <Text style={{ color: '#8E8E93', fontFamily: 'System' }}>No banners available</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={BANNER_WIDTH + 10}
                decelerationRate="fast"
                nestedScrollEnabled
                directionalLockEnabled
                canCancelContentTouches={false}
                keyboardShouldPersistTaps="always"
                contentContainerStyle={styles.scrollContent}
                onScroll={handleScroll}
                scrollEventThrottle={16}
            >
                {banners.map((banner) => (
                    <TouchableOpacity
                        key={banner.bannerId}
                        style={styles.bannerColumn}
                        onPress={() => handlePress(banner)}
                        activeOpacity={0.9}
                        accessibilityRole="button"
                        accessibilityLabel={banner.altText || 'Open vendor'}
                    >
                        <View style={styles.topPill}>
                            <Image
                                source={{ uri: banner.images.mobile }}
                                style={styles.topImage}
                                contentFit="cover"
                                cachePolicy="memory-disk"
                                accessibilityLabel={banner.altText || 'Banner Image'}
                            />
                        </View>

                        <View style={styles.bottomPill}>
                            <Image
                                source={{ uri: banner.images.mobile }}
                                style={styles.bottomImage}
                                contentFit="cover"
                                cachePolicy="memory-disk"
                                accessibilityLabel={banner.altText || 'Banner Image'}
                            />
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <View style={styles.paginationContainer}>
                {banners.map((_, index) => (
                    <View
                        key={index}
                        style={[
                            styles.paginationDot,
                            index === activeIndex && styles.paginationDotActive,
                        ]}
                    />
                ))}
            </View>
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
    scrollContent: {
        paddingHorizontal: 24, // Center item by using (screenWidth - BANNER_WIDTH) / 2
        gap: 10,
    },
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
        gap: 4,
    },
    paginationDot: {
        width: 28,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#E0E0E0',
    },
    paginationDotActive: {
        backgroundColor: '#333333',
        width: 96,
    },
    bannerColumn: {
        width: BANNER_WIDTH,
        height: BANNER_HEIGHT,
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
