import Ionicons from '@expo/vector-icons/Ionicons';
import { getAuth } from '@react-native-firebase/auth';
import { doc, getDoc, getFirestore } from '@react-native-firebase/firestore';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { Image } from 'expo-image';
import { logger } from '../../utils/logger';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import PhonkText from '../../components/PhonkText';
import { Colors } from '../../constants/Colors';
import { Typography } from '../../constants/Typography';
import { triggerSubtleHaptic } from '../../utils/haptics';
import { normalizeDigits } from '../../utils/numbers';
import { showLocalNotification } from '../../utils/notifications';

interface RedemptionResult {
    discountAmount: number;
    savedAmount?: number;
    cashbackAmount: number;
    creatorName?: string;
    totalAmount: number;
    finalAmount: number;
}

// Types for better type safety
interface VendorData {
    profilePicture?: string;
    name?: string;
    nameAr?: string;
    xcard?: boolean;
    pin?: string;
    [key: string]: any;
}

interface OfferData {
    discountValue?: string | number;
    discountType?: string;
    vendorId?: string;
    titleEn?: string;
    titleAr?: string;
    [key: string]: any;
}

export default function RedeemScreen() {
    const { id, vendorId, offerIndex: offerIndexParam } = useLocalSearchParams<{ id: string; vendorId: string; offerIndex: string }>();
    const router = useRouter();
    const { t, i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';
    const [vendor, setVendor] = useState<VendorData | null>(null);
    const [offer, setOffer] = useState<OfferData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isRedeeming, setIsRedeeming] = useState(false);
    const [redemptionResult, setRedemptionResult] = useState<RedemptionResult | null>(null);

    // Step: 'creator' only shown for xcard vendors, otherwise start at 'pin'
    const [step, setStep] = useState<'creator' | 'pin'>('pin');
    const [creatorCode, setCreatorCode] = useState('');
    const [pin, setPin] = useState('');
    const [amount, setAmount] = useState('');

    const pinInputRef = useRef<TextInput>(null);
    const amountInputRef = useRef<TextInput>(null);

    useEffect(() => {
        let isMounted = true;

        const fetchData = async () => {
            const currentVendorId = vendorId || id;
            if (!currentVendorId) return;
            try {
                const db = getFirestore();

                // Fetch Vendor document (offers are now embedded)
                const vendorRef = doc(db, 'vendors', currentVendorId);
                const vendorSnap = await getDoc(vendorRef);
                if (vendorSnap.exists() && isMounted) {
                    const vendorData = vendorSnap.data() as VendorData;
                    setVendor(vendorData);

                    // Extract offer from vendor's offers array by index
                    const offerIdx = offerIndexParam != null ? parseInt(offerIndexParam, 10) : 0;
                    const vendorOffers = vendorData.offers || [];
                    if (vendorOffers[offerIdx]) {
                        setOffer(vendorOffers[offerIdx] as OfferData);
                    }

                    // If vendor has xcard enabled, start with creator code step
                    if (vendorData.xcard === true) {
                        setStep('creator');
                    }
                }
            } catch (error) {
                logger.error("Error fetching data:", error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchData();

        return () => {
            isMounted = false;
        };
    }, [id, vendorId, offerIndexParam]);

    // Discount calculation
    const totalAmount = parseFloat(normalizeDigits(amount)) || 0;
    const discountValue = Number(offer?.discountValue) || 0;
    const discountType = offer?.discountType || 'percentage';

    let discountAmount = 0;
    if (discountType === 'percentage') {
        discountAmount = totalAmount * (discountValue / 100);
    } else if (discountType === 'buy1get1') {
        discountAmount = 0; // No discount deducted — user pays full amount
    } else {
        discountAmount = Math.min(discountValue, totalAmount);
    }
    const finalAmount = Math.max(0, totalAmount - discountAmount);

    const canRedeem = pin.length === 4 && totalAmount > 0;

    const handleRedeem = async () => {
        if (!canRedeem) return;

        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) {
            Alert.alert(t('error'), t('login_required_message'));
            return;
        }

        setIsRedeeming(true);
        try {
            const functions = getFunctions(undefined, 'me-central1');
            const redeemOffer = httpsCallable(functions, 'redeemOffer');

            const result = await redeemOffer({
                offerIndex: offerIndexParam != null ? parseInt(offerIndexParam, 10) : 0,
                vendorId: vendorId || id,
                vendorName: (isArabic ? (vendor?.nameAr || vendor?.name) : vendor?.name) || '',
                totalAmount,
                pin: normalizeDigits(pin),
                creatorCode: creatorCode ? normalizeDigits(creatorCode).trim() : undefined,
            });

            const data = result.data as any;

            const currency = t('currency_qar');
            const savedAmount = (data.savedAmount ?? data.discountAmount ?? discountAmount).toFixed(2);
            let message = t('you_saved_success_message', { currency, amount: savedAmount });

            if (data.cashbackAmount > 0) {
                message += `\n${t('cashback_earned_success_message', { currency, amount: data.cashbackAmount.toFixed(2) })}`;
            }

            // Show local notification for the redemption
            await showLocalNotification(
                t('redemption_successful_title'),
                message,
                { type: 'redemption_success', transactionId: data.transactionId },
                'reelx_redemptions'
            );

            // Delay success screen so notification banner is visible
            setTimeout(() => {
                setIsRedeeming(false);
                setRedemptionResult({
                    discountAmount: data.discountAmount || discountAmount,
                    savedAmount: data.savedAmount ?? data.discountAmount ?? discountAmount,
                    cashbackAmount: data.cashbackAmount || 0,
                    creatorName: data.creatorName,
                    totalAmount,
                    finalAmount: data.finalAmount || finalAmount,
                });
            }, 1500);
        } catch (error: any) {
            logger.error('Offer redemption error:', error);
            Alert.alert(
                t('redemption_failed_title'),
                error.message || t('redemption_failed_message')
            );
            setIsRedeeming(false);
        }
    };

    const handleAction = () => {
        triggerSubtleHaptic();
        if (step === 'creator') {
            const code = normalizeDigits(creatorCode).trim().toUpperCase();
            if (code && !/^[A-Z]{2}[0-9]{2}$/.test(code)) {
                Alert.alert(t('hold_on'), t('invalid_creator_code_format'));
                return;
            }
            setStep('pin');
            setTimeout(() => {
                pinInputRef.current?.focus();
            }, 300);
        } else {
            Keyboard.dismiss();

            const normalizedPin = normalizeDigits(pin);
            const normalizedAmount = normalizeDigits(amount);

            if (normalizedPin.length !== 4) {
                Alert.alert(t('hold_on'), t('enter_4_digit_pin'));
                return;
            }
            if (!normalizedAmount || isNaN(Number(normalizedAmount)) || Number(normalizedAmount) <= 0) {
                Alert.alert(t('hold_on'), t('enter_valid_amount'));
                return;
            }

            handleRedeem();
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.brandGreen} />
            </View>
        );
    }

    if (!vendor || !offer) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{t('redemption_info_not_found')}</Text>
                <TouchableOpacity
                    onPress={() => {
                        triggerSubtleHaptic();
                        router.back();
                    }}
                >
                    <Text style={styles.backLink}>{t('go_back')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Success Screen
    if (redemptionResult) {
        const savedStr = (redemptionResult.savedAmount ?? redemptionResult.discountAmount).toFixed(2);
        const earnedStr = redemptionResult.cashbackAmount.toFixed(2);
        const currency = t('currency_qar');

        return (
            <SafeAreaView style={styles.successContainer}>
                <StatusBar barStyle="light-content" />

                {/* Close Button */}
                <TouchableOpacity
                    style={styles.successCloseButton}
                    onPress={() => {
                        triggerSubtleHaptic();
                        router.replace('/');
                    }}
                >
                    <Ionicons name="close" size={22} color="#666" />
                </TouchableOpacity>

                {/* Watermark Background */}
                <View style={styles.watermarkOverlay} pointerEvents="none">
                    {Array.from({ length: 14 }).map((_, i) => (
                        <View key={i} style={[styles.watermarkRow, { marginTop: i % 2 === 0 ? 0 : -20 }]}>
                            <Text style={styles.watermarkText}>REDEMPTION SUCCESSFUL</Text>
                            <Text style={styles.watermarkText}>REDEMPTION SUCCESSFUL</Text>
                            <Text style={styles.watermarkText}>REDEMPTION SUCCESSFUL</Text>
                            <Text style={styles.watermarkText}>REDEMPTION SUCCESSFUL</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.successPillWrapper}>
                    {/* Top Pill — Vendor + Title */}
                    <View style={styles.successTopPillWrapper}>
                        <View style={styles.successTopPill}>
                            {/* Title */}
                            <Text style={styles.successTitle}>{t('redemption_title_line')}</Text>
                            <PhonkText style={styles.successTitleGreen}>{t('redemption_successful_exclaim')}</PhonkText>

                            {/* Discount Badge */}
                            <View style={styles.successBadge}>
                                <Text style={styles.successBadgeText}>
                                    {t('flat_off_prefix')}{offer.discountType === 'buy1get1' ? t('buy1get1_label') : `${offer.discountValue}${offer.discountType === 'percentage' ? '%' : ''}`}{t('flat_off_suffix')}
                                </Text>
                            </View>
                        </View>

                        {/* Vendor Logo — half in, half out */}
                        <View style={styles.successLogoOverlay}>
                            <Image
                                source={{ uri: vendor.profilePicture }}
                                style={styles.successLogoImage}
                                contentFit="contain"
                            />
                        </View>
                    </View>

                    {/* Bottom Pill — Breakdown */}
                    <View style={styles.successBottomPill}>
                        {/* You Saved */}
                        <View style={styles.successSavedRow}>
                            <Ionicons name="pricetag" size={18} color={Colors.brandGreen} />
                            <Text style={styles.successSavedLabel}>{t('you_saved_success_message', { currency, amount: savedStr }).replace('!', '')}</Text>
                        </View>

                        {/* Amount to Pay */}
                        <View style={styles.successPayRow}>
                            <Ionicons name="card" size={18} color="#000" />
                            <Text style={styles.successPayLabel}>
                                {t('amount_to_pay_label')}: {currency} {redemptionResult.finalAmount.toFixed(2)}
                            </Text>
                        </View>

                        {/* Cashback (only if > 0) */}
                        {redemptionResult.cashbackAmount > 0 && (
                            <View style={styles.successCashbackRow}>
                                <Ionicons name="wallet" size={18} color="#FF9800" />
                                <Text style={styles.successCashbackLabel}>
                                    {t('cashback_earned_success_message', { currency, amount: earnedStr })}
                                </Text>
                            </View>
                        )}

                        {/* Creator credit */}
                        {redemptionResult.creatorName && redemptionResult.cashbackAmount > 0 && (
                            <Text style={styles.successCreatorText}>
                                {t('thanks_to_creator', { creator: redemptionResult.creatorName })}
                            </Text>
                        )}
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <KeyboardAvoidingView
                style={styles.keyboardAware}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.innerContainer}>
                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={() => {
                                    triggerSubtleHaptic();
                                    if (step === 'pin' && vendor.xcard === true) {
                                        setStep('creator');
                                        Keyboard.dismiss();
                                    } else {
                                        router.back();
                                    }
                                }}
                            >
                                <Ionicons name={isArabic ? "arrow-forward" : "arrow-back"} size={24} color="#000" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={{ flex: 1 }}
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* Offer Card */}
                            <View style={styles.offerCardWrapper}>
                                <View style={styles.offerCard}>
                                    <PhonkText style={[styles.offerTitle, { writingDirection: isArabic ? 'rtl' : 'ltr' }]}>
                                        {t('flat_off_prefix')}<Text style={styles.greenText}>
                                            {offer.discountType === 'buy1get1' ? t('buy1get1_label') : `${offer.discountValue}${offer.discountType === 'percentage' ? '%' : ''}`}
                                        </Text>{t('flat_off_suffix')}
                                    </PhonkText>
                                </View>

                                {/* Logo Overlay */}
                                <View style={styles.logoContainer}>
                                    <Image
                                        source={{ uri: vendor.profilePicture }}
                                        style={styles.logoImage}
                                        contentFit="contain"
                                    />
                                </View>
                            </View>

                            {/* Creator Code Step (xcard vendors only) */}
                            {step === 'creator' && (
                                <View style={styles.creatorCard}>
                                    <Text style={[styles.inputLabel, { textAlign: isArabic ? 'right' : 'left' }]}>
                                        {t('have_creator_code')} <Text style={styles.optionalText}>{t('optional')}</Text>
                                    </Text>
                                    <View style={[styles.creatorInputContainer, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                        <TextInput
                                            style={[styles.creatorInput, { textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }]}
                                            value={creatorCode}
                                            onChangeText={(text) => setCreatorCode(normalizeDigits(text).toUpperCase())}
                                            placeholder={t('creator_code_placeholder')}
                                            placeholderTextColor="#CCC"
                                            autoCapitalize="characters"
                                            maxLength={4}
                                            returnKeyType="next"
                                            onSubmitEditing={handleAction}
                                            autoCorrect={false}
                                        />
                                    </View>
                                </View>
                            )}

                            {/* PIN + Amount Step */}
                            {step === 'pin' && (
                                <View style={styles.redemptionCard}>
                                    <Text style={[styles.inputLabel, { textAlign: isArabic ? 'right' : 'left' }]}>{t('enter_vendor_pin')}</Text>
                                    <View style={styles.pinContainer}>
                                        <TouchableOpacity
                                            activeOpacity={1}
                                            style={[styles.pinVisualContainer, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}
                                            onPress={() => {
                                                triggerSubtleHaptic();
                                                pinInputRef.current?.focus();
                                            }}
                                        >
                                            {[0, 1, 2, 3].map((index) => (
                                                <View key={index} style={[styles.pinBox, pin.length === index && styles.pinBoxActive]}>
                                                    <Text style={[styles.pinText, pin.length > index && { color: '#000', marginTop: 0 }]}>
                                                        {pin.length > index ? '●' : '*'}
                                                    </Text>
                                                </View>
                                            ))}
                                        </TouchableOpacity>

                                        <TextInput
                                            ref={pinInputRef}
                                            style={styles.hiddenPinInput}
                                            value={pin}
                                            onChangeText={(text) => {
                                                const normalized = normalizeDigits(text);
                                                const numericText = normalized.replace(/[^0-9]/g, '');
                                                if (numericText.length <= 4) {
                                                    setPin(numericText);
                                                }
                                                if (numericText.length === 4) {
                                                    amountInputRef.current?.focus();
                                                }
                                            }}
                                            keyboardType="number-pad"
                                            maxLength={4}
                                            returnKeyType="done"
                                            onSubmitEditing={() => amountInputRef.current?.focus()}
                                        />
                                    </View>

                                    <Text style={[styles.inputLabel, { textAlign: isArabic ? 'right' : 'left' }]}>{t('total_bill')}:</Text>
                                    <View style={[styles.amountInputContainer, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                        <Text style={[styles.currencyPrefix, { writingDirection: isArabic ? 'rtl' : 'ltr' }]}>{t('currency_qar')}</Text>
                                        <TextInput
                                            ref={amountInputRef}
                                            style={[styles.amountInput, { textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }]}
                                            value={amount}
                                            onChangeText={(text) => {
                                                const normalized = normalizeDigits(text);
                                                // Allow only digits and one decimal point
                                                const filtered = normalized.replace(/[^0-9.]/g, '');
                                                // Ensure only one dot
                                                const parts = filtered.split('.');
                                                const integerPart = parts[0].slice(0, 4);
                                                const decimalPart = parts.length > 1 ? `.${parts.slice(1).join('')}` : '';
                                                const final = integerPart + decimalPart;
                                                setAmount(final);
                                            }}
                                            keyboardType="decimal-pad"
                                            placeholder="0"
                                            placeholderTextColor="#CCC"
                                            returnKeyType="done"
                                            onSubmitEditing={handleAction}
                                        />
                                    </View>

                                    {/* Breakdown */}
                                    {totalAmount > 0 && (
                                        <View style={styles.breakdownContainer}>
                                            <View style={[styles.breakdownRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                                <Text style={[styles.breakdownLabel, { textAlign: isArabic ? 'right' : 'left' }]}>{t('total_bill')}</Text>
                                                <Text style={[styles.breakdownValue, { writingDirection: isArabic ? 'rtl' : 'ltr' }]}>
                                                    {t('amount_with_currency', { amount: totalAmount.toFixed(2), currency: t('currency_qar') })}
                                                </Text>
                                            </View>
                                            {offer.discountType !== 'buy1get1' && (
                                            <View style={[styles.breakdownRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                                <Text style={[styles.breakdownLabelGreen, { textAlign: isArabic ? 'right' : 'left' }]}>
                                                    {t('home_title')} ({offer.discountType === 'buy1get1' ? t('buy1get1_label') : `${offer.discountValue}${offer.discountType === 'percentage' ? '%' : ''}`})
                                                </Text>
                                                <Text style={[styles.breakdownValueGreen, { writingDirection: isArabic ? 'rtl' : 'ltr' }]}>
                                                    {t('amount_with_currency_negative', { amount: discountAmount.toFixed(2), currency: t('currency_qar') })}
                                                </Text>
                                            </View>
                                            )}
                                            <View style={styles.breakdownDivider} />
                                            <View style={[styles.breakdownRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                                <Text style={[styles.breakdownLabelBold, { textAlign: isArabic ? 'right' : 'left' }]}>{t('amount_to_pay_label')}</Text>
                                                <PhonkText style={[styles.breakdownValueBold, { writingDirection: isArabic ? 'rtl' : 'ltr' }]}>
                                                    {t('amount_with_currency', { amount: finalAmount.toFixed(2), currency: t('currency_qar') })}
                                                </PhonkText>
                                            </View>
                                            {vendor.xcard === true && (
                                                <View style={[styles.breakdownRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                                    <Text style={[styles.cashbackLabel, { textAlign: isArabic ? 'right' : 'left' }]}>
                                                        {t('cashback_label_formatted', { percentage: 1 })}
                                                    </Text>
                                                    <Text style={[styles.cashbackValue, { writingDirection: isArabic ? 'rtl' : 'ltr' }]}>
                                                        {t('amount_with_currency_positive', { amount: (finalAmount * 0.01).toFixed(2), currency: t('currency_qar') })}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    )}
                                </View>
                            )}



                            {/* Action Button */}
                            <TouchableOpacity
                                style={[
                                    styles.redeemButton,
                                    { flexDirection: isArabic ? 'row-reverse' : 'row' },
                                    step === 'pin' && !canRedeem && styles.redeemButtonDisabled,
                                ]}
                                activeOpacity={0.9}
                                onPress={handleAction}
                                disabled={(step === 'pin' && !canRedeem) || isRedeeming}
                            >
                                {isRedeeming ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <>
                                        <Ionicons name="flash" size={20} color="#FFF" />
                                        <PhonkText style={styles.redeemButtonText}>
                                            {step === 'creator' ? t('continue_caps') : t('redeem_caps')}
                                        </PhonkText>
                                    </>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    keyboardAware: {
        flex: 1,
    },
    innerContainer: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#666',
        fontFamily: Typography.poppins.medium,
        marginBottom: 10,
    },
    backLink: {
        color: Colors.brandGreen,
        fontFamily: Typography.poppins.semiBold,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 40,
    },
    offerCardWrapper: {
        position: 'relative',
        width: '100%',
        marginTop: 50,
    },
    offerCard: {
        backgroundColor: '#F7F7F7',
        borderRadius: 35,
        paddingTop: 70,
        paddingBottom: 40,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoContainer: {
        position: 'absolute',
        top: -50,
        alignSelf: 'center',
        width: 100,
        height: 100,
        borderRadius: 25,
        backgroundColor: '#1E2a38',
        borderWidth: 4,
        borderColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 6,
    },
    logoImage: {
        width: '60%',
        height: '60%',
    },
    offerTitle: {
        fontSize: 32,
        color: '#000',
        textAlign: 'center',
    },
    greenText: {
        color: Colors.brandGreen,
    },
    redemptionCard: {
        backgroundColor: '#F7F7F7',
        borderRadius: 35,
        padding: 24,
    },
    inputLabel: {
        fontSize: 16,
        color: '#444',
        fontFamily: Typography.poppins.semiBold,
        marginBottom: 12,
    },
    pinContainer: {
        marginBottom: 24,
        position: 'relative',
    },
    pinVisualContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    pinBox: {
        width: 65,
        height: 65,
        backgroundColor: '#FFF',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    pinBoxActive: {
        borderColor: Colors.brandGreen,
    },
    pinText: {
        fontSize: 30,
        color: '#E0E0E0',
        fontFamily: Typography.poppins.medium,
        marginTop: 10,
    },
    hiddenPinInput: {
        position: 'absolute',
        opacity: 0,
        height: '100%',
        width: '100%',
        zIndex: -1,
    },
    amountInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 25,
        height: 55,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    currencyPrefix: {
        fontSize: 16,
        color: '#AAA',
        fontFamily: Typography.poppins.semiBold,
        marginRight: 10,
    },
    amountInput: {
        flex: 1,
        fontSize: 18,
        color: '#000',
        fontFamily: Typography.poppins.semiBold,
    },
    breakdownContainer: {
        marginTop: 20,
        backgroundColor: '#FFFFFF',
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
        color: '#666',
        fontFamily: Typography.poppins.medium,
    },
    breakdownValue: {
        fontSize: 14,
        color: '#666',
        fontFamily: Typography.poppins.semiBold,
    },
    breakdownLabelGreen: {
        fontSize: 14,
        color: Colors.brandGreen,
        fontFamily: Typography.poppins.medium,
    },
    breakdownValueGreen: {
        fontSize: 14,
        color: Colors.brandGreen,
        fontFamily: Typography.poppins.semiBold,
    },
    breakdownDivider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginVertical: 4,
    },
    breakdownLabelBold: {
        fontSize: 16,
        color: '#000',
        fontFamily: Typography.poppins.semiBold,
    },
    breakdownValueBold: {
        fontSize: 16,
        color: '#000',
    },
    cashbackLabel: {
        fontSize: 13,
        color: '#FF9800',
        fontFamily: Typography.poppins.medium,
    },
    cashbackValue: {
        fontSize: 13,
        color: '#FF9800',
        fontFamily: Typography.poppins.semiBold,
    },
    redeemButton: {
        backgroundColor: Colors.brandGreen,
        borderRadius: 35,
        height: 65,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        margin: 12,
        shadowColor: Colors.brandGreen,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    redeemButtonDisabled: {
        opacity: 0.5,
    },
    redeemButtonText: {
        color: '#FFF',
        fontSize: 22,
        letterSpacing: 1,
    },
    creatorCard: {
        backgroundColor: '#F7F7F7',
        borderRadius: 35,
        padding: 24,
    },
    creatorInputContainer: {
        backgroundColor: '#FFF',
        borderRadius: 25,
        height: 55,
        paddingHorizontal: 20,
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    creatorInput: {
        fontSize: 18,
        color: '#000',
        fontFamily: Typography.poppins.semiBold,
    },
    optionalText: {
        color: '#888',
        fontFamily: Typography.poppins.medium,
        fontSize: 14,
    },
    // Success Screen Styles
    successContainer: {
        flex: 1,
        backgroundColor: Colors.brandGreen,
    },
    successCloseButton: {
        position: 'absolute',
        top: 80,
        right: 24,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    successPillWrapper: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 30,
        gap: 16,
        zIndex: 1,
    },
    successTopPillWrapper: {
        position: 'relative',
        marginTop: 40,
    },
    successTopPill: {
        backgroundColor: '#FFFFFF',
        borderRadius: 30,
        paddingTop: 50,
        paddingBottom: 24,
        paddingHorizontal: 24,
        alignItems: 'center',
    },
    successBottomPill: {
        backgroundColor: '#FFFFFF',
        borderRadius: 30,
        paddingVertical: 24,
        paddingHorizontal: 24,
    },
    successLogoOverlay: {
        position: 'absolute',
        top: -40,
        alignSelf: 'center',
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: '#1E2a38',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
    },
    successLogoImage: {
        width: '60%',
        height: '60%',
    },
    successTitle: {
        fontSize: 26,
        color: '#000',
        fontFamily: Typography.poppins.semiBold,
        textAlign: 'center',
    },
    successTitleGreen: {
        fontSize: 26,
        color: Colors.brandGreen,
        textAlign: 'center',
        marginBottom: 16,
    },
    successBadge: {
        backgroundColor: Colors.brandGreen,
        borderRadius: 30,
        paddingVertical: 10,
        paddingHorizontal: 24,
    },
    successBadgeText: {
        color: '#FFF',
        fontSize: 16,
        fontFamily: Typography.poppins.semiBold,
    },
    successSavedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 10,
    },
    successSavedLabel: {
        fontSize: 15,
        color: Colors.brandGreen,
        fontFamily: Typography.poppins.semiBold,
    },
    successPayRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: '#E8E8E8',
    },
    successPayLabel: {
        fontSize: 15,
        color: '#000',
        fontFamily: Typography.poppins.semiBold,
    },
    successCashbackRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: '#E8E8E8',
    },
    successCashbackLabel: {
        fontSize: 15,
        color: '#FF9800',
        fontFamily: Typography.poppins.semiBold,
    },
    successCreatorText: {
        fontSize: 13,
        color: '#999',
        fontFamily: Typography.poppins.medium,
        textAlign: 'center',
        marginTop: 8,
    },
    watermarkOverlay: {
        position: 'absolute',
        top: 0,
        left: -80,
        right: -80,
        bottom: 0,
        justifyContent: 'space-around',
        overflow: 'hidden',
        zIndex: 0,
    },
    watermarkRow: {
        flexDirection: 'row',
        transform: [{ rotate: '-25deg' }],
    },
    watermarkText: {
        color: 'rgba(255,255,255,0.07)',
        fontSize: 13,
        fontFamily: Typography.poppins.semiBold,
        letterSpacing: 2,
        marginHorizontal: 15,
    },
});
