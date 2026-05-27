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
import { Colors } from '../../constants/Colors';
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
    const [selectedAmount, setSelectedAmount] = useState(amounts[0]);
    const [showCheckout, setShowCheckout] = useState(false);
    const [showTerms, setShowTerms] = useState(false);
    const { t } = useTranslation();
    const isRTL = I18nManager.isRTL;

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
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, isRTL && styles.headerRTL]}>
                <ScalePressable
                    style={styles.backButton}
                    onPress={() => {
                        triggerSubtleHaptic();
                        onBack();
                    }}
                    pressedScale={0.9}
                >
                    <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color="#000000" />
                </ScalePressable>
                <View style={styles.logoContainer}>
                    <PhonkText style={styles.logoX}>X</PhonkText>
                    <PhonkText style={styles.logoCard}>CARD</PhonkText>
                </View>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Main Card */}
                <View style={styles.mainCard}>
                    <Text
                        style={[
                            styles.inStoreBadge,
                            isRTL ? styles.inStoreBadgeRTL : undefined,
                        ]}
                    >
                        {t('in_store_badge')}
                    </Text>

                    <View style={styles.logoWrapper}>
                        <View style={[styles.brandLogoContainer, { backgroundColor: brand.backgroundColor || '#F0F0F0' }]}>
                            {brand.logo ? (
                                <Image source={{ uri: brand.logo }} style={styles.brandLogo} />
                            ) : (
                                <Text style={styles.brandLogoPlaceholder}>
                                    {brand.name.charAt(0)}
                                </Text>
                            )}
                        </View>
                    </View>

                    <Text style={styles.brandName}>{brand.name}</Text>

                    <View style={styles.generateGiftCardWrapper}>
                        <PhonkText style={styles.generateText}>{t('generate_text')}</PhonkText>
                        <PhonkText style={styles.giftCardText}>{t('gift_card_text')}</PhonkText>
                    </View>

                    <View style={styles.selectedAmountContainer}>
                        <PhonkText style={styles.selectedAmountText}>
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
                    <Ionicons name="information-circle-outline" size={18} color="#999999" />
                    <Text style={[styles.tcButtonText, isRTL && styles.tcButtonTextRTL]}>{t('view_tc')}</Text>
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
                                    selectedAmount === amount && styles.amountOptionTextSelected,
                                ]}>
                                    {amount.toFixed(2)}
                                </PhonkText>
                            </ScalePressable>
                        ))}
                    </View>
                </View>

                {/* Insufficient Balance Warning */}
                {selectedAmount > maxLimit && (
                    <View style={styles.insufficientContainer}>
                        <Ionicons name="alert-circle" size={18} color="#E53935" />
                        <Text style={[styles.insufficientText, { textAlign: isRTL ? 'right' : 'left' }]}>
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
                    style={[styles.redeemButton, selectedAmount > maxLimit && styles.redeemButtonDisabled]}
                    onPress={() => {
                        triggerSubtleHaptic();
                        setShowCheckout(true);
                    }}
                    disabled={selectedAmount > maxLimit}
                    pressedScale={0.975}
                >
                    <Ionicons name="flash" size={20} color="#FFFFFF" style={styles.redeemIcon} />
                    <PhonkText style={styles.redeemButtonText}>{t('redeem_button_text')}</PhonkText>
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
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerRTL: {
        flexDirection: 'row-reverse',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F5F5F5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoX: {
        fontSize: 24,
        color: Colors.brandGreen,
    },
    logoCard: {
        fontSize: 24,
        color: '#000000',
    },
    headerSpacer: {
        width: 40,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    mainCard: {
        backgroundColor: '#F8F9FA',
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
        color: '#999999',
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
        backgroundColor: '#FFFFFF',
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
        color: '#FFFFFF',
    },
    brandName: {
        fontSize: 18,
        fontFamily: Typography.poppins.medium,
        color: '#000000',
        marginTop: 16,
    },
    generateGiftCardWrapper: {
        alignItems: 'center',
        marginTop: 12,
    },
    generateText: {
        fontSize: 28,
        color: '#000000',
        lineHeight: 32,
    },
    giftCardText: {
        fontSize: 28,
        color: Colors.brandGreen,
        lineHeight: 32,
    },
    selectedAmountContainer: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 40,
        paddingVertical: 16,
        borderRadius: 30,
        marginTop: 30,
        width: '100%',
        alignItems: 'center',
    },
    selectedAmountText: {
        fontSize: 24,
        color: '#000000',
    },
    selectionSection: {
        marginTop: 30,
    },
    amountOptions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    amountOptionsRTL: {
        flexDirection: 'row-reverse',
    },
    amountOption: {
        flex: 1,
        height: 56,
        backgroundColor: '#F8F9FA',
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    amountOptionSelected: {
        backgroundColor: '#FFFFFF',
        borderColor: '#F0F0F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    amountOptionText: {
        fontSize: 14,
        color: '#666666',
    },
    amountOptionTextSelected: {
        color: '#000000',
    },
    redeemButton: {
        backgroundColor: Colors.brandGreen,
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
        backgroundColor: '#FFEBEE',
        borderRadius: 12,
        padding: 12,
        marginTop: 16,
        gap: 8,
    },
    insufficientText: {
        flex: 1,
        fontSize: 13,
        fontFamily: Typography.poppins.medium,
        color: '#E53935',
    },
    redeemIcon: {
        marginRight: 10,
    },
    redeemButtonText: {
        fontSize: 18,
        color: '#FFFFFF',
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
        color: '#999999',
        marginLeft: 6,
    },
    tcButtonTextRTL: {
        marginLeft: 0,
        marginRight: 6,
    },
});
