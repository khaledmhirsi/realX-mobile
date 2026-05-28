import { doc, getDoc, getFirestore } from '@react-native-firebase/firestore';
import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    I18nManager,
    Linking,
    StyleProp,
    StyleSheet,
    TouchableOpacity,
    useWindowDimensions,
    View,
    ViewStyle,
} from 'react-native';

import { Colors } from '../../constants/Colors';
import { triggerSubtleHaptic } from '../../utils/haptics';
import { logger } from '../../utils/logger';
import PhonkText from '../PhonkText';

export type FeaturedBannerItem = {
    id: string;
    title: string;
    titleAr?: string;
    ctaText?: string;
    orderUrl: string;
    isActive: boolean;
    heroImageUrl: string;
    tileImageUrls: string[];
    altText?: string;
    order?: number;
};

type FeaturedBannerProps = {
    item?: FeaturedBannerItem;
    style?: StyleProp<ViewStyle>;
};

function isValidBannerItem(item: any): item is FeaturedBannerItem {
    return Boolean(
        item &&
        item.isActive === true &&
        typeof item.id === 'string' &&
        typeof item.title === 'string' &&
        typeof item.orderUrl === 'string' &&
        typeof item.heroImageUrl === 'string' &&
        Array.isArray(item.tileImageUrls) &&
        item.tileImageUrls.length >= 3 &&
        item.tileImageUrls.slice(0, 3).every((url: unknown) => typeof url === 'string' && url.length > 0)
    );
}

function sortByOrder(a: FeaturedBannerItem, b: FeaturedBannerItem) {
    return (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER);
}

export default function FeaturedBanner({ item, style }: FeaturedBannerProps) {
    const { width } = useWindowDimensions();
    const isRTL = I18nManager.isRTL;
    const [cmsItem, setCmsItem] = useState<FeaturedBannerItem | null>(null);
    const [loading, setLoading] = useState(!item);

    useEffect(() => {
        if (item) {
            setLoading(false);
            return;
        }

        const fetchBanner = async () => {
            try {
                const db = getFirestore();
                const bannerDocRef = doc(db, 'cms', 'featuredBrandShowcase');
                const bannerSnap = await getDoc(bannerDocRef);

                if (!bannerSnap.exists()) {
                    setCmsItem(null);
                    return;
                }

                const data = bannerSnap.data();
                const firstActiveItem = (data?.items || [])
                    .filter(isValidBannerItem)
                    .sort(sortByOrder)[0] ?? null;

                setCmsItem(firstActiveItem);
            } catch (error) {
                logger.error('Error fetching featured banner:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchBanner();
    }, [item]);

    const layout = useMemo(() => {
        const cardWidth = Math.max(0, width - 40);
        const cardHeight = Math.max(190, Math.min(255, cardWidth * 0.56));
        const heroHeight = cardHeight * 0.72;
        const tileGap = 10;
        const tileWidth = (cardWidth - (tileGap * 2) - 12) / 3;
        const tileHeight = cardHeight * 0.58;

        return {
            cardHeight,
            heroHeight,
            tileGap,
            tileWidth,
            tileHeight,
        };
    }, [width]);

    const currentItem = item ?? cmsItem;
    const isLoading = !item && loading;

    const handlePress = async () => {
        if (!currentItem?.orderUrl) {
            return;
        }

        triggerSubtleHaptic();

        try {
            const canOpen = await Linking.canOpenURL(currentItem.orderUrl);
            if (canOpen) {
                await Linking.openURL(currentItem.orderUrl);
            }
        } catch (error) {
            logger.error('Error opening featured banner URL:', error);
        }
    };

    if (isLoading) {
        return (
            <View style={[style]}>
                <ActivityIndicator size="small" color={Colors.brandGreen} />
            </View>
        );
    }

    if (!currentItem || !isValidBannerItem(currentItem)) {
        return null;
    }

    const tileImages = currentItem.tileImageUrls.slice(0, 3);
    const title = isRTL && currentItem.titleAr ? currentItem.titleAr : currentItem.title;

    return (
        <View style={[styles.section, style]}>
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={handlePress}
                style={[styles.card, { height: layout.cardHeight }]}
            >
                <View style={[styles.hero, { height: layout.heroHeight }]}>
                    <Image
                        source={{ uri: currentItem.heroImageUrl }}
                        style={styles.heroImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        accessibilityLabel={currentItem.altText || title}
                    />
                    <View style={styles.overlay} />
                    <View style={[styles.header, isRTL && styles.headerRTL]}>
                        <PhonkText
                            numberOfLines={1}
                            style={[
                                styles.title,
                                {
                                    textAlign: isRTL ? 'right' : 'left',
                                    writingDirection: isRTL ? 'rtl' : 'ltr',
                                },
                            ]}
                        >
                            {title}
                        </PhonkText>
                    </View>
                </View>

                <View style={[styles.tilesRow, isRTL && styles.tilesRowRTL, { gap: layout.tileGap }]}>
                    {tileImages.map((imageUrl, index) => (
                        <View
                            key={`${currentItem.id}-tile-${index}`}
                            style={[
                                styles.tile,
                                {
                                    width: layout.tileWidth,
                                    height: layout.tileHeight,
                                },
                            ]}
                        >
                            <Image
                                source={{ uri: imageUrl }}
                                style={styles.tileImage}
                                contentFit="cover"
                                cachePolicy="memory-disk"
                                accessibilityLabel={currentItem.altText || title}
                            />
                        </View>
                    ))}
                </View>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        paddingTop: 40,

    },
    card: {
        width: '100%',
        overflow: 'hidden',
    },
    hero: {
        width: '100%',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        overflow: 'hidden',
        backgroundColor: '#111111',
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    overlay: {
        ...StyleSheet.absoluteFill,
        backgroundColor: 'rgba(0, 0, 0, 0.36)',
    },
    header: {
        position: 'absolute',
        top: 16,
        left: 8,
        right: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14,
    },
    headerRTL: {
        flexDirection: 'row-reverse',
        left: 24,
        right: 8,
    },
    title: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 20,
        letterSpacing: 0,
        includeFontPadding: false,
    },
    tilesRow: {
        position: 'absolute',
        left: 4,
        right: 4,
        bottom: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    tilesRowRTL: {
        flexDirection: 'row-reverse',
    },
    tile: {
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#FFFFFF',
        overflow: 'hidden',
        backgroundColor: '#f0f0f0',
    },
    tileImage: {
        width: '100%',
        height: '100%',
    },
});
