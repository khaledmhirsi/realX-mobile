import { pickLocalizedText } from '../../utils/textFallback';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getAuth } from '@react-native-firebase/auth';
import { collection, deleteDoc, doc, getDoc, getDocs, getFirestore, query, serverTimestamp, setDoc, where } from '@react-native-firebase/firestore';
import { GlassView } from 'expo-glass-effect';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Pressable, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { useAppTheme } from '../../context/AppThemeContext';
import { logger } from '../../utils/logger';
import { Typography } from '../../constants/Typography';
import PhonkText from '../../components/PhonkText';
import { haversineDistanceKm, isValidLatLng, LatLng } from '../../utils/mapGeo';

type VendorBranch = {
    id: string;
    name?: string;
    nameAr?: string;
    phoneNumber?: string;
    address?: string;
    addressAr?: string;
    latitude?: number;
    longitude?: number;
    isPrimary?: boolean;
    distanceKm?: number;
};

function getVendorBranches(vendor: any): VendorBranch[] {
    const rawLocations = Array.isArray(vendor?.locations) && vendor.locations.length > 0
        ? vendor.locations
        : [{
            id: 'primary',
            phoneNumber: vendor?.phoneNumber,
            address: vendor?.address,
            addressAr: vendor?.addressAr,
            latitude: vendor?.latitude ?? vendor?.lat,
            longitude: vendor?.longitude ?? vendor?.lng,
            isPrimary: true,
        }];

    return rawLocations
        .map((location: any, index: number) => {
            const latitude = typeof location?.latitude === 'string' ? parseFloat(location.latitude) : location?.latitude;
            const longitude = typeof location?.longitude === 'string' ? parseFloat(location.longitude) : location?.longitude;
            return {
                id: String(location?.id || (location?.isPrimary ? 'primary' : `branch-${index + 1}`)),
                name: location?.name,
                nameAr: location?.nameAr,
                phoneNumber: typeof location?.phoneNumber === 'string' ? location.phoneNumber.trim() : undefined,
                address: location?.address || vendor?.address,
                addressAr: location?.addressAr || vendor?.addressAr,
                latitude,
                longitude,
                isPrimary: location?.isPrimary === true || index === 0,
            };
        })
        .filter((location: VendorBranch) => isValidLatLng(location.latitude, location.longitude));
}

function getDialablePhoneNumber(phoneNumber?: string) {
    const normalized = phoneNumber?.replace(/[^\d+]/g, '') || '';
    return normalized.length > 0 ? normalized : null;
}

function callPhoneNumber(phoneNumber?: string) {
    const dialable = getDialablePhoneNumber(phoneNumber);
    if (!dialable) return;
    void Linking.openURL(`tel:${dialable}`);
}

function formatBranchDistance(distanceKm: number) {
    if (distanceKm >= 100) {
        return `${Math.round(distanceKm)} km away`;
    }
    return `${distanceKm.toFixed(1)} km away`;
}

export default function VendorScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();
    const { i18n, t } = useTranslation();
    const { isDark, theme } = useAppTheme();
    const isArabic = i18n.language === 'ar';
    const [vendor, setVendor] = useState<any>(null);
    const [offers, setOffers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOfferForTC, setSelectedOfferForTC] = useState<any>(null);
    const [actualVendorId, setActualVendorId] = useState<string | null>(null);
    const [savedOfferIds, setSavedOfferIds] = useState<Set<string>>(new Set());
    const [savingOfferIds, setSavingOfferIds] = useState<Set<string>>(new Set());
    const [branchPickerVisible, setBranchPickerVisible] = useState(false);
    const [userLocation, setUserLocation] = useState<LatLng | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                const db = getFirestore();

                // Fetch Vendor
                const vendorRef = doc(db, 'vendors', id);
                const vendorSnap = await getDoc(vendorRef);
                
                let vendorData = null;
                let foundVendorId = id;

                if (vendorSnap.exists()) {
                    vendorData = vendorSnap.data();
                    setActualVendorId(id);
                } else {
                    // Fallback: Try searching by name if ID lookup fails
                    // This is useful since the banner's offerId might be the vendor name
                    const vendorsRef = collection(db, 'vendors');
                    const nameQuery = query(vendorsRef, where('name', '==', id));
                    const nameSnap = await getDocs(nameQuery);
                    
                    if (!nameSnap.empty) {
                        const foundDoc = nameSnap.docs[0];
                        vendorData = foundDoc.data();
                        foundVendorId = foundDoc.id;
                        setActualVendorId(foundDoc.id);
                    } else if (isArabic) {
                        const nameArQuery = query(vendorsRef, where('nameAr', '==', id));
                        const nameArSnap = await getDocs(nameArQuery);
                        if (!nameArSnap.empty) {
                            const foundDoc = nameArSnap.docs[0];
                            vendorData = foundDoc.data();
                            foundVendorId = foundDoc.id;
                            setActualVendorId(foundDoc.id);
                        }
                    }
                }

                if (vendorData) {
                    setVendor(vendorData);

                    // Use offers array from vendor document
                    const vendorOffers = (vendorData.offers || []).map((offer: any, index: number) => ({
                        id: `${foundVendorId}_offer_${index}`,
                        offerIndex: index,
                        ...offer,
                    }));

                    setOffers(vendorOffers);
                }
            } catch (error) {
                logger.error("Error fetching vendor data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, isArabic]);

    useEffect(() => {
        const fetchSavedOffers = async () => {
            const user = getAuth().currentUser;
            if (!user || !actualVendorId) {
                setSavedOfferIds(new Set());
                return;
            }

            try {
                const db = getFirestore();
                const savedRef = collection(db, 'students', user.uid, 'savedItems');
                const savedQuery = query(savedRef, where('vendorId', '==', actualVendorId));
                const snapshot = await getDocs(savedQuery);
                setSavedOfferIds(new Set(snapshot.docs.map((docSnap: any) => docSnap.id)));
            } catch (error) {
                logger.error('Error loading saved offers:', error);
            }
        };

        void fetchSavedOffers();
    }, [actualVendorId]);

    useEffect(() => {
        const loadUserLocation = async () => {
            try {
                const currentPermission = await Location.getForegroundPermissionsAsync();
                const finalPermission = currentPermission.granted
                    ? currentPermission
                    : await Location.requestForegroundPermissionsAsync();

                if (!finalPermission.granted) return;

                const position = await Location.getCurrentPositionAsync({});
                setUserLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
            } catch (error) {
                logger.warn('Unable to load location for nearest branch:', error);
            }
        };

        if (vendor) {
            void loadUserLocation();
        }
    }, [vendor]);

    const branches = useMemo(() => {
        if (!vendor) return [];
        const parsedBranches = getVendorBranches(vendor);
        if (!userLocation) return parsedBranches;
        return parsedBranches
            .map((branch) => ({
                ...branch,
                distanceKm: haversineDistanceKm(userLocation, {
                    latitude: branch.latitude!,
                    longitude: branch.longitude!,
                }),
            }))
            .sort((a, b) => (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY));
    }, [userLocation, vendor]);

    const nearestBranch = branches[0] || null;
    const branchListMaxHeight = Math.max(260, Math.min(520, windowHeight * 0.58 - insets.bottom));

    const openBranchOnMap = (branch: VendorBranch) => {
        if (!isValidLatLng(branch.latitude, branch.longitude)) return;
        router.push({
            pathname: '/(tabs)/map',
            params: {
                vendorId: actualVendorId || id,
                lat: String(branch.latitude),
                lng: String(branch.longitude),
                locationId: branch.id,
            },
        });
        setBranchPickerVisible(false);
    };

    const toggleSavedOffer = async (offer: any, offerIndex: number) => {
        const user = getAuth().currentUser;
        const vendorId = actualVendorId || id;
        if (!user || !vendorId) {
            Alert.alert(t('error'), t('login_required_message'));
            return;
        }

        const savedId = `${vendorId}_offer_${offerIndex}`;
        if (savingOfferIds.has(savedId)) return;

        setSavingOfferIds((previous) => new Set(previous).add(savedId));
        try {
            const db = getFirestore();
            const savedRef = doc(db, 'students', user.uid, 'savedItems', savedId);

            if (savedOfferIds.has(savedId)) {
                await deleteDoc(savedRef);
                setSavedOfferIds((previous) => {
                    const next = new Set(previous);
                    next.delete(savedId);
                    return next;
                });
                return;
            }

            await setDoc(savedRef, {
                type: 'offer',
                vendorId,
                offerIndex,
                vendorName: vendor.name || '',
                vendorNameAr: vendor.nameAr || '',
                vendorLogo: vendor.profilePicture || '',
                vendorCoverImage: vendor.coverImage || '',
                titleEn: offer.titleEn || '',
                titleAr: offer.titleAr || '',
                descriptionEn: offer.descriptionEn || '',
                descriptionAr: offer.descriptionAr || '',
                discountType: offer.discountType || '',
                discountValue: offer.discountValue ?? null,
                xcard: !!offer.xcard || !!vendor.xcard,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            setSavedOfferIds((previous) => new Set(previous).add(savedId));
        } catch (error) {
            logger.error('Error toggling saved offer:', error);
            Alert.alert(t('error'), t('saved_offer_failed'));
        } finally {
            setSavingOfferIds((previous) => {
                const next = new Set(previous);
                next.delete(savedId);
                return next;
            });
        }
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.brand} />
            </View>
        );
    }

    if (!vendor) {
        return (
                <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
                <Text style={[{ color: theme.text, fontFamily: Typography.poppins.medium }, styles.errorText]}>{t('vendor_not_found')}</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Header Image Section */}
                <View style={styles.headerContainer}>
                    <Image
                        source={{ uri: vendor.coverImage }}
                        style={styles.coverImage}
                        contentFit="cover"
                        transition={200}
                    />

                    {/* Header Buttons */}
                    <SafeAreaView style={styles.headerOverlay} edges={['top']}>
                        <View style={styles.headerButtonsRow}>
                            <TouchableOpacity
                                style={[styles.roundButton, { backgroundColor: theme.logoTile, shadowColor: theme.shadow }]}
                                onPress={() => router.back()}
                                activeOpacity={0.8}
                            >
                                <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={24} color={theme.logoTileText} />
                            </TouchableOpacity>

                        </View>
                    </SafeAreaView>

                    {/* Vendor Logo Overlapping */}
                    <View style={styles.logoContainer}>
                        <Image
                            source={{ uri: vendor.profilePicture }}
                            style={[styles.logoImage, { backgroundColor: theme.logoTile, borderColor: theme.logoTileBorder }]}
                            contentFit="contain"
                        />
                    </View>

                </View>

                {/* Vendor Details */}
                <View style={[styles.detailsContainer, { backgroundColor: theme.background }]}>
                    <View style={styles.vendorHeaderRow}>
                        {vendor.integralLogo ? (
                            <Image
                                source={{ uri: vendor.integralLogo }}
                                style={styles.integralLogo}
                                contentFit="contain"
                            />
                        ) : (
                            <PhonkText style={[{ color: theme.text }, styles.vendorName]}>{pickLocalizedText(isArabic, vendor.nameAr, vendor.name, 'Vendor')}</PhonkText>
                        )}
                    </View>

                    <View style={styles.metaStack}>
                        <View style={[styles.metaLine, styles.metaLineSpread]}>
                            <TouchableOpacity style={[styles.locationButton, { backgroundColor: theme.cardMuted }]} onPress={() => {
                                if (branches.length > 1) {
                                    setBranchPickerVisible(true);
                                    return;
                                }

                                if (branches.length === 1) {
                                    openBranchOnMap(branches[0]);
                                    return;
                                }

                                const vendorName = pickLocalizedText(isArabic, vendor.nameAr, vendor.name, 'Vendor');
                                const q = encodeURIComponent(vendorName + " Qatar");
                                void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
                            }} activeOpacity={0.7}>
                                <Ionicons name="location-outline" size={18} color={theme.brand} />
                                <Text style={[styles.locationText, { color: theme.text, fontFamily: Typography.poppins.medium }]} numberOfLines={1}>
                                    {branches.length > 1 ? `${t('location')} (${branches.length})` : t('location')}
                                </Text>
                            </TouchableOpacity>
                            {nearestBranch?.distanceKm != null && (
                                <View style={[styles.nearestBranchChip, { backgroundColor: theme.brandSoft }]}>
                                    <Ionicons name="navigate-outline" size={13} color={theme.brand} />
                                    <Text style={[styles.nearestBranchText, { color: theme.brandText }]} numberOfLines={1}>{nearestBranch.distanceKm.toFixed(1)} km</Text>
                                </View>
                            )}
                        </View>

                        <View style={[styles.metaLine, styles.metaLineSpread]}>
                            {nearestBranch?.phoneNumber ? (
                                <TouchableOpacity
                                    style={[styles.phoneButton, { backgroundColor: theme.cardMuted }]}
                                    onPress={() => callPhoneNumber(nearestBranch.phoneNumber)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="call-outline" size={15} color={theme.brand} />
                                    <Text style={[styles.phoneButtonText, { color: theme.text }]} numberOfLines={1}>
                                        {nearestBranch.phoneNumber}
                                    </Text>
                                </TouchableOpacity>
                            ) : null}

                            <View style={styles.tagsRow}>
                                {vendor.trending && (
                                    <View style={styles.tagChip}>
                                        <Ionicons name="trending-up" size={14} color="#FFF" />
                                        <Text style={[styles.tagText, { fontFamily: Typography.poppins.semiBold }]} numberOfLines={1}>{t('trending')}</Text>
                                    </View>
                                )}
                                {vendor.xcard && (
                                    <View style={[styles.tagChip, { backgroundColor: theme.brand }]}>
                                        <Ionicons name="cash-outline" size={14} color="#FFF" />
                                        <Text style={[styles.tagText, { fontFamily: Typography.poppins.semiBold }]} numberOfLines={1}>{t('cashback')}</Text>
                                    </View>
                                )}
                                {vendor.vendorType === 'online' && (
                                    <View style={[styles.tagChip, { backgroundColor: '#2563EB' }]}>
                                        <Ionicons name="globe-outline" size={14} color="#FFF" />
                                        <Text style={[styles.tagText, { fontFamily: Typography.poppins.semiBold }]} numberOfLines={1}>{t('online_vendor_label')}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Offers List */}
                    <View style={styles.offersList}>
                        {vendor.vendorType === 'online' ? (
                            <View style={styles.offerCard}>
                                <View style={[styles.offerInfoContainer, { backgroundColor: theme.cardMuted }]}>
                                    <View style={styles.offerContent}>
                                        <PhonkText style={[{ color: theme.text }, styles.offerTitle]}>
                                            {pickLocalizedText(isArabic, vendor.brandOfferNameAr, vendor.brandOfferName, t('online_vendor_title'))}
                                        </PhonkText>
                                        <Text style={[styles.descriptionText, { color: theme.mutedText, textAlign: isArabic ? 'right' : 'left' }]}>
                                            {t('online_vendor_description')}
                                        </Text>
                                    </View>
                                </View>

                                <View style={[styles.offerActionsRow, { backgroundColor: theme.cardMuted }]}>
                                    <TouchableOpacity
                                        style={[styles.pillButton, styles.redeemPill, { backgroundColor: theme.actionSolid }]}
                                        onPress={() => {
                                            router.push(`/redeem/${actualVendorId || id}?vendorId=${actualVendorId || id}`);
                                        }}
                                    >
                                        <Ionicons name="globe-outline" size={18} color={theme.onActionSolid} />
                                        <Text style={[{ color: theme.onActionSolid, fontFamily: Typography.poppins.medium }, styles.pillButtonTextSmall]}>{t('redeem_caps')}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                        offers.map((offer) => {
const percentValue =
    offer.discountType === 'percentage' && offer.discountValue
        ? `${offer.discountValue}%`
        : offer.discountType === 'buy1get1'
            ? 'BUY 1 GET 1'
            : '';

const offerTitle = isArabic
    ? (percentValue ? `خصم ${percentValue}` : (offer.titleAr || offer.titleEn))
    : (offer.titleEn || offer.titleAr);
const offerIndex = offer.offerIndex ?? offers.indexOf(offer);
const savedId = `${actualVendorId || id}_offer_${offerIndex}`;
const isSaved = savedOfferIds.has(savedId);
                            return (
                                <View key={offer.id} style={styles.offerCard}>
                                    {offer.xcard && (
                                        <Image
                                            source={require('../../assets/images/cashback.png')}
                                            style={styles.xcardBadge}
                                        />
                                    )}
                                    <TouchableOpacity
                                        style={[
                                            styles.offerSaveButton,
                                            { backgroundColor: isSaved ? theme.brand : theme.card, shadowColor: theme.shadow },
                                            isSaved && styles.offerSaveButtonActive,
                                        ]}
                                        onPress={() => void toggleSavedOffer(offer, offerIndex)}
                                        disabled={savingOfferIds.has(savedId)}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons
                                            name={isSaved ? 'bookmark' : 'bookmark-outline'}
                                            size={22}
                                            color={isSaved ? theme.onActionSolid : theme.brand}
                                        />
                                    </TouchableOpacity>
                                    {/* Top Info Pill */}
                                    <View style={[styles.offerInfoContainer, { backgroundColor: theme.cardMuted }]}>
                                        <View style={styles.offerContent}>
                                            <PhonkText style={[{ color: theme.text }, styles.offerTitle]}>
                                                {(offerTitle || "").split(/(\d+(?:\.\d+)?\s?%?)/).map((part: string, index: number) => 
                                                    /^\d+(?:\.\d+)?\s?%?$/.test(part) ? (
                                                        <PhonkText key={index} style={styles.greenText}>{part}</PhonkText>
                                                    ) : (
                                                        part
                                                    )
                                                )}
                                            </PhonkText>
                                        </View>
                                    </View>
                                    {/* Bottom Button Pills */}
                                    <View style={[styles.offerActionsRow, { backgroundColor: theme.cardMuted }]}>
                                        <TouchableOpacity
                                            style={[styles.pillButton, { backgroundColor: theme.card }]}
                                            onPress={() => setSelectedOfferForTC(offer)}
                                        >
                                            <Ionicons name="alert-circle-outline" size={22} color={theme.iconMuted} />
                                            <Text style={[{ color: theme.text, fontFamily: Typography.poppins.medium }, styles.pillButtonTextSmall]}>{t('view_tc')}</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.pillButton, styles.redeemPill, { backgroundColor: theme.actionSolid }]}
                                            onPress={() => {
                                                router.push(`/redeem/${actualVendorId || id}?vendorId=${actualVendorId || id}&offerIndex=${offerIndex}`);
                                            }}
                                        >
                                            <Ionicons name="flash" size={18} color={theme.onActionSolid} />
                                            <Text style={[{ color: theme.onActionSolid, fontFamily: Typography.poppins.medium }, styles.pillButtonTextSmall]}>{t('redeem_caps')}</Text>
                                        </TouchableOpacity>

                                    </View>
                                </View>
                            );
                        })
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* T&C Modal */}
            <Modal
                visible={!!selectedOfferForTC}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setSelectedOfferForTC(null)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setSelectedOfferForTC(null)}
                >
                    <GlassView style={StyleSheet.absoluteFill} glassEffectStyle="regular" colorScheme={isDark ? 'dark' : 'light'} tintColor="rgba(0,0,0,0.3)" />
                    <Pressable
                        style={[
                            styles.drawerContainer,
                            {
                                backgroundColor: theme.card,
                                paddingBottom: insets.bottom + 20
                            }
                        ]}
                        onPress={(e) => e.stopPropagation()}
                    >
                        {/* Drawer Handle */}
                        <View style={styles.handleContainer}>
                            <View style={[styles.handle, { backgroundColor: theme.borderStrong }]} />
                        </View>

                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <PhonkText style={[{ color: theme.text, textAlign: isArabic ? 'right' : 'left' }, styles.modalTitleText]}>{t('terms_and_conditions_caps')}</PhonkText>
                                <TouchableOpacity
                                    onPress={() => setSelectedOfferForTC(null)}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Ionicons name="close-circle" size={28} color={theme.icon} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                style={styles.modalBody}
                                contentContainerStyle={styles.modalBodyContent}
                            >
                                <Text style={[{ color: theme.mutedText, fontFamily: Typography.poppins.medium, textAlign: isArabic ? 'right' : 'left' }, styles.descriptionText]}>
                                    {isArabic
                                        ? (selectedOfferForTC?.descriptionAr || selectedOfferForTC?.descriptionEn || t('no_specific_terms'))
                                        : (selectedOfferForTC?.descriptionEn || selectedOfferForTC?.descriptionAr || t('no_specific_terms'))}
                                </Text>

                                <View style={[styles.commonTerms, { borderTopColor: theme.border }]}>
                                    <View style={[styles.termRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                        <Ionicons name="checkmark-circle" size={18} color={theme.brand} />
                                        <Text style={[{ color: theme.mutedText, fontFamily: Typography.poppins.medium, textAlign: isArabic ? 'right' : 'left' }, styles.termText]}>{t('in_store_only')}</Text>
                                    </View>
                                    <View style={[styles.termRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                        <Ionicons name="checkmark-circle" size={18} color={theme.brand} />
                                        <Text style={[{ color: theme.mutedText, fontFamily: Typography.poppins.medium, textAlign: isArabic ? 'right' : 'left' }, styles.termText]}>{t('cannot_be_combined')}</Text>
                                    </View>
                                    <View style={[styles.termRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                        <Ionicons name="checkmark-circle" size={18} color={theme.brand} />
                                        <Text style={[{ color: theme.mutedText, fontFamily: Typography.poppins.medium, textAlign: isArabic ? 'right' : 'left' }, styles.termText]}>{t('xp_promotional_reward')}</Text>
                                    </View>
                                    <View style={[styles.termRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                        <Ionicons name="checkmark-circle" size={18} color={theme.brand} />
                                        <Text style={[{ color: theme.mutedText, fontFamily: Typography.poppins.medium, textAlign: isArabic ? 'right' : 'left' }, styles.termText]}>{t('xp_no_cash_withdrawal')}</Text>
                                    </View>
                                    <View style={[styles.termRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
                                        <Ionicons name="checkmark-circle" size={18} color={theme.brand} />
                                        <Text style={[{ color: theme.mutedText, fontFamily: Typography.poppins.medium, textAlign: isArabic ? 'right' : 'left' }, styles.termText]}>{t('xp_in_app_only')}</Text>
                                    </View>
                                </View>
                            </ScrollView>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal
                visible={branchPickerVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setBranchPickerVisible(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setBranchPickerVisible(false)}>
                    <GlassView style={StyleSheet.absoluteFill} glassEffectStyle="regular" colorScheme={isDark ? 'dark' : 'light'} tintColor="rgba(0,0,0,0.3)" />
                    <Pressable
                        style={[
                            styles.drawerContainer,
                            {
                                backgroundColor: theme.card,
                                paddingBottom: insets.bottom + 20
                            }
                        ]}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={styles.handleContainer}>
                            <View style={[styles.handle, { backgroundColor: theme.borderStrong }]} />
                        </View>

                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <PhonkText style={[{ color: theme.text, textAlign: isArabic ? 'right' : 'left' }, styles.modalTitleText]}>
                                    {isArabic ? 'الفروع' : 'BRANCHES'}
                                </PhonkText>
                                <TouchableOpacity
                                    onPress={() => setBranchPickerVisible(false)}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Ionicons name="close-circle" size={28} color={theme.icon} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView
                                style={[styles.branchListScroll, { maxHeight: branchListMaxHeight }]}
                                contentContainerStyle={styles.branchListContent}
                                showsVerticalScrollIndicator={false}
                                bounces={false}
                                nestedScrollEnabled
                            >
                                {branches.map((branch, index) => {
                                    const branchName = isArabic
                                        ? (branch.nameAr || branch.name || `${isArabic ? 'فرع' : 'Branch'} ${index + 1}`)
                                        : (branch.name || branch.nameAr || `Branch ${index + 1}`);
                                    const address = isArabic
                                        ? (branch.addressAr || branch.address || '')
                                        : (branch.address || branch.addressAr || '');

                                    return (
                                        <TouchableOpacity
                                            key={branch.id}
                                            style={[styles.branchRow, { backgroundColor: theme.cardMuted }]}
                                            onPress={() => openBranchOnMap(branch)}
                                            activeOpacity={0.8}
                                        >
                                            <View style={styles.branchMainRow}>
                                                <View style={[styles.branchIcon, { backgroundColor: theme.card }]}>
                                                    <Ionicons name={index === 0 ? 'navigate' : 'location-outline'} size={18} color={theme.brand} />
                                                </View>
                                                <View style={styles.branchTextBlock}>
                                                    <View style={styles.branchTitleRow}>
                                                        <Text style={[styles.branchName, { color: theme.text }]} numberOfLines={1}>{branchName}</Text>
                                                        {index === 0 && branch.distanceKm != null && (
                                                            <View style={[styles.branchNearestPill, { backgroundColor: theme.brand }]}>
                                                                <Text style={[styles.branchNearestText, { color: theme.onActionSolid }]}>Nearest</Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                    {address ? <Text style={[styles.branchAddress, { color: theme.mutedText }]} numberOfLines={2}>{address}</Text> : null}
                                                </View>
                                            </View>
                                            <View style={[styles.branchMetaRow, styles.branchMetaRowSpread]}>
                                                {branch.phoneNumber ? (
                                                    <TouchableOpacity
                                                        style={[styles.branchPhoneChip, { backgroundColor: theme.card }]}
                                                        onPress={(event) => {
                                                            event.stopPropagation();
                                                            callPhoneNumber(branch.phoneNumber);
                                                        }}
                                                        activeOpacity={0.8}
                                                    >
                                                        <Ionicons name="call-outline" size={14} color={theme.brand} />
                                                        <Text style={[styles.branchPhoneText, { color: theme.text }]} numberOfLines={1}>
                                                            {branch.phoneNumber}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ) : null}
                                                {branch.distanceKm != null && (
                                                    <View style={[styles.branchDistanceChip, { backgroundColor: theme.brandSoft }]}>
                                                        <Ionicons name="navigate-outline" size={13} color={theme.brand} />
                                                        <Text style={[styles.branchDistance, { color: theme.brandText }]}>{formatBranchDistance(branch.distanceKm)}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
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
    },
    errorText: {
        fontSize: 16,
        fontFamily: Typography.poppins.medium,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    headerContainer: {
        height: 250,
        width: '100%',
        position: 'relative',
    },
    coverImage: {
        width: '100%',
        height: '100%',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        borderWidth: 2,
        borderColor: Colors.brandGreen,
    },
    headerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    headerButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    roundButton: {
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
    logoContainer: {
        position: 'absolute',
        bottom: -20, // Overlap
        left: 20,
        width: 100,
        height: 100,
        zIndex: 5,
        elevation: 5,
    },
    logoImage: {
        width: '100%',
        height: '100%',
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
        backgroundColor: 'transparent',
    },
    detailsContainer: {
        paddingTop: 30, // Space for logo overlap
        paddingHorizontal: 20,
    },
    vendorHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
    },
    vendorName: {
        fontSize: 26,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    integralLogo: {
        width: 180,
        height: 60,
    },
    rightChips: {
        flexDirection: 'row',
        gap: 8,
    },
    metaStack: {
        marginTop: 12,
        gap: 10,
    },
    metaLine: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 10,
    },
    metaLineSpread: {
        justifyContent: 'space-between',
    },
    tagsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        flex: 1,
        justifyContent: 'flex-end',
    },
    tagChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#000000',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
    },
    tagText: {
        fontSize: 12,
        color: '#FFF',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    locationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        maxWidth: '58%',
    },
    locationText: {
        fontSize: 14,
        flexShrink: 1,
    },
    nearestBranchChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        minWidth: 110,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 18,
    },
    nearestBranchText: {
        fontSize: 14,
        fontFamily: Typography.poppins.semiBold,
    },
    phoneButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        maxWidth: '48%',
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 18,
    },
    phoneButtonText: {
        flexShrink: 1,
        fontSize: 14,
        fontFamily: Typography.poppins.semiBold,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingText: {
        fontSize: 14,
        fontFamily: Typography.poppins.semiBold,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#000000',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    categoryEmoji: {
        fontSize: 12,
    },
    categoryText: {
        fontSize: 12,
        fontFamily: Typography.poppins.medium,
    },
    offersList: {
        marginTop: 24,
        gap: 20,
    },
    offerCard: {
        marginBottom: 8,
        position: 'relative',
    },
    xcardBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        zIndex: 10,
    },
    offerInfoContainer: {
        borderRadius: 30,
        paddingHorizontal: 24,
        paddingVertical: 16,
        paddingEnd: 72,
        minHeight: 82,
        position: 'relative',
    },
    offerContent: {
        gap: 4,
    },
    offerTitle: {
        fontSize: 20,
        letterSpacing: -0.5,
        textTransform: 'uppercase',
    },
    greenText: {
        color: Colors.brandGreen,
    },
    offerSubtitle: {
        fontSize: 15,
        fontFamily: Typography.poppins.medium,
        color: '#8E8E93',
    },
    offerActionsRow: {
        flexDirection: 'row',
        gap: 12,
        borderRadius: 30,
        paddingHorizontal: 8,
        paddingVertical: 8,
    },
    pillButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        borderRadius: 30,
        gap: 8,
    },
    redeemPill: {
    },
    offerSaveButton: {
        position: 'absolute',
        top: 12,
        right: 16,
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
        elevation: 8,
        zIndex: 40,
    },
    offerSaveButtonActive: {
    },
    pillButtonTextSmall: {
        fontSize: 14,
        fontFamily: Typography.poppins.semiBold,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'transparent',
        justifyContent: 'flex-end',
    },
    drawerContainer: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        maxHeight: '80%',
    },
    handleContainer: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    handle: {
        width: 40,
        height: 5,
        borderRadius: 2.5,
    },
    modalContent: {
        paddingHorizontal: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitleText: {
        fontSize: 20,
        letterSpacing: 0.5,
    },
    modalBody: {
        marginBottom: 20,
    },
    modalBodyContent: {
        paddingBottom: 20,
    },
    descriptionText: {
        fontSize: 16,
        fontFamily: Typography.poppins.medium,
        lineHeight: 24,
    },
    commonTerms: {
        marginTop: 24,
        gap: 12,
        paddingTop: 24,
        borderTopWidth: 1,
    },
    termRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    branchListScroll: {
        flexGrow: 0,
    },
    branchListContent: {
        gap: 12,
        paddingBottom: 10,
    },
    branchRow: {
        gap: 10,
        borderRadius: 20,
        padding: 14,
    },
    branchMainRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    branchIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    branchTextBlock: {
        flex: 1,
        gap: 3,
    },
    branchTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    branchName: {
        flex: 1,
        fontSize: 15,
        fontFamily: Typography.poppins.semiBold,
    },
    branchNearestPill: {
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    branchNearestText: {
        fontSize: 10,
        fontFamily: Typography.poppins.semiBold,
        textTransform: 'uppercase',
    },
    branchAddress: {
        fontSize: 13,
        fontFamily: Typography.poppins.medium,
    },
    branchMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        paddingStart: 52,
    },
    branchMetaRowSpread: {
        justifyContent: 'flex-start',
    },
    branchPhoneChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        flexShrink: 1,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 18,
    },
    branchPhoneText: {
        flexShrink: 1,
        fontSize: 15,
        fontFamily: Typography.poppins.semiBold,
    },
    branchDistanceChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flexShrink: 1,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 18,
    },
    branchDistance: {
        fontSize: 14,
        fontFamily: Typography.poppins.semiBold,
    },
    termText: {
        fontSize: 14,
        fontFamily: Typography.poppins.medium,
    },
});
