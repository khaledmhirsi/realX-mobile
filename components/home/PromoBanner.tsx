import { doc, getDoc, getFirestore } from '@react-native-firebase/firestore';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { triggerSubtleHaptic } from '../../utils/haptics';
import { logger } from '../../utils/logger';

const { width: screenWidth } = Dimensions.get('window');
const BANNER_WIDTH = screenWidth - 48;
const BANNER_HEIGHT = 192;

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
    const [banners, setBanners] = useState<BannerItem[]>([]);
    const [loading, setLoading] = useState(true);
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

    const getBannerVendorId = (banner: BannerItem) => {
        const vendorId = banner.vendorId?.trim() || banner.id?.trim();
        return vendorId || null;
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

    const banner = banners[0];

    return (
        <View style={styles.container}>
            <Pressable
                style={({ pressed }) => [
                    styles.bannerColumn,
                    pressed && styles.bannerPressed,
                ]}
                onPress={() => handlePress(banner)}
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
            </Pressable>
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
    bannerColumn: {
        width: BANNER_WIDTH,
        height: BANNER_HEIGHT,
        alignSelf: 'center',
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
