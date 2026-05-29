import Ionicons from '@expo/vector-icons/Ionicons';
import { getAuth } from '@react-native-firebase/auth';
import { doc, getDoc, getFirestore } from '@react-native-firebase/firestore';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { logger } from '../../utils/logger';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Linking,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import PhonkText from '../../components/PhonkText';
import TransactionLoadingOverlay from '../../components/TransactionLoadingOverlay';
import { useAppTheme } from '../../context/AppThemeContext';
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
    vendorType?: 'in_store' | 'online';
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
    const { isDark, theme } = useAppTheme();
    const isArabic = i18n.language === 'ar';
    const [vendor, setVendor] = useState<VendorData | null>(null);
    const [offer, setOffer] = useState<OfferData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isRedeeming, setIsRedeeming] = useState(false);
    const [redemptionResult, setRedemptionResult] = useState<RedemptionResult | null>(null);
    const [onlinePreview, setOnlinePreview] = useState<{ discountCode: string; remainingToday: number; dailyLimitPerUser: number } | null>(null);
    const [onlineLoading, setOnlineLoading] = useState(false);
    const [onlineError, setOnlineError] = useState('');
    const [copied, setCopied] = useState(false);

    // Step: 'creator' only shown for xcard vendors, otherwise start at 'pin'
    const [step, setStep] = useState<'creator' | 'pin'>('pin');
    const [creatorCode, setCreatorCode] = useState('');
    const [pin, setPin] = useState('');
    const [amount, setAmount] = useState('');

    const pinInputRef = useRef<TextInput>(null);
    const amountInputRef = useRef<TextInput>(null);
    const scrollRef = useRef<ScrollView>(null);

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

                    if (vendorData.vendorType === 'online') {
                        const functions = getFunctions(undefined, 'me-central1');
                        const getOnlineRedemptionPreview = httpsCallable(functions, 'getOnlineRedemptionPreview');
                        try {
                            const previewResult = await getOnlineRedemptionPreview({ vendorId: currentVendorId });
                            setOnlinePreview(previewResult.data as any);
                            setOnlineError('');
                        } catch (error: any) {
                            logger.error('Online redemption preview error:', error);
                            setOnlineError(error.message || t('redemption_failed_message'));
                        }
                    } else {
                        // Extract offer from vendor's offers array by index
                        const offerIdx = offerIndexParam != null ? parseInt(offerIndexParam, 10) : 0;
                        const vendorOffers = vendorData.offers || [];
                        if (vendorOffers[offerIdx]) {
                            setOffer(vendorOffers[offerIdx] as OfferData);
                        }
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
    }, [id, vendorId, offerIndexParam, t]);

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

    const isOnlineVendor = vendor?.vendorType === 'online';

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

    const handleCopyOnlineCode = async () => {
        if (!onlinePreview?.discountCode) return;
        triggerSubtleHaptic();
        await Clipboard.setStringAsync(onlinePreview.discountCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
    };

    const handleOnlinePurchase = async () => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) {
            Alert.alert(t('error'), t('login_required_message'));
            return;
        }

        const currentVendorId = vendorId || id;
        if (!currentVendorId) return;

        setOnlineLoading(true);
        try {
            const functions = getFunctions(undefined, 'me-central1');
            const redeemOnlineVendor = httpsCallable(functions, 'redeemOnlineVendor');
            const result = await redeemOnlineVendor({
                vendorId: currentVendorId,
                vendorName: (isArabic ? (vendor?.nameAr || vendor?.name) : vendor?.name) || '',
            });

            const data = result.data as any;
            if (typeof data.remainingToday === 'number') {
                setOnlinePreview((previous) => previous ? { ...previous, remainingToday: data.remainingToday } : previous);
            }

            if (data.purchaseUrl) {
                await Linking.openURL(data.purchaseUrl);
            }
        } catch (error: any) {
            logger.error('Online redemption error:', error);
            Alert.alert(
                t('redemption_failed_title'),
                error.message || t('redemption_failed_message')
            );
        } finally {
            setOnlineLoading(false);
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
            <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.brand} />
            </View>
        );
    }

    if (!vendor || (!offer && !isOnlineVendor)) {
        return (
            <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
                <Text style={[styles.errorText, { color: theme.mutedText }]}>{t('redemption_info_not_found')}</Text>
                <TouchableOpacity
                    onPress={() => {
                        triggerSubtleHaptic();
                        router.back();
                    }}
                >
                    <Text style={[styles.backLink, { color: theme.brandText }]}>{t('go_back')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (isOnlineVendor) {
        const vendorName = isArabic ? (vendor.nameAr || vendor.name) : vendor.name;
        const remainingToday = onlinePreview?.remainingToday ?? 0;

        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
                <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
                <View style={styles.innerContainer}>
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={[styles.backButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}
                            onPress={() => {
                                triggerSubtleHaptic();
                                router.back();
                            }}
                        >
                            <Ionicons name={isArabic ? "arrow-forward" : "arrow-back"} size={24} color={theme.icon} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.offerCardWrapper}>
                            <View style={[styles.onlineCard, { backgroundColor: theme.cardMuted }]}>
                                <Ionicons name="globe-outline" size={30} color={theme.brand} />
                                <Text style={[styles.onlineKicker, { color: theme.brandText, textAlign: isArabic ? 'right' : 'left' }]}>
                                    {t('online_vendor_label')}
                                </Text>
                                <PhonkText style={[styles.onlineTitle, { color: theme.text, writingDirection: isArabic ? 'rtl' : 'ltr' }]}>
                                    {vendorName || t('unknown_vendor')}
                                </PhonkText>
                            </View>

                            <View style={[styles.logoContainer, { backgroundColor: theme.logoTile, borderColor: theme.logoTile, shadowColor: theme.shadow }]}>
                                <Image
                                    source={{ uri: vendor.profilePicture }}
                                    style={styles.logoImage}
                                    contentFit="cover"
                                />
                            </View>
                        </View>

                        <View style={[styles.onlineRedemptionCard, { backgroundColor: theme.card, borderColor: theme.border, shadowColor: theme.shadow }]}>
                            <Text style={[styles.inputLabel, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>
                                {t('online_discount_code_label')}
                            </Text>
                            <TouchableOpacity
                                style={[
                                    styles.onlineCodeBox,
                                    { backgroundColor: theme.brandSoft, borderColor: theme.brand, flexDirection: isArabic ? 'row-reverse' : 'row' },
                                ]}
                                activeOpacity={0.85}
                                onPress={handleCopyOnlineCode}
                                disabled={!onlinePreview?.discountCode}
                            >
                                <Text style={[styles.onlineCodeText, { color: theme.brandText }]}>
                                    {onlinePreview?.discountCode || '----'}
                                </Text>
                                <Ionicons name={copied ? 'checkmark-circle' : 'copy-outline'} size={24} color={theme.brand} />
                            </TouchableOpacity>

                            <Text style={[styles.onlineHint, { color: theme.mutedText, textAlign: isArabic ? 'right' : 'left' }]}>
                                {onlineError || (copied ? t('online_code_copied') : t('online_copy_hint'))}
                            </Text>

                            <View style={[styles.onlineLimitRow, { borderTopColor: theme.border, flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                <Ionicons name="calendar-outline" size={18} color={theme.iconMuted} />
                                <Text style={[styles.onlineLimitText, { color: theme.mutedText, textAlign: isArabic ? 'right' : 'left' }]}>
                                    {t('online_remaining_today', {
                                        count: remainingToday,
                                        limit: onlinePreview?.dailyLimitPerUser ?? 0,
                                    })}
                                </Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.redeemButton,
                                { backgroundColor: theme.actionSolid, shadowColor: theme.actionSolid },
                                { flexDirection: isArabic ? 'row-reverse' : 'row' },
                                (!onlinePreview?.discountCode || remainingToday <= 0) && styles.redeemButtonDisabled,
                            ]}
                            activeOpacity={0.9}
                            onPress={handleOnlinePurchase}
                            disabled={!onlinePreview?.discountCode || remainingToday <= 0 || onlineLoading}
                        >
                            {onlineLoading ? (
                                <ActivityIndicator size="small" color={theme.onActionSolid} />
                            ) : (
                                <>
                                    <Ionicons name="cart" size={20} color={theme.onActionSolid} />
                                    <PhonkText style={[styles.redeemButtonText, { color: theme.onActionSolid }]}>
                                        {t('online_purchase_caps')}
                                    </PhonkText>
                                </>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </View>

                <TransactionLoadingOverlay visible={onlineLoading} />
            </SafeAreaView>
        );
    }

    const inStoreOffer = offer;
    if (!inStoreOffer) {
        return null;
    }

    // Success Screen
    if (redemptionResult) {
        const savedStr = (redemptionResult.savedAmount ?? redemptionResult.discountAmount).toFixed(2);
        const earnedStr = redemptionResult.cashbackAmount.toFixed(2);
        const currency = t('currency_qar');

        return (
            <SafeAreaView style={[styles.successContainer, { backgroundColor: theme.brand }]}>
                <StatusBar barStyle="light-content" />

                {/* Close Button */}
                <TouchableOpacity
                    style={[styles.successCloseButton, { backgroundColor: theme.logoTile }]}
                    onPress={() => {
                        triggerSubtleHaptic();
                        router.replace('/');
                    }}
                >
                    <Ionicons name="close" size={22} color={theme.logoTileText} />
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
                        <View style={[styles.successTopPill, { backgroundColor: theme.logoTile }]}>
                            {/* Title */}
                            <Text style={[styles.successTitle, { color: theme.logoTileText }]}>{t('redemption_title_line')}</Text>
                            <PhonkText style={[styles.successTitleGreen, { color: theme.brand }]}>{t('redemption_successful_exclaim')}</PhonkText>

                            {/* Discount Badge */}
                            <View style={[styles.successBadge, { backgroundColor: theme.brand }]}>
                                <Text style={[styles.successBadgeText, { color: theme.onActionSolid }]}>
                                    {t('flat_off_prefix')}{inStoreOffer.discountType === 'buy1get1' ? t('buy1get1_label') : `${inStoreOffer.discountValue}${inStoreOffer.discountType === 'percentage' ? '%' : ''}`}{t('flat_off_suffix')}
                                </Text>
                            </View>
                        </View>

                        {/* Vendor Logo — half in, half out */}
                                <View style={[styles.successLogoOverlay, { backgroundColor: theme.logoTile }]}>
                                    <Image
                                        source={{ uri: vendor.profilePicture }}
                                        style={styles.successLogoImage}
                                        contentFit="cover"
                                    />
                                </View>
                    </View>

                    {/* Bottom Pill — Breakdown */}
                    <View style={[styles.successBottomPill, { backgroundColor: theme.logoTile }]}>
                        {/* You Saved */}
                        <View
                            style={[
                                styles.successSavedRow,
                                {
                                    flexDirection: isArabic ? 'row-reverse' : 'row',
                                    justifyContent: isArabic ? 'flex-end' : 'flex-start',
                                },
                            ]}
                        >
                            <Ionicons name="pricetag" size={18} color={theme.brand} />
                            <Text
                                style={[
                                    styles.successSavedLabel,
                                    {
                                        color: theme.brandText,
                                        textAlign: isArabic ? 'right' : 'left',
                                    },
                                ]}
                            >
                                {t('you_saved_success_message', { currency, amount: savedStr }).replace('!', '')}
                            </Text>
                        </View>

                        {/* Amount to Pay */}
                        <View
                            style={[
                                styles.successPayRow,
                                {
                                    flexDirection: isArabic ? 'row-reverse' : 'row',
                                    justifyContent: isArabic ? 'flex-end' : 'flex-start',
                                },
                            ]}
                        >
                            <Ionicons name="card" size={18} color={theme.logoTileText} />
                            <Text
                                style={[
                                    styles.successPayLabel,
                                    {
                                        color: theme.logoTileText,
                                        textAlign: isArabic ? 'right' : 'left',
                                    },
                                ]}
                            >
                                {t('amount_to_pay_label')}: {currency} {redemptionResult.finalAmount.toFixed(2)}
                            </Text>
                        </View>

                        {/* Cashback (only if > 0) */}
                        {redemptionResult.cashbackAmount > 0 && (
                            <View
                                style={[
                                    styles.successCashbackRow,
                                    {
                                        borderTopColor: theme.logoTileBorder,
                                        flexDirection: isArabic ? 'row-reverse' : 'row',
                                        justifyContent: isArabic ? 'flex-end' : 'flex-start',
                                    },
                                ]}
                            >
                                <Ionicons name="wallet" size={18} color="#FF9800" />
                                <Text
                                    style={[
                                        styles.successCashbackLabel,
                                        {
                                            textAlign: isArabic ? 'right' : 'left',
                                        },
                                    ]}
                                >
                                    {t('cashback_earned_success_message', { currency, amount: earnedStr })}
                                </Text>
                            </View>
                        )}

                        {/* Creator credit */}
                        {redemptionResult.creatorName && redemptionResult.cashbackAmount > 0 && (
                            <Text style={[styles.successCreatorText, { color: theme.subtleText }]}>
                                {t('thanks_to_creator', { creator: redemptionResult.creatorName })}
                            </Text>
                        )}
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <KeyboardAvoidingView
                style={styles.keyboardAware}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={styles.innerContainer}>
                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity
                                style={[styles.backButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}
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
                                <Ionicons name={isArabic ? "arrow-forward" : "arrow-back"} size={24} color={theme.icon} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            ref={scrollRef}
                            style={{ flex: 1 }}
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode="on-drag"
                        >
                            {/* Offer Card */}
                            <View style={styles.offerCardWrapper}>
                                <View style={[styles.offerCard, { backgroundColor: theme.cardMuted }]}>
                                    <PhonkText style={[styles.offerTitle, { color: theme.text, writingDirection: isArabic ? 'rtl' : 'ltr' }]}>
                                        {t('flat_off_prefix')}<Text style={[styles.greenText, { color: theme.brand }]}>
                                            {inStoreOffer.discountType === 'buy1get1' ? t('buy1get1_label') : `${inStoreOffer.discountValue}${inStoreOffer.discountType === 'percentage' ? '%' : ''}`}
                                        </Text>{t('flat_off_suffix')}
                                    </PhonkText>
                                </View>

                                {/* Logo Overlay */}
                                <View style={[styles.logoContainer, { backgroundColor: theme.logoTile, borderColor: theme.logoTile, shadowColor: theme.shadow }]}>
                                    <Image
                                        source={{ uri: vendor.profilePicture }}
                                        style={styles.logoImage}
                                        contentFit="cover"
                                    />
                                </View>
                            </View>

                            {/* Creator Code Step (xcard vendors only) */}
                            {step === 'creator' && (
                                <View style={[styles.creatorCard, { backgroundColor: theme.cardMuted }]}>
                                    <Text style={[styles.inputLabel, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>
                                        {t('have_creator_code')} <Text style={[styles.optionalText, { color: theme.subtleText }]}>{t('optional')}</Text>
                                    </Text>
                                    <View style={[styles.creatorInputContainer, { backgroundColor: theme.card, shadowColor: theme.shadow, flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                        <TextInput
                                            style={[styles.creatorInput, { color: theme.text, textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }]}
                                            value={creatorCode}
                                            onChangeText={(text) => setCreatorCode(normalizeDigits(text).toUpperCase())}
                                            placeholder={t('creator_code_placeholder')}
                                            placeholderTextColor={theme.inputPlaceholder}
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
                                <View style={[styles.redemptionCard, { backgroundColor: theme.cardMuted }]}>
                                    <Text style={[styles.inputLabel, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>{t('enter_vendor_pin')}</Text>
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
                                                <View
                                                    key={index}
                                                    style={[
                                                        styles.pinBox,
                                                        { backgroundColor: theme.card, shadowColor: theme.shadow },
                                                        pin.length === index && { borderColor: theme.brand },
                                                    ]}
                                                >
                                                    <Text style={[styles.pinText, { color: theme.subtleText }, pin.length > index && { color: theme.text, marginTop: 0 }]}>
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
                                            onSubmitEditing={() => amountInputRef.current?.focus()}
                                        />
                                    </View>

                                    <Text style={[styles.inputLabel, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>{t('total_bill')}:</Text>
                                    <View style={[styles.amountInputContainer, { backgroundColor: theme.card, shadowColor: theme.shadow, flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                        <Text style={[styles.currencyPrefix, { color: theme.mutedText, writingDirection: isArabic ? 'rtl' : 'ltr' }]}>{t('currency_qar')}</Text>
                                        <TextInput
                                            ref={amountInputRef}
                                            style={[styles.amountInput, { color: theme.text, textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }]}
                                            value={amount}
                                            onFocus={() => {
                                                setTimeout(() => {
                                                    scrollRef.current?.scrollToEnd({ animated: true });
                                                }, 150);
                                            }}
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
                                            placeholderTextColor={theme.inputPlaceholder}
                                            onSubmitEditing={handleAction}
                                        />
                                    </View>

                                    {/* Breakdown */}
                                    {totalAmount > 0 && (
                                        <View style={[styles.breakdownContainer, { backgroundColor: theme.card }]}>
                                            <View style={[styles.breakdownRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                                <Text style={[styles.breakdownLabel, { color: theme.mutedText, textAlign: isArabic ? 'right' : 'left' }]}>{t('total_bill')}</Text>
                                                <Text style={[styles.breakdownValue, { color: theme.mutedText, writingDirection: isArabic ? 'rtl' : 'ltr' }]}>
                                                    {t('amount_with_currency', { amount: totalAmount.toFixed(2), currency: t('currency_qar') })}
                                                </Text>
                                            </View>
                                            {inStoreOffer.discountType !== 'buy1get1' && (
                                            <View style={[styles.breakdownRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                                <Text style={[styles.breakdownLabelGreen, { color: theme.brandText, textAlign: isArabic ? 'right' : 'left' }]}>
                                                    {t('home_title')} ({inStoreOffer.discountType === 'buy1get1' ? t('buy1get1_label') : `${inStoreOffer.discountValue}${inStoreOffer.discountType === 'percentage' ? '%' : ''}`})
                                                </Text>
                                                <Text style={[styles.breakdownValueGreen, { color: theme.brandText, writingDirection: isArabic ? 'rtl' : 'ltr' }]}>
                                                    {t('amount_with_currency_negative', { amount: discountAmount.toFixed(2), currency: t('currency_qar') })}
                                                </Text>
                                            </View>
                                            )}
                                            <View style={[styles.breakdownDivider, { backgroundColor: theme.border }]} />
                                            <View style={[styles.breakdownRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                                <Text style={[styles.breakdownLabelBold, { color: theme.text, textAlign: isArabic ? 'right' : 'left' }]}>{t('amount_to_pay_label')}</Text>
                                                <PhonkText style={[styles.breakdownValueBold, { color: theme.text, writingDirection: isArabic ? 'rtl' : 'ltr' }]}>
                                                    {t('amount_with_currency', { amount: finalAmount.toFixed(2), currency: t('currency_qar') })}
                                                </PhonkText>
                                            </View>
                                            {vendor.xcard === true && (
                                                <View style={[styles.breakdownRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                                    <Text style={[styles.cashbackLabel, { textAlign: isArabic ? 'right' : 'left' }]}>
                                                        {`${t('xcard_cashback_label')} (${1}%)`}
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
                                    { backgroundColor: theme.actionSolid, shadowColor: theme.actionSolid },
                                    { flexDirection: isArabic ? 'row-reverse' : 'row' },
                                    step === 'pin' && !canRedeem && styles.redeemButtonDisabled,
                                ]}
                                activeOpacity={0.9}
                                onPress={handleAction}
                                disabled={(step === 'pin' && !canRedeem) || isRedeeming}
                            >
                                {isRedeeming ? (
                                    <ActivityIndicator size="small" color={theme.onActionSolid} />
                                ) : (
                                    <>
                                        <Ionicons name="flash" size={20} color={theme.onActionSolid} />
                                        <PhonkText style={[styles.redeemButtonText, { color: theme.onActionSolid }]}>
                                            {step === 'creator' ? t('continue_caps') : t('redeem_caps')}
                                        </PhonkText>
                                    </>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                </View>
            </KeyboardAvoidingView>

            <TransactionLoadingOverlay visible={isRedeeming} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
        fontFamily: Typography.poppins.medium,
        marginBottom: 10,
    },
    backLink: {
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
        borderRadius: 35,
        paddingTop: 70,
        paddingBottom: 40,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    onlineCard: {
        borderRadius: 35,
        paddingTop: 70,
        paddingBottom: 36,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    onlineKicker: {
        fontSize: 13,
        fontFamily: Typography.poppins.semiBold,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    onlineTitle: {
        fontSize: 30,
        textAlign: 'center',
    },
    onlineRedemptionCard: {
        borderRadius: 28,
        padding: 22,
        borderWidth: 1,
        marginTop: 24,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 18,
        elevation: 2,
    },
    onlineCodeBox: {
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1.5,
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 18,
        marginTop: 10,
    },
    onlineCodeText: {
        fontSize: 28,
        fontFamily: Typography.poppins.semiBold,
        letterSpacing: 3,
    },
    onlineHint: {
        marginTop: 10,
        fontSize: 13,
        fontFamily: Typography.poppins.medium,
    },
    onlineLimitRow: {
        alignItems: 'center',
        gap: 8,
        marginTop: 18,
        paddingTop: 18,
        borderTopWidth: 1,
    },
    onlineLimitText: {
        flex: 1,
        fontSize: 13,
        fontFamily: Typography.poppins.medium,
    },
    logoContainer: {
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
    logoImage: {
        width: '100%',
        height: '100%',
        borderRadius: 21,
    },
    offerTitle: {
        fontSize: 32,
        textAlign: 'center',
    },
    greenText: {
    },
    redemptionCard: {
        borderRadius: 35,
        padding: 24,
    },
    inputLabel: {
        fontSize: 16,
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
        fontFamily: Typography.poppins.semiBold,
        marginRight: 10,
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
        fontSize: 16,
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
        borderRadius: 35,
        height: 65,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        margin: 12,
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
    creatorCard: {
        borderRadius: 35,
        padding: 24,
    },
    creatorInputContainer: {
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
        fontFamily: Typography.poppins.semiBold,
    },
    optionalText: {
        fontFamily: Typography.poppins.medium,
        fontSize: 14,
    },
    // Success Screen Styles
    successContainer: {
        flex: 1,
    },
    successCloseButton: {
        position: 'absolute',
        top: 80,
        right: 24,
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    successPillWrapper: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 30,
        gap: 0,
        zIndex: 1,
    },
    successTopPillWrapper: {
        position: 'relative',
        marginTop: 40,
    },
    successTopPill: {
        borderRadius: 30,
        paddingTop: 50,
        paddingBottom: 24,
        paddingHorizontal: 24,
        alignItems: 'center',
    },
    successBottomPill: {
        borderRadius: 30,
        paddingVertical: 24,
        paddingHorizontal: 24,
        marginTop: -2,
        alignItems: 'center',
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
        width: '100%',
        height: '100%',
        borderRadius: 20,
    },
    successTitle: {
        fontSize: 26,
        fontFamily: Typography.poppins.semiBold,
        textAlign: 'center',
    },
    successTitleGreen: {
        fontSize: 26,
        textAlign: 'center',
        marginBottom: 16,
    },
    successBadge: {
        borderRadius: 30,
        paddingVertical: 10,
        paddingHorizontal: 24,
    },
    successBadgeText: {
        fontSize: 16,
        fontFamily: Typography.poppins.semiBold,
    },
    successSavedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        width: '88%',
    },
    successSavedLabel: {
        fontSize: 15,
        fontFamily: Typography.poppins.semiBold,
        flex: 1,
    },
    successPayRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        borderTopWidth: 1,
        width: '88%',
    },
    successPayLabel: {
        fontSize: 15,
        fontFamily: Typography.poppins.semiBold,
        flex: 1,
    },
    successCashbackRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        borderTopWidth: 1,
        width: '88%',
    },
    successCashbackLabel: {
        fontSize: 15,
        color: '#FF9800',
        fontFamily: Typography.poppins.semiBold,
        flex: 1,
    },
    successCreatorText: {
        fontSize: 13,
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
