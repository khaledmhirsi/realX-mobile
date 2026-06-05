import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import {
    I18nManager,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useAppTheme } from '../../context/AppThemeContext';
import { Typography } from '../../constants/Typography';
import ScalePressable from '../ScalePressable';
import PhonkText from '../PhonkText';
import GiftCardCheckout from './GiftCardCheckout';
import GiftCardTermsDrawer from './GiftCardTermsDrawer';
import { triggerSubtleHaptic } from '../../utils/haptics';
import { useTranslation } from 'react-i18next';
import type { WalletBrand } from './types';

type RedeemGiftCardProps = {
    brand: WalletBrand;
    onBack: () => void;
    maxLimit: number;
    currency: string;
    onSuccess?: () => void;
};


export default function RedeemGiftCard({
    brand,
    onBack,
    maxLimit,
    currency,
    onSuccess,
}: RedeemGiftCardProps) {
    const amounts = brand.loyalty && brand.loyalty.length > 0 ? brand.loyalty : [25, 50, 75];
    const { theme } = useAppTheme();
    const [selectedAmount, setSelectedAmount] = useState(amounts[0]);
    const [showCheckout, setShowCheckout] = useState(false);
    const [showTerms, setShowTerms] = useState(false);
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar' || I18nManager.isRTL;

    if (showCheckout) {
        return (
            <GiftCardCheckout
                brand={brand}
                selectedAmount={selectedAmount}
                currency={currency}
                onBack={() => setShowCheckout(false)}
                onSuccess={onSuccess}
            />
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <ScalePressable
                    style={[styles.backButton, { backgroundColor: theme.cardMuted }]}
                    onPress={() => {
                        triggerSubtleHaptic();
                        onBack();
                    }}
                    pressedScale={0.9}
                >
                    <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={theme.icon} />
                </ScalePressable>
                <View style={styles.logoContainer}>
                    {isRTL ? (
                        <Text style={styles.logoArabicText}>
                            <Text style={[styles.logoCardArabic, { color: theme.text }]}>{t('xcard_title_card')}</Text>
                            {' '}
                            <Text style={[styles.logoXArabic, { color: theme.brand }]}>{t('xcard_title_x')}</Text>
                        </Text>
                    ) : (
                        <>
                            <PhonkText style={[styles.logoX, { color: theme.brand }]}>{t('xcard_title_x')}</PhonkText>
                            <PhonkText style={[styles.logoCard, { color: theme.text }]}>{t('xcard_title_card')}</PhonkText>
                        </>
                    )}
                </View>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Main Card */}
                <View style={[styles.mainCard, { backgroundColor: theme.cardMuted }]}>
                    <Text
                        style={[
                            styles.inStoreBadge,
                            { color: theme.subtleText },
                            isRTL ? styles.inStoreBadgeRTL : undefined,
                        ]}
                    >
                        {t('in_store_badge')}
                    </Text>

                    <View style={[styles.logoWrapper, { backgroundColor: theme.logoTile, shadowColor: theme.shadow }]}>
                        <View style={[styles.brandLogoContainer, { backgroundColor: brand.backgroundColor || theme.logoTile }]}>
                            {brand.logo ? (
                                <Image source={{ uri: brand.logo }} style={styles.brandLogo} />
                            ) : (
                                <Text style={[styles.brandLogoPlaceholder, { color: theme.logoTileText }]}>
                                    {brand.name.charAt(0)}
                                </Text>
                            )}
                        </View>
                    </View>

                    <Text style={[styles.brandName, { color: theme.text }]}>{brand.name}</Text>

                    <View style={styles.generateGiftCardWrapper}>
                        <PhonkText style={[styles.generateText, { color: theme.text }]}>{t('generate_text')}</PhonkText>
                        <PhonkText style={[styles.giftCardText, { color: theme.brand }]}>{t('gift_card_text')}</PhonkText>
                    </View>

                    <View style={[styles.selectedAmountContainer, { backgroundColor: theme.card }]}>
                        <PhonkText style={[styles.selectedAmountText, { color: theme.text }]}>
                            {currency} {selectedAmount.toFixed(2)}
                        </PhonkText>
                    </View>
                </View>

                <ScalePressable
                    style={[styles.tcButton, isRTL && styles.tcButtonRTL]}
                    onPress={() => {
                        triggerSubtleHaptic();
                        setShowTerms(true);
                    }}
                    pressedScale={0.985}
                >
                    <Ionicons name="information-circle-outline" size={18} color={theme.iconMuted} />
                    <Text style={[styles.tcButtonText, { color: theme.subtleText }, isRTL && styles.tcButtonTextRTL]}>{t('view_tc')}</Text>
                </ScalePressable>

                {/* Amount Selection */}
                <View style={styles.selectionSection}>
                    {/* MAX LIMIT label removed */}

                    <View style={[styles.amountOptions, isRTL && styles.amountOptionsRTL]}>
                        {amounts.map((amount) => (
                            <ScalePressable
                                key={amount}
                                style={[
                                    styles.amountOption,
                                    {
                                        backgroundColor: selectedAmount === amount ? theme.card : theme.cardMuted,
                                        borderColor: selectedAmount === amount ? theme.border : 'transparent',
                                        shadowColor: theme.shadow,
                                    },
                                    selectedAmount === amount && styles.amountOptionSelected,
                                ]}
                                onPress={() => {
                                    triggerSubtleHaptic();
                                    setSelectedAmount(amount);
                                }}
                                pressedScale={0.94}
                            >
                                <PhonkText style={[
                                    styles.amountOptionText,
                                    { color: selectedAmount === amount ? theme.text : theme.mutedText },
                                ]}>
                                    {amount.toFixed(2)}
                                </PhonkText>
                            </ScalePressable>
                        ))}
                    </View>
                </View>

                {/* Insufficient Balance Warning */}
                {selectedAmount > maxLimit && (
                    <View style={[styles.insufficientContainer, { backgroundColor: theme.cardMuted }]}>
                        <Ionicons name="alert-circle" size={18} color={theme.danger} />
                        <Text style={[styles.insufficientText, { color: theme.danger, textAlign: isRTL ? 'right' : 'left' }]}>
                            {t('insufficient_balance_warning', {
                                currency,
                                selectedAmount: selectedAmount.toFixed(2),
                                maxLimit: maxLimit.toFixed(2),
                            })}
                        </Text>
                    </View>
                )}

                {/* Redeem Button */}
                <ScalePressable
                    style={[
                        styles.redeemButton,
                        { backgroundColor: theme.actionSolid },
                        selectedAmount > maxLimit && styles.redeemButtonDisabled,
                    ]}
                    onPress={() => {
                        triggerSubtleHaptic();
                        setShowCheckout(true);
                    }}
                    disabled={selectedAmount > maxLimit}
                    pressedScale={0.975}
                >
                    <Ionicons name="flash" size={20} color={theme.onActionSolid} style={styles.redeemIcon} />
                    <PhonkText style={[styles.redeemButtonText, { color: theme.onActionSolid }]}>{t('redeem_button_text')}</PhonkText>
                </ScalePressable>
            </ScrollView>

            <GiftCardTermsDrawer
                visible={showTerms}
                onClose={() => setShowTerms(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoArabicText: {
        textAlign: 'center',
        writingDirection: 'rtl',
    },
    logoX: {
        fontSize: 24,
    },
    logoCard: {
        fontSize: 24,
    },
    logoXArabic: {
        fontFamily: 'TajawalBlack',
        fontSize: 28,
        lineHeight: 36,
        writingDirection: 'rtl',
    },
    logoCardArabic: {
        fontFamily: 'TajawalBlack',
        fontSize: 28,
        lineHeight: 36,
        writingDirection: 'rtl',
    },
    headerSpacer: {
        width: 40,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    mainCard: {
        borderRadius: 40,
        padding: 30,
        alignItems: 'center',
        marginTop: 40,
        position: 'relative',
    },
    inStoreBadge: {
        position: 'absolute',
        top: 30,
        left: 30,
        fontSize: 14,
        fontFamily: Typography.poppins.medium,
    },
    inStoreBadgeRTL: {
        left: undefined,
        right: 30,
        textAlign: 'right',
    },
    logoWrapper: {
        marginTop: -70, // Offset to make logo pop out
        padding: 10,
        borderRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    brandLogoContainer: {
        width: 100,
        height: 100,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    brandLogo: {
        width: '100%',
        height: '100%',
    },
    brandLogoPlaceholder: {
        fontSize: 40,
        fontFamily: Typography.poppins.semiBold,
    },
    brandName: {
        fontSize: 18,
        fontFamily: Typography.poppins.medium,
        marginTop: 16,
    },
    generateGiftCardWrapper: {
        alignItems: 'center',
        marginTop: 12,
    },
    generateText: {
        fontSize: 28,
        lineHeight: 32,
    },
    giftCardText: {
        fontSize: 28,
        lineHeight: 32,
    },
    selectedAmountContainer: {
        paddingHorizontal: 40,
        paddingVertical: 16,
        borderRadius: 30,
        marginTop: 30,
        width: '100%',
        alignItems: 'center',
    },
    selectedAmountText: {
        fontSize: 24,
    },
    selectionSection: {
        marginTop: 30,
    },
    amountOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
    },
    amountOptionsRTL: {
        flexDirection: 'row-reverse',
    },
    amountOption: {
        flex: 1,
        minWidth: 90,
        height: 56,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    amountOptionSelected: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    amountOptionText: {
        fontSize: 14,
    },
    redeemButton: {
        height: 60,
        borderRadius: 30,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
    },
    redeemButtonDisabled: {
        opacity: 0.4,
    },
    insufficientContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        padding: 12,
        marginTop: 16,
        gap: 8,
    },
    insufficientText: {
        flex: 1,
        fontSize: 13,
        fontFamily: Typography.poppins.medium,
    },
    redeemIcon: {
        marginRight: 10,
    },
    redeemButtonText: {
        fontSize: 18,
    },
    tcButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        paddingVertical: 10,
    },
    tcButtonRTL: {
        flexDirection: 'row-reverse',
    },
    tcButtonText: {
        fontSize: 13,
        fontFamily: Typography.poppins.medium,
        marginLeft: 6,
    },
    tcButtonTextRTL: {
        marginLeft: 0,
        marginRight: 6,
    },
});
