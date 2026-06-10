import { BottomSheet, RNHostView } from '@expo/ui';
import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    I18nManager,
    StyleProp,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';
import Animated, {
    Easing,
    ReduceMotion,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

import { Typography } from '../../constants/Typography';
import { triggerSubtleHaptic } from '../../utils/haptics';
import { getBottomSheetBackgroundModifiers } from '../../utils/expoUiBottomSheet';
import WaktiSheetContent from './WaktiSheetContent';

const waktiBannerImage = require('../../assets/images/waktilogo.png');
const waktiSheetBackgroundColor = '#050B14';
const waktiBannerUsesDarkTheme = true;
const reduceMotion = ReduceMotion.System;
const gridUnit = 54;
const gridVerticalOffsets = Array.from({ length: 13 }, (_, index) => index * gridUnit - gridUnit / 2);
const gridHorizontalOffsets = Array.from({ length: 5 }, (_, index) => index * gridUnit - gridUnit / 2);
const gridIntersections = gridVerticalOffsets.flatMap((left) =>
    gridHorizontalOffsets.map((top) => ({ left, top })),
);

type WaktiBannerProps = {
    style?: StyleProp<ViewStyle>;
};

export default function WaktiBanner({ style }: WaktiBannerProps) {
    const [isSheetPresented, setIsSheetPresented] = useState(false);
    const isRTL = I18nManager.isRTL;
    const { t } = useTranslation();
    const sheetBackgroundModifiers = useMemo(
        () => getBottomSheetBackgroundModifiers(waktiSheetBackgroundColor),
        [],
    );
    const prefersReducedMotion = useReducedMotion();
    const gridSweep = useSharedValue(prefersReducedMotion ? 1 : 0);

    useEffect(() => {
        if (prefersReducedMotion) {
            gridSweep.value = 1;
            return;
        }

        gridSweep.value = withRepeat(
            withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.quad), reduceMotion }),
            -1,
            true,
        );
    }, [gridSweep, prefersReducedMotion]);

    const gridSweepStyle = useAnimatedStyle(() => ({
        opacity: 0.18 + gridSweep.value * 0.16,
        transform: [
            { translateX: -120 + gridSweep.value * 240 },
            { rotate: '18deg' },
        ],
    }));

    const handleBannerPress = () => {
        triggerSubtleHaptic();
        setIsSheetPresented(true);
    };

    const closeSheet = () => {
        triggerSubtleHaptic();
        setIsSheetPresented(false);
    };

    return (
        <View style={[styles.section, style]}>
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleBannerPress}
                style={[
                    styles.card,
                    waktiBannerUsesDarkTheme ? styles.cardDark : styles.cardLight,
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('wakti_banner_accessibility_label')}
                accessibilityHint={t('wakti_banner_accessibility_hint')}
            >
                <View pointerEvents="none" style={styles.gridLayer}>
                    <View style={[styles.gridVignette, waktiBannerUsesDarkTheme ? styles.gridVignetteDark : styles.gridVignetteLight]} />
                    <Animated.View
                        style={[
                            styles.gridSweep,
                            waktiBannerUsesDarkTheme ? styles.gridSweepDark : styles.gridSweepLight,
                            gridSweepStyle,
                        ]}
                    />
                    {gridVerticalOffsets.map((offset) => (
                        <View
                            key={`v-${offset}`}
                            style={[
                                styles.gridLineVertical,
                                { left: offset },
                                waktiBannerUsesDarkTheme ? styles.gridLineVerticalDark : styles.gridLineVerticalLight,
                            ]}
                        />
                    ))}
                    {gridHorizontalOffsets.map((offset) => (
                        <View
                            key={`h-${offset}`}
                            style={[
                                styles.gridLineHorizontal,
                                { top: offset },
                                waktiBannerUsesDarkTheme ? styles.gridLineDark : styles.gridLineLight,
                            ]}
                        />
                    ))}
                    {gridIntersections.map(({ left, top }) => (
                        <View
                            key={`dot-${left}-${top}`}
                            style={[
                                styles.gridIntersection,
                                { left: left - 2, top: top - 2 },
                                waktiBannerUsesDarkTheme ? styles.gridIntersectionDark : styles.gridIntersectionLight,
                            ]}
                        />
                    ))}
                </View>
                <View style={[styles.content, isRTL && styles.contentRTL]}>
                    <View style={styles.copy}>
                        <Text style={[styles.headline, waktiBannerUsesDarkTheme ? styles.headlineDark : styles.headlineLight, isRTL && styles.textRTL]} numberOfLines={2}>
                            {isRTL ? t('wakti_banner_headline') : 'All in one AI App for students'}
                        </Text>
                        <View style={[styles.offerPill, waktiBannerUsesDarkTheme ? styles.offerPillDark : styles.offerPillLight, isRTL && styles.offerPillRTL]}>
                            <Text style={[styles.offerText, isRTL && styles.offerTextArabic]} numberOfLines={1}>
                                {t('wakti_banner_offer')}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.artWrap}>
                        <View style={[styles.artPanel, waktiBannerUsesDarkTheme ? styles.artPanelDark : styles.artPanelLight]}>
                            <Image
                                source={waktiBannerImage}
                                style={styles.artImage}
                                contentFit="contain"
                                accessibilityLabel="Wakti AI logo"
                            />
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
            <BottomSheet
                isPresented={isSheetPresented}
                onDismiss={() => setIsSheetPresented(false)}
                snapPoints={['half']}
                modifiers={sheetBackgroundModifiers}
                testID="wakti-bottom-sheet"
            >
                <RNHostView matchContents>
                    <WaktiSheetContent
                        isDark
                        onClose={closeSheet}
                        onStoreOpened={() => setIsSheetPresented(false)}
                    />
                </RNHostView>
            </BottomSheet>
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        paddingTop: 22,
        paddingHorizontal: 5,
    },
    card: {
        position: 'relative',
        overflow: 'hidden',
        borderWidth: 1.5,
        borderRadius: 30,
    },
    cardLight: {
        backgroundColor: 'rgba(239, 247, 255, 0.98)',
        borderColor: 'rgba(82, 148, 241, 0.46)',
        boxShadow: '0 18px 38px rgba(17, 78, 168, 0.09)',
    },
    cardDark: {
        backgroundColor: '#050B14',
        borderColor: 'rgba(116, 177, 255, 0.32)',
        boxShadow: '0 18px 40px rgba(0, 0, 0, 0.30)',
    },
    content: {
        minHeight: 154,
        paddingVertical: 18,
        paddingHorizontal: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14,
        zIndex: 2,
    },
    contentRTL: {
        flexDirection: 'row-reverse',
    },
    copy: {
        flex: 1,
        minWidth: 0,
        gap: 14,
    },
    headline: {
        fontSize: 19,
        lineHeight: 25,
        fontFamily: Typography.hanson.bold,
        color: '#FFFFFF',
    },
    headlineLight: {
        color: '#FFFFFF',
    },
    headlineDark: {
        color: '#FFFFFF',
    },
    offerPill: {
        alignSelf: 'flex-start',
        borderRadius: 999,
        paddingVertical: 7,
        paddingHorizontal: 12,
    },
    offerPillRTL: {
        alignSelf: 'flex-end',
    },
    offerPillLight: {
        backgroundColor: 'rgba(24, 184, 82, 0.94)',
    },
    offerPillDark: {
        backgroundColor: '#18B852',
    },
    offerText: {
        color: '#FFFFFF',
        fontSize: 15,
        lineHeight: 18,
        fontFamily: Typography.hanson.bold,
        textTransform: 'uppercase',
    },
    offerTextArabic: {
        fontFamily: 'TajawalBlack',
        textAlign: 'right',
        textTransform: 'none',
        writingDirection: 'rtl',
    },
    artWrap: {
        width: 112,
        height: 112,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    artPanel: {
        width: 112,
        height: 112,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderRadius: 27,
    },
    artPanelLight: {
        backgroundColor: 'rgba(239, 247, 255, 0.84)',
        boxShadow: '0 20px 48px rgba(28, 103, 202, 0.22)',
    },
    artPanelDark: {
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
        boxShadow: '0 26px 62px rgba(124, 181, 255, 0.30)',
    },
    artImage: {
        width: 96,
        height: 96,
    },
    gridLayer: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
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
        backgroundColor: 'rgba(255, 255, 255, 0.38)',
    },
    gridVignetteDark: {
        backgroundColor: 'rgba(0, 0, 0, 0.14)',
    },
    gridLineVertical: {
        position: 'absolute',
        top: -24,
        height: 220,
        width: 1.25,
    },
    gridLineHorizontal: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
    },
    gridLineLight: {
        backgroundColor: 'rgba(56, 139, 252, 0.38)',
        boxShadow: '0 0 9px rgba(56, 139, 252, 0.26)',
    },
    gridLineDark: {
        backgroundColor: 'rgba(126, 187, 255, 0.34)',
        boxShadow: '0 0 10px rgba(126, 187, 255, 0.28)',
    },
    gridLineVerticalLight: {
        backgroundColor: 'rgba(56, 139, 252, 0.40)',
        boxShadow: '0 0 10px rgba(56, 139, 252, 0.28)',
    },
    gridLineVerticalDark: {
        backgroundColor: 'rgba(139, 190, 255, 0.34)',
        boxShadow: '0 0 12px rgba(139, 190, 255, 0.30)',
    },
    gridIntersection: {
        position: 'absolute',
        width: 4,
        height: 4,
        borderRadius: 2,
    },
    gridIntersectionLight: {
        backgroundColor: 'rgba(69, 148, 255, 0.38)',
        boxShadow: '0 0 10px rgba(69, 148, 255, 0.36)',
    },
    gridIntersectionDark: {
        backgroundColor: 'rgba(149, 201, 255, 0.36)',
        boxShadow: '0 0 12px rgba(149, 201, 255, 0.38)',
    },
    gridSweep: {
        position: 'absolute',
        top: -24,
        bottom: -24,
        width: 92,
    },
    gridSweepLight: {
        backgroundColor: 'rgba(87, 166, 255, 0.14)',
    },
    gridSweepDark: {
        backgroundColor: 'rgba(113, 181, 255, 0.13)',
    },
    textRTL: {
        textAlign: 'right',
        writingDirection: 'rtl',
    },
});
