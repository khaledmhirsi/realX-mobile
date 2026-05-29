import { Ionicons } from '@expo/vector-icons';
import { getAuth } from '@react-native-firebase/auth';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { Image } from 'expo-image';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    I18nManager,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAppTheme } from '../../context/AppThemeContext';
import { logger } from '../../utils/logger';
import { Typography } from '../../constants/Typography';
import PhonkText from '../PhonkText';
import RewardSuccessScreen from '../rewards/RewardSuccessScreen';
import TransactionLoadingOverlay from '../TransactionLoadingOverlay';
import { triggerSubtleHaptic } from '../../utils/haptics';
import { showLocalNotification } from '../../utils/notifications';
import { useTranslation } from 'react-i18next';

type Brand = {
    id: string;
    name: string;
    logo: string | null;
    backgroundColor?: string;
};

type GiftCardCheckoutProps = {
    brand: Brand;
    selectedAmount: number;
    currency: string;
    onBack: () => void;
    onSuccess?: () => void;
};

export default function GiftCardCheckout({
    brand,
    selectedAmount,
    currency,
    onBack,
    onSuccess,
}: GiftCardCheckoutProps) {
    const [pin, setPin] = useState('');
    const [totalBill, setTotalBill] = useState('');
    const [isRedeeming, setIsRedeeming] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const pinInputRef = useRef<TextInput>(null);
    const { theme } = useAppTheme();

    const totalBillNum = parseFloat(totalBill) || 0;
    const remainingAmount = Math.max(0, totalBillNum - selectedAmount);

    const canRedeem = pin.length === 4 && totalBillNum > 0;
    const { t } = useTranslation();
    const isRTL = I18nManager.isRTL;

    const handleRedeem = async () => {
        if (!canRedeem) return;
        triggerSubtleHaptic();

        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) {
            Alert.alert(t('error'), t('login_required_message'));
            return;
        }

        setIsRedeeming(true);
        try {
            const functions = getFunctions(undefined, 'me-central1');
            const redeemGiftCard = httpsCallable(functions, 'redeemGiftCard');

            await redeemGiftCard({
                vendorId: brand.id,
                vendorName: brand.name,
                giftCardAmount: selectedAmount,
                totalAmount: totalBillNum,
                pin,
            });

            const savedAmount = Math.min(selectedAmount, totalBillNum).toFixed(2);

            const successMessage = t('you_saved_success_message', {
                currency,
                amount: savedAmount,
            });

            // Show local notification for the gift card redemption
            await showLocalNotification(
                t('redemption_success_title'),
                successMessage,
                { type: 'giftcard_redemption' },
                'reelx_redemptions'
            );

            // Delay success screen so notification banner is visible
            setTimeout(() => {
                setIsRedeeming(false);
                setShowSuccess(true);
            }, 1500);
        } catch (error: any) {
            logger.error('Gift card redemption error:', error);
            Alert.alert(
                t('redemption_failed_title'),
                error.message || t('redemption_failed_message')
            );
            setIsRedeeming(false);
        }
    };

    // Success Screen
    if (showSuccess) {
        return (
            <RewardSuccessScreen
                mascotSource={require('../../assets/images/realx-mascot-run-gift-both-hands.png')}
                badgeText={t('gift_card_text')}
                merchantLabel={t('reward_success_merchant_label')}
                merchantName={brand.name}
                rows={[
                    {
                        icon: 'gift-outline',
                        iconBorderColor: '#D1F4DA',
                        label: t('reward_success_gift_card_value_label'),
                        value: `${currency} ${selectedAmount.toFixed(2)}`,
                        tone: 'savings',
                    },
                    {
                        icon: 'card-outline',
                        iconBorderColor: '#DCE4EC',
                        label: t('amount_to_pay_label'),
                        value: `${currency} ${remainingAmount.toFixed(2)}`,
                    },
                ]}
                metaLines={[
                    t('reward_success_ready_in_store'),
                ]}
                primaryActionLabel={t('done')}
                onPrimaryAction={() => onSuccess?.()}
                onClose={() => onSuccess?.()}
                isRTL={isRTL}
            />
        );
    }

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: theme.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Header */}
            <View style={[styles.header, isRTL && styles.headerRTL]}>
                <TouchableOpacity
                    style={[styles.backButton, { backgroundColor: theme.cardMuted }]}
                    onPress={() => {
                        triggerSubtleHaptic();
                        onBack();
                    }}
                    activeOpacity={0.7}
                >
                    <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={theme.icon} />
                </TouchableOpacity>
                <View style={styles.logoContainer}>
                    <PhonkText style={[styles.logoX, { color: theme.brand }]}>X</PhonkText>
                    <PhonkText style={[styles.logoCard, { color: theme.text }]}>CARD</PhonkText>
                </View>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Gift Card Display Card */}
                <View style={styles.offerCardWrapper}>
                    <View style={[styles.offerCard, { backgroundColor: theme.cardMuted }]}>
                        <PhonkText style={[styles.offerTitle, { color: theme.text }]}>
                            {selectedAmount.toFixed(2)}
                            <Text style={[styles.greenText, { color: theme.brand }]}>{currency}</Text>
                        </PhonkText>
                        <PhonkText style={[styles.offerSubtitleLabel, { color: theme.brand }]}>{t('gift_card_text')}</PhonkText>
                        <Text style={[styles.offerSubtitle, { color: theme.mutedText }]}>{t('in_store_badge')}</Text>
                    </View>

                    {/* Logo Overlay */}
                    <View style={[styles.brandLogoOverlay, { backgroundColor: theme.logoTile, borderColor: theme.logoTile, shadowColor: theme.shadow }]}>
                        <View style={[styles.brandLogoInner, { backgroundColor: brand.backgroundColor || '#1E2A38' }]}>
                            {brand.logo ? (
                                <Image source={{ uri: brand.logo }} style={styles.brandLogoImage} contentFit="contain" />
                            ) : (
                                <Text style={[styles.brandLogoPlaceholder, { color: theme.logoTileText }]}>
                                    {brand.name.charAt(0)}
                                </Text>
                            )}
                        </View>
                    </View>
                </View>

                {/* Redemption Card */}
                <View style={[styles.redemptionCard, { backgroundColor: theme.cardMuted }]}>
                    {/* PIN Entry */}
                    <Text style={[styles.inputLabel, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>
                        {t('enter_vendor_pin')}
                    </Text>
                    <TouchableOpacity
                        activeOpacity={1}
                        style={[styles.pinContainer, isRTL && styles.pinContainerRTL]}
                        onPress={() => {
                            triggerSubtleHaptic();
                            pinInputRef.current?.focus();
                        }}
                    >
                        {[0, 1, 2, 3].map((index) => (
                            <View key={index} style={[styles.pinBox, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
                                <Text style={[styles.pinText, { color: theme.subtleText }, pin.length > index && { color: theme.text, marginTop: 0 }]}>
                                    {pin.length > index ? '●' : '*'}
                                </Text>
                            </View>
                        ))}
                    </TouchableOpacity>

                    <TextInput
                        ref={pinInputRef}
                        style={{ position: 'absolute', opacity: 0, height: 0, width: 0 }}
                        value={pin}
                        onChangeText={(text) => {
                            if (text.length <= 4) setPin(text);
                        }}
                        keyboardType="numeric"
                    />

                    {/* Total Bill */}
                    <Text style={[styles.inputLabel, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>
                        {t('total_bill')}
                    </Text>
                    <View style={[styles.amountInputContainer, { backgroundColor: theme.card, shadowColor: theme.shadow }, isRTL && styles.amountInputContainerRTL]}>
                        <Text style={[styles.currencyPrefix, { color: theme.mutedText }, isRTL && styles.currencyPrefixRTL]}>
                            {currency}
                        </Text>
                        <TextInput
                            style={[styles.amountInput, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}
                            value={totalBill}
                            onChangeText={setTotalBill}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor={theme.inputPlaceholder}
                        />
                    </View>

                    {/* Breakdown */}
                    {totalBillNum > 0 && (
                        <View style={[styles.breakdownContainer, { backgroundColor: theme.card }]}>
                            <View style={styles.breakdownRow}>
                            <Text style={[styles.breakdownLabel, { color: theme.mutedText }]}>{t('total_bill')}</Text>
                                <Text style={[styles.breakdownValue, { color: theme.mutedText }]}>
                                    {currency} {totalBillNum.toFixed(2)}
                                </Text>
                            </View>
                            <View style={styles.breakdownRow}>
                            <Text style={[styles.breakdownLabelGreen, { color: theme.brandText }]}>{t('gift_card_redeemed_label')}</Text>
                                <Text style={[styles.breakdownValueGreen, { color: theme.brandText }]}>
                                    − {currency} {Math.min(selectedAmount, totalBillNum).toFixed(2)}
                                </Text>
                            </View>
                            <View style={[styles.breakdownDivider, { backgroundColor: theme.border }]} />
                            <View style={styles.breakdownRow}>
                                <Text style={[styles.breakdownLabelBold, { color: theme.text }]}>{t('amount_to_pay_label')}</Text>
                                <PhonkText style={[styles.breakdownValueBold, { color: theme.text }]}>
                                    {currency} {remainingAmount.toFixed(2)}
                                </PhonkText>
                            </View>
                        </View>
                    )}
                </View>

                {/* Spacer */}
                <View style={{ height: 20 }} />

                {/* Redeem Button */}
                <TouchableOpacity
                    style={[
                        styles.redeemButton,
                        { backgroundColor: theme.actionSolid, shadowColor: theme.actionSolid },
                        !canRedeem && styles.redeemButtonDisabled,
                    ]}
                    activeOpacity={0.9}
                    onPress={handleRedeem}
                    disabled={!canRedeem || isRedeeming}
                >
                    {isRedeeming ? (
                        <ActivityIndicator size="small" color={theme.onActionSolid} />
                    ) : (
                        <>
                            <Ionicons name="flash" size={20} color={theme.onActionSolid} />
                            <PhonkText style={[styles.redeemButtonText, { color: theme.onActionSolid }]}>{t('redeem_button_text')}</PhonkText>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>

            <TransactionLoadingOverlay visible={isRedeeming} />
        </KeyboardAvoidingView>
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
    headerRTL: {
        flexDirection: 'row-reverse',
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
    logoX: {
        fontSize: 24,
    },
    logoCard: {
        fontSize: 24,
    },
    headerSpacer: {
        width: 40,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    offerCardWrapper: {
        position: 'relative',
        width: '100%',
        marginTop: 50,
    },
    offerCard: {
        borderRadius: 35,
        paddingTop: 70,
        paddingBottom: 40,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    offerTitle: {
        fontSize: 32,
        color: '#00',
        textAlign: 'center',
    },
    greenText: {
    },
    offerSubtitleLabel: {
        fontSize: 28,
        marginTop: 2,
    },
    offerSubtitle: {
        fontSize: 16,
        fontFamily: Typography.poppins.medium,
        marginTop: 4,
    },
    brandLogoOverlay: {
        position: 'absolute',
        top: -50,
        alignSelf: 'center',
        width: 100,
        height: 100,
        borderRadius: 25,
        borderWidth: 4,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 6,
    },
    brandLogoInner: {
        width: '100%',
        height: '100%',
        borderRadius: 21,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    brandLogoImage: {
        width: '60%',
        height: '60%',
    },
    brandLogoPlaceholder: {
        fontSize: 40,
        fontFamily: Typography.poppins.semiBold,
    },
    redemptionCard: {
        borderRadius: 35,
        padding: 24,
        marginTop: 20,
    },
    inputLabel: {
        fontSize: 16,
        fontFamily: Typography.poppins.semiBold,
        marginBottom: 12,
    },
    pinContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    pinContainerRTL: {
        flexDirection: 'row-reverse',
    },
    pinBox: {
        width: 65,
        height: 65,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    pinText: {
        fontSize: 30,
        color: '#E0E0E0',
        fontFamily: Typography.poppins.medium,
        marginTop: 10,
    },
    amountInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 25,
        height: 55,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    amountInputContainerRTL: {
        flexDirection: 'row-reverse',
    },
    currencyPrefix: {
        fontSize: 16,
        fontFamily: Typography.poppins.semiBold,
        marginRight: 10,
    },
    currencyPrefixRTL: {
        marginLeft: 10,
        marginRight: 0,
    },
    amountInput: {
        flex: 1,
        fontSize: 18,
        fontFamily: Typography.poppins.semiBold,
    },
    breakdownContainer: {
        marginTop: 20,
        borderRadius: 20,
        padding: 20,
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    breakdownLabel: {
        fontSize: 14,
        fontFamily: Typography.poppins.medium,
    },
    breakdownValue: {
        fontSize: 14,
        fontFamily: Typography.poppins.semiBold,
    },
    breakdownLabelGreen: {
        fontSize: 14,
        fontFamily: Typography.poppins.medium,
    },
    breakdownValueGreen: {
        fontSize: 14,
        fontFamily: Typography.poppins.semiBold,
    },
    breakdownDivider: {
        height: 1,
        marginVertical: 4,
    },
    breakdownLabelBold: {
        fontSize: 16,
        fontFamily: Typography.poppins.semiBold,
    },
    breakdownValueBold: {
        fontSize: 18,
    },
    redeemButton: {
        borderRadius: 35,
        height: 65,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 10,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    redeemButtonDisabled: {
        opacity: 0.5,
    },
    redeemButtonText: {
        fontSize: 22,
        letterSpacing: 1,
    },
});
