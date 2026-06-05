import { Ionicons } from '@expo/vector-icons';
import { BottomSheet as UniversalBottomSheet, RNHostView as UniversalRNHostView } from '@expo/ui';
import React from 'react';
import {
    I18nManager,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../../context/AppThemeContext';
import { Typography } from '../../constants/Typography';
import PhonkText from '../PhonkText';

type GiftCardTermsDrawerProps = {
    visible: boolean;
    onClose: () => void;
};

export default function GiftCardTermsDrawer({
    visible,
    onClose,
}: GiftCardTermsDrawerProps) {
    const insets = useSafeAreaInsets();
    const { height: windowHeight, width: windowWidth } = useWindowDimensions();
    const { theme } = useAppTheme();
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar' || I18nManager.isRTL;
    const sheetWidth = Math.max(0, windowWidth - 32);
    const sheetMaxHeight = Math.max(0, windowHeight * 0.5 - insets.bottom);
    const sheetBodyMaxHeight = Math.max(0, sheetMaxHeight - 120);
    const sheetContent = (
        <View
            style={[
                styles.sheetContent,
                {
                    backgroundColor: theme.card,
                    width: sheetWidth,
                    maxHeight: sheetMaxHeight,
                    paddingBottom: insets.bottom + 24,
                },
            ]}
        >
            <View style={[styles.sheetHeader, isRTL && styles.sheetHeaderRTL]}>
                <PhonkText style={[styles.modalTitleText, isRTL && styles.modalTitleTextRTL, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t('terms_and_conditions_caps')}
                </PhonkText>
                <TouchableOpacity
                    onPress={onClose}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="close-circle" size={28} color={theme.icon} />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
                style={[styles.sheetBody, { maxHeight: sheetBodyMaxHeight }]}
                contentContainerStyle={styles.sheetBodyContent}
            >
                <Text style={[styles.descriptionText, { color: theme.mutedText, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t('no_specific_terms')}
                </Text>

                <View style={[styles.commonTerms, { borderTopColor: theme.border }]}>
                    <View style={[styles.termRow, isRTL && styles.termRowRTL]}>
                        <Ionicons name="checkmark-circle" size={18} color={theme.brand} />
                        <Text style={[styles.termText, isRTL && styles.termTextRTL, { color: theme.mutedText, textAlign: isRTL ? 'right' : 'left' }]}>
                            {t('in_store_only')}
                        </Text>
                    </View>
                    <View style={[styles.termRow, isRTL && styles.termRowRTL]}>
                        <Ionicons name="checkmark-circle" size={18} color={theme.brand} />
                        <Text style={[styles.termText, isRTL && styles.termTextRTL, { color: theme.mutedText, textAlign: isRTL ? 'right' : 'left' }]}>
                            {t('cannot_be_combined')}
                        </Text>
                    </View>
                    <View style={[styles.termRow, isRTL && styles.termRowRTL]}>
                        <Ionicons name="checkmark-circle" size={18} color={theme.brand} />
                        <Text style={[styles.termText, isRTL && styles.termTextRTL, { color: theme.mutedText, textAlign: isRTL ? 'right' : 'left' }]}>
                            {t('xp_promotional_reward')}
                        </Text>
                    </View>
                    <View style={[styles.termRow, isRTL && styles.termRowRTL]}>
                        <Ionicons name="checkmark-circle" size={18} color={theme.brand} />
                        <Text style={[styles.termText, isRTL && styles.termTextRTL, { color: theme.mutedText, textAlign: isRTL ? 'right' : 'left' }]}>
                            {t('xp_no_cash_withdrawal')}
                        </Text>
                    </View>
                    <View style={[styles.termRow, isRTL && styles.termRowRTL]}>
                        <Ionicons name="checkmark-circle" size={18} color={theme.brand} />
                        <Text style={[styles.termText, isRTL && styles.termTextRTL, { color: theme.mutedText, textAlign: isRTL ? 'right' : 'left' }]}>
                            {t('xp_in_app_only')}
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );

    if (Platform.OS === 'ios') {
        const {
            BottomSheet: SwiftUIBottomSheet,
            Group: SwiftUIGroup,
            Host: SwiftUIHost,
            RNHostView: SwiftUIRNHostView,
            // eslint-disable-next-line @typescript-eslint/no-require-imports
        } = require('@expo/ui/swift-ui');
        const {
            frame,
            padding,
            presentationDragIndicator,
            // eslint-disable-next-line @typescript-eslint/no-require-imports
        } = require('@expo/ui/swift-ui/modifiers');

        return (
            <SwiftUIHost style={StyleSheet.absoluteFill} pointerEvents="none">
                <SwiftUIBottomSheet
                    isPresented={visible}
                    onIsPresentedChange={(presented: boolean) => {
                        if (!presented) onClose();
                    }}
                    fitToContents
                    testID="gift-card-terms-bottom-sheet"
                >
                    <SwiftUIGroup
                        modifiers={[
                            frame({ maxWidth: Infinity, alignment: 'topLeading' }),
                            padding({ top: 16, leading: 16, trailing: 16 }),
                            presentationDragIndicator('visible'),
                        ]}
                    >
                        <SwiftUIRNHostView matchContents>
                            {sheetContent}
                        </SwiftUIRNHostView>
                    </SwiftUIGroup>
                </SwiftUIBottomSheet>
            </SwiftUIHost>
        );
    }

    return (
        <UniversalBottomSheet
            isPresented={visible}
            onDismiss={onClose}
            testID="gift-card-terms-bottom-sheet"
        >
            <UniversalRNHostView matchContents>
                {sheetContent}
            </UniversalRNHostView>
        </UniversalBottomSheet>
    );
}

const styles = StyleSheet.create({
    sheetContent: {
        paddingHorizontal: 24,
        paddingTop: 18,
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    sheetHeaderRTL: {
        flexDirection: 'row-reverse',
    },
    modalTitleText: {
        flex: 1,
        fontSize: 20,
        letterSpacing: 0.5,
    },
    modalTitleTextRTL: {
        writingDirection: 'rtl',
    },
    sheetBody: {
        flexGrow: 0,
    },
    sheetBodyContent: {
        paddingBottom: 24,
    },
    descriptionText: {
        fontSize: 16,
        fontFamily: Typography.poppins.medium,
        lineHeight: 24,
    },
    commonTerms: {
        marginTop: 4,
        gap: 12,
        paddingTop: 24,
        borderTopWidth: 1,
    },
    termRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    termRowRTL: {
        flexDirection: 'row-reverse',
    },
    termText: {
        fontSize: 14,
        fontFamily: Typography.poppins.medium,
        flex: 1,
    },
    termTextRTL: {
        writingDirection: 'rtl',
    },
});
