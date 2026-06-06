import Ionicons from '@expo/vector-icons/Ionicons';
import { GlassView } from 'expo-glass-effect';
import { Image } from 'expo-image';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    I18nManager,
    Linking,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { Colors } from '../../constants/Colors';
import { Typography } from '../../constants/Typography';
import { BottomSheetOverscanBackground } from '../../utils/expoUiBottomSheet';
import { triggerSubtleHaptic } from '../../utils/haptics';
import { logger } from '../../utils/logger';

const WAKTI_IOS_APP_URL = 'itms-apps://itunes.apple.com/app/id6755150700';
const WAKTI_IOS_WEB_URL = 'https://apps.apple.com/app/id6755150700';
const WAKTI_ANDROID_MARKET_URL = 'market://details?id=ai.wakti.app';
const WAKTI_ANDROID_WEB_URL = 'https://play.google.com/store/apps/details?id=ai.wakti.app';
const waktiBannerImage = require('../../assets/images/waktilogo.png');
const gridUnit = 60;
const gridVerticalOffsets = Array.from({ length: 40 }, (_, index) => index * gridUnit - gridUnit * 12);
const gridHorizontalOffsets = Array.from({ length: 64 }, (_, index) => index * gridUnit - gridUnit * 14.5);
const gridIntersections = gridVerticalOffsets.flatMap((left) =>
    gridHorizontalOffsets.map((top) => ({ left, top })),
);
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

type WaktiSheetContentProps = {
    isDark?: boolean;
    onClose?: () => void;
    onStoreOpened?: () => void;
};

type FeatureChipProps = {
    feature: string;
    index: number;
    featureCardMinHeight: number;
    featureFontSize: number;
    featureLineHeight: number;
    isCompactWidth: boolean;
    isDark: boolean;
    isRTL: boolean;
};

function FeatureChip({
    feature,
    index,
    featureCardMinHeight,
    featureFontSize,
    featureLineHeight,
    isCompactWidth,
    isDark,
    isRTL,
}: FeatureChipProps) {
    const pulseProgress = useSharedValue(0);

    useEffect(() => {
        pulseProgress.value = withDelay(
            index * 260,
            withRepeat(
                withSequence(
                    withTiming(1, { duration: 1900 }),
                    withTiming(0, { duration: 1900 }),
                ),
                -1,
                false,
            ),
        );
    }, [index, pulseProgress]);

    const chipAnimatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateY: pulseProgress.value * -2 },
            { scale: 1 + pulseProgress.value * 0.01 },
        ],
    }));
    const chipHighlightStyle = useAnimatedStyle(() => ({
        opacity: pulseProgress.value * (isDark ? 0.18 : 0.28),
    }));

    return (
        <Animated.View
            style={[
                styles.featureChipWrap,
                chipAnimatedStyle,
            ]}
            accessibilityRole="text"
        >
            <View
                style={[
                    styles.featureCard,
                    {
                        minHeight: featureCardMinHeight,
                        paddingHorizontal: isCompactWidth ? 12 : 14,
                        paddingVertical: isCompactWidth ? 9 : 10,
                    },
                    isDark ? styles.featureCardDark : styles.featureCardLight,
                ]}
            >
                <GlassView
                    style={StyleSheet.absoluteFill}
                    glassEffectStyle="regular"
                    colorScheme={isDark ? 'dark' : 'light'}
                    tintColor={isDark ? 'rgba(255,255,255,0.20)' : 'rgba(58,145,255,0.26)'}
                />
                <Animated.View
                    pointerEvents="none"
                    style={[
                        styles.featureCardHighlight,
                        isDark ? styles.featureCardHighlightDark : styles.featureCardHighlightLight,
                        chipHighlightStyle,
                    ]}
                />
                <Text
                    style={[
                        styles.featureText,
                        {
                            fontSize: featureFontSize,
                            lineHeight: featureLineHeight,
                        },
                        isDark ? styles.featureTextDark : styles.featureTextLight,
                        isRTL && styles.featureTextRTL,
                    ]}
                >
                    {feature}
                </Text>
            </View>
        </Animated.View>
    );
}

export default function WaktiSheetContent({ isDark = true, onStoreOpened }: WaktiSheetContentProps) {
    const { height, width } = useWindowDimensions();
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar' || I18nManager.isRTL;
    const ctaActionLabel = t('wakti_banner_cta_action');
    const ctaProductName = 'Wakti AI';
    const ctaLabel = `${ctaActionLabel} ${ctaProductName}`;
    const sheetBackgroundColor = isDark ? '#050B14' : '#EEF7FF';
    const studentFeatures = [
        t('wakti_feature_faster'),
        t('wakti_feature_smarter'),
        t('wakti_feature_easier'),
    ];
    const sheetMinHeight = Math.round(height * 0.5);
    const isCompactWidth = width < 360;
    const isShortScreen = height < 760;
    const contentWidth = clamp(width - (isCompactWidth ? 32 : 40), 280, 420);
    const containerTopPadding = isShortScreen ? 12 : 18;
    const containerBottomPadding = isShortScreen ? 12 : 16;
    const contentGap = isShortScreen ? 12 : 16;
    const headlineFontSize = isCompactWidth ? 22 : 24;
    const headlineLineHeight = isCompactWidth ? 27 : 29;
    const featureFontSize = isCompactWidth ? 12 : 13;
    const featureLineHeight = isCompactWidth ? 15 : 16;
    const featureCardMinHeight = isCompactWidth ? 44 : 46;
    const ctaFontSize = isCompactWidth ? 18 : 20;
    const ctaLineHeight = isCompactWidth ? 22 : 24;
    const ctaHorizontalPadding = isCompactWidth ? 18 : 24;
    const logoSize = clamp(width * 0.28, 92, 112);
    const logoGlowRadius = clamp(logoSize * 0.26, 24, 29);
    const ctaLabelMaxWidth = contentWidth - ctaHorizontalPadding * 2 - 56;
    const backgroundWidth = width * 5;
    const backgroundHeight = height * 4;
    const logoScale = useSharedValue(1);
    const logoGlow = useSharedValue(0);
    const ctaScale = useSharedValue(1);
    const logoAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: logoScale.value }],
    }));
    const logoGlowAnimatedStyle = useAnimatedStyle(() => ({
        opacity: logoGlow.value,
        transform: [{ scale: 0.94 + logoGlow.value * 0.08 }],
    }));
    const ctaAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: ctaScale.value }],
    }));

    const openFirstAvailableStoreUrl = async (urls: string[]) => {
        let lastError: unknown;

        for (const url of urls) {
            try {
                await Linking.openURL(url);
                return true;
            } catch (error) {
                lastError = error;
            }
        }

        logger.error('Error opening Wakti store URL:', lastError);
        return false;
    };

    const handleStorePress = async () => {
        const storeUrls = Platform.OS === 'android'
            ? [WAKTI_ANDROID_MARKET_URL, WAKTI_ANDROID_WEB_URL]
            : [WAKTI_IOS_APP_URL, WAKTI_IOS_WEB_URL];

        triggerSubtleHaptic();

        const didOpenStore = await openFirstAvailableStoreUrl(storeUrls);
        if (didOpenStore) {
            onStoreOpened?.();
        }
    };

    const handleLogoPressIn = () => {
        triggerSubtleHaptic();
        logoGlow.value = withTiming(isDark ? 0.52 : 0.42, { duration: 140 });
        logoScale.value = withSpring(1.05, { damping: 12, stiffness: 260 });
    };

    const handleLogoPressOut = () => {
        logoGlow.value = withTiming(0, { duration: 180 });
        logoScale.value = withSequence(
            withSpring(0.98, { damping: 13, stiffness: 280 }),
            withSpring(1, { damping: 12, stiffness: 240 }),
        );
    };

    const handleCtaPressIn = () => {
        ctaScale.value = withSpring(0.97, { damping: 14, stiffness: 320 });
    };

    const handleCtaPressOut = () => {
        ctaScale.value = withSpring(1, { damping: 11, stiffness: 260 });
    };

    return (
        <View
            style={[
                styles.container,
                {
                    minHeight: sheetMinHeight,
                    paddingTop: containerTopPadding,
                    paddingBottom: containerBottomPadding,
                    rowGap: contentGap,
                },
                isDark ? styles.containerDark : styles.containerLight,
                isRTL && styles.containerRTL,
            ]}
        >
            <BottomSheetOverscanBackground backgroundColor={sheetBackgroundColor} />
            <View
                pointerEvents="none"
                style={[
                    styles.gridLayer,
                    {
                        height: backgroundHeight,
                        left: -width * 2,
                        top: -height * 1.5,
                        width: backgroundWidth,
                    },
                ]}
            >
                <View style={[styles.gridVignette, isDark ? styles.gridVignetteDark : styles.gridVignetteLight]} />
                {gridVerticalOffsets.map((offset) => (
                    <View
                        key={`v-${offset}`}
                        style={[
                            styles.gridLineVertical,
                            { left: offset },
                            isDark ? styles.gridLineVerticalDark : styles.gridLineVerticalLight,
                        ]}
                    />
                ))}
                {gridHorizontalOffsets.map((offset) => (
                    <View
                        key={`h-${offset}`}
                        style={[
                            styles.gridLineHorizontal,
                            { top: offset, width: backgroundWidth },
                            isDark ? styles.gridLineDark : styles.gridLineLight,
                        ]}
                    />
                ))}
                {gridIntersections.map(({ left, top }) => (
                    <View
                        key={`dot-${left}-${top}`}
                        style={[
                            styles.gridIntersection,
                            { left: left - 2, top: top - 2 },
                            isDark ? styles.gridIntersectionDark : styles.gridIntersectionLight,
                        ]}
                    />
                ))}
            </View>
            <View style={[styles.contentColumn, { width: contentWidth, rowGap: contentGap }]}>
                <TouchableOpacity
                    activeOpacity={1}
                    onPressIn={handleLogoPressIn}
                    onPressOut={handleLogoPressOut}
                    style={[styles.logoTapTarget, { marginTop: isShortScreen ? 4 : 8, width: logoSize, height: logoSize }]}
                    accessibilityRole="button"
                    accessibilityLabel="Wakti AI logo"
                >
                    <Animated.View
                        style={[
                            styles.logoGlow,
                            {
                                width: logoSize,
                                height: logoSize,
                                borderRadius: logoGlowRadius,
                            },
                            logoGlowAnimatedStyle,
                        ]}
                    />
                    <Animated.View style={[styles.logoWrap, { width: logoSize, height: logoSize }, logoAnimatedStyle]}>
                        <Image
                            source={waktiBannerImage}
                            style={[styles.logo, { width: logoSize, height: logoSize }]}
                            contentFit="contain"
                            accessibilityLabel="Wakti AI logo"
                        />
                    </Animated.View>
                </TouchableOpacity>

                <View style={[styles.copy, { rowGap: contentGap }, isRTL && styles.copyRTL]}>
                    <Text
                        style={[
                            styles.headline,
                            {
                                fontSize: headlineFontSize,
                                lineHeight: headlineLineHeight,
                                maxWidth: contentWidth - 8,
                            },
                            isDark ? styles.headlineDark : styles.headlineLight,
                            isRTL && styles.headlineRTL,
                        ]}
                        numberOfLines={2}
                    >
                        {t('wakti_sheet_title')}
                    </Text>
                    <View style={[styles.featureGrid, { rowGap: isCompactWidth ? 7 : 8 }, isRTL && styles.featureGridRTL]}>
                        {studentFeatures.map((feature, index) => (
                            <FeatureChip
                                key={feature}
                                index={index}
                                feature={feature}
                                featureCardMinHeight={featureCardMinHeight}
                                featureFontSize={featureFontSize}
                                featureLineHeight={featureLineHeight}
                                isCompactWidth={isCompactWidth}
                                isDark={isDark}
                                isRTL={isRTL}
                            />
                        ))}
                    </View>
                    <Animated.View style={[styles.ctaMotionWrap, ctaAnimatedStyle]}>
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={handleStorePress}
                            onPressIn={handleCtaPressIn}
                            onPressOut={handleCtaPressOut}
                            style={[
                                styles.cta,
                                {
                                    minHeight: isCompactWidth ? 60 : 64,
                                    paddingHorizontal: ctaHorizontalPadding,
                                    paddingVertical: isCompactWidth ? 12 : 14,
                                },
                                isRTL && styles.ctaRTL,
                            ]}
                            accessibilityRole="link"
                            accessibilityLabel={ctaLabel}
                        >
                            <View style={styles.ctaIconWrap}>
                                <Ionicons name="arrow-down" size={25} color={Colors.brandGreen} />
                            </View>
                            <Text
                                style={[
                                    styles.ctaText,
                                    {
                                        fontSize: ctaFontSize,
                                        lineHeight: ctaLineHeight,
                                        maxWidth: ctaLabelMaxWidth,
                                    },
                                    isRTL && styles.ctaTextRTL,
                                ]}
                            >
                                {isRTL ? (
                                    <>
                                        {ctaActionLabel}{' '}
                                        <Text style={styles.waktiEnglishText}>{ctaProductName}</Text>
                                    </>
                                ) : ctaLabel}
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        flex: 1,
        overflow: 'visible',
        alignItems: 'center',
    },
    containerLight: {
        backgroundColor: '#EEF7FF',
    },
    containerDark: {
        backgroundColor: '#050B14',
    },
    containerRTL: {
        direction: 'rtl',
    },
    contentColumn: {
        alignItems: 'center',
        maxWidth: 420,
        alignSelf: 'center',
    },
    logoWrap: {
        width: 112,
        height: 112,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    logoTapTarget: {
        alignSelf: 'center',
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    logoGlow: {
        position: 'absolute',
        width: 112,
        height: 112,
        borderRadius: 29,
        backgroundColor: '#FFFFFF',
        shadowColor: '#FFFFFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.48,
        shadowRadius: 12,
    },
    logo: {
        width: 112,
        height: 112,
    },
    copy: {
        alignItems: 'center',
        zIndex: 2,
        width: '100%',
    },
    copyRTL: {
        direction: 'rtl',
    },
    headline: {
        fontSize: 24,
        lineHeight: 29,
        fontFamily: Typography.poppins.medium,
        textAlign: 'center',
    },
    headlineLight: {
        color: '#102B62',
    },
    headlineDark: {
        color: '#FFFFFF',
    },
    headlineRTL: {
        textAlign: 'center',
        writingDirection: 'rtl',
    },
    featureGrid: {
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    featureGridRTL: {
        alignItems: 'center',
    },
    featureChipWrap: {
        width: '100%',
    },
    featureCard: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 13,
        borderWidth: 1.4,
        overflow: 'hidden',
    },
    featureCardLight: {
        backgroundColor: 'rgba(58, 145, 255, 0.14)',
        borderColor: 'rgba(58, 145, 255, 0.44)',
    },
    featureCardDark: {
        backgroundColor: 'rgba(255, 255, 255, 0.16)',
        borderColor: 'rgba(255, 255, 255, 0.34)',
    },
    featureCardHighlight: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 13,
    },
    featureCardHighlightLight: {
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
    },
    featureCardHighlightDark: {
        backgroundColor: 'rgba(163, 215, 255, 0.40)',
    },
    featureText: {
        fontSize: 13,
        lineHeight: 16,
        fontFamily: Typography.poppins.semiBold,
        textAlign: 'center',
        textTransform: 'uppercase',
    },
    featureTextRTL: {
        textAlign: 'center',
        textTransform: 'none',
        writingDirection: 'rtl',
    },
    featureTextLight: {
        color: '#0A0F0C',
    },
    featureTextDark: {
        color: '#FFFFFF',
    },
    ctaMotionWrap: {
        width: '100%',
    },
    cta: {
        alignSelf: 'stretch',
        minHeight: 64,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        borderRadius: 34,
        backgroundColor: Colors.brandGreen,
        paddingVertical: 14,
        paddingHorizontal: 24,
        marginTop: 0,
        boxShadow: '0 16px 32px rgba(24, 184, 82, 0.30)',
    },
    ctaRTL: {
        flexDirection: 'row-reverse',
    },
    ctaIconWrap: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
    },
    ctaText: {
        color: '#FFFFFF',
        fontSize: 20,
        lineHeight: 24,
        fontFamily: Typography.poppins.semiBold,
        textAlign: 'center',
    },
    ctaTextRTL: {
        textAlign: 'center',
        writingDirection: 'rtl',
    },
    waktiEnglishText: {
        writingDirection: 'ltr',
    },
    gridLayer: {
        position: 'absolute',
        opacity: 1,
        zIndex: 1,
    },
    gridVignette: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
    },
    gridVignetteLight: {
        backgroundColor: 'rgba(223, 241, 255, 0.42)',
    },
    gridVignetteDark: {
        backgroundColor: 'rgba(7, 20, 34, 0.22)',
    },
    gridLineVertical: {
        position: 'absolute',
        top: -960,
        height: 4200,
        width: 1.2,
    },
    gridLineHorizontal: {
        position: 'absolute',
        left: 0,
        height: 1.2,
    },
    gridLineLight: {
        backgroundColor: 'rgba(56, 139, 252, 0.42)',
        boxShadow: '0 0 11px rgba(56, 139, 252, 0.30)',
    },
    gridLineDark: {
        backgroundColor: 'rgba(126, 187, 255, 0.38)',
        boxShadow: '0 0 12px rgba(126, 187, 255, 0.32)',
    },
    gridLineVerticalLight: {
        backgroundColor: 'rgba(56, 139, 252, 0.44)',
        boxShadow: '0 0 12px rgba(56, 139, 252, 0.30)',
    },
    gridLineVerticalDark: {
        backgroundColor: 'rgba(139, 190, 255, 0.40)',
        boxShadow: '0 0 14px rgba(139, 190, 255, 0.34)',
    },
    gridIntersection: {
        position: 'absolute',
        width: 4,
        height: 4,
        borderRadius: 2,
    },
    gridIntersectionLight: {
        backgroundColor: 'rgba(69, 148, 255, 0.30)',
        boxShadow: '0 0 10px rgba(69, 148, 255, 0.28)',
    },
    gridIntersectionDark: {
        backgroundColor: 'rgba(149, 201, 255, 0.30)',
        boxShadow: '0 0 12px rgba(149, 201, 255, 0.30)',
    },
    textRTL: {
        textAlign: 'right',
        writingDirection: 'rtl',
    },
});
