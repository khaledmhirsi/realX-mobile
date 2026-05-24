import { Image } from 'expo-image';
import {
    I18nManager,
    Linking,
    Platform,
    StyleProp,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';

import { Colors } from '../../constants/Colors';
import { triggerSubtleHaptic } from '../../utils/haptics';
import { logger } from '../../utils/logger';

const WAKTI_IOS_URL = 'https://apps.apple.com/us/app/wakti-ai/id6755150700';
const WAKTI_ANDROID_URL = 'https://play.google.com/store/apps/details?id=ai.wakti.app';
const waktiBannerImage = require('../../assets/images/wakti-banner.png');

type WaktiBannerProps = {
    style?: StyleProp<ViewStyle>;
};

export default function WaktiBanner({ style }: WaktiBannerProps) {
    const isRTL = I18nManager.isRTL;

    const handlePress = async () => {
        const storeUrl = Platform.OS === 'android' ? WAKTI_ANDROID_URL : WAKTI_IOS_URL;

        triggerSubtleHaptic();

        try {
            await Linking.openURL(storeUrl);
        } catch (error) {
            logger.error('Error opening Wakti store URL:', error);
        }
    };

    return (
        <View style={[styles.section, style]}>
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={handlePress}
                style={styles.card}
                accessibilityRole="link"
                accessibilityLabel="Download Wakti AI"
            >
                <View style={styles.glowTop} />
                <View style={styles.glowBottom} />

                <View style={[styles.content, isRTL && styles.contentRTL]}>
                    <View style={styles.artPanel}>
                        <Image
                            source={waktiBannerImage}
                            style={styles.artImage}
                            contentFit="contain"
                            accessibilityLabel="Wakti AI"
                        />
                    </View>

                    <View style={[styles.copy, isRTL && styles.copyRTL]}>
                        <Text style={[styles.kicker, isRTL && styles.textRTL]}>
                            Study smarter
                        </Text>
                        <Text style={[styles.headline, isRTL && styles.textRTL]}>
                            Meet your AI study companion
                        </Text>
                        <Text style={[styles.body, isRTL && styles.textRTL]}>
                            Get help planning, learning, and moving faster with Wakti.
                        </Text>
                        <Text style={[styles.title, isRTL && styles.textRTL]}>
                            Try Wakti AI
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        paddingTop: 22,
    },
    card: {
        minHeight: 232,
        overflow: 'hidden',
        backgroundColor: '#061015',
        borderWidth: 1,
        borderColor: '#102638',
        paddingVertical: 20,
        paddingHorizontal: 18,
        boxShadow: '0 16px 34px rgba(4, 15, 18, 0.18)',
    },
    glowTop: {
        position: 'absolute',
        top: -84,
        right: -48,
        width: 210,
        height: 210,
        borderRadius: 105,
        backgroundColor: 'rgba(28, 184, 82, 0.22)',
    },
    glowBottom: {
        position: 'absolute',
        bottom: -96,
        left: -60,
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: 'rgba(44, 124, 196, 0.22)',
    },
    content: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 18,
        zIndex: 2,
    },
    contentRTL: {
        flexDirection: 'row-reverse',
    },
    artPanel: {
        width: 132,
        height: 176,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderWidth: 1,
        borderColor: 'rgba(125, 177, 224, 0.16)',
    },
    artImage: {
        width: 166,
        height: 162,
    },
    copy: {
        flex: 1,
        gap: 8,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    copyRTL: {
        alignItems: 'flex-end',
    },
    kicker: {
        color: Colors.brandGreen,
        fontSize: 11,
        lineHeight: 14,
        fontWeight: '900',
        letterSpacing: 1.1,
        textTransform: 'uppercase',
    },
    headline: {
        color: '#FFFFFF',
        fontSize: 24,
        lineHeight: 28,
        fontWeight: '900',
        letterSpacing: -0.7,
        maxWidth: 210,
    },
    body: {
        color: 'rgba(255, 255, 255, 0.74)',
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '600',
        maxWidth: 220,
    },
    title: {
        overflow: 'hidden',
        alignSelf: 'flex-start',
        borderRadius: 999,
        backgroundColor: Colors.brandGreen,
        paddingVertical: 10,
        paddingHorizontal: 16,
        color: '#FFFFFF',
        fontSize: 15,
        lineHeight: 20,
        fontWeight: '900',
        letterSpacing: -0.1,
        textShadowColor: 'rgba(0, 0, 0, 0.36)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 8,
    },
    textRTL: {
        alignSelf: 'flex-end',
        textAlign: 'right',
        writingDirection: 'rtl',
    },
});
