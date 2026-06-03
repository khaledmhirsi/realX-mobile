import {
    collection,
    getDocs,
    getFirestore,
    FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    I18nManager,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { logger } from '../../utils/logger';
import { Colors } from '../../constants/Colors';
import { Typography } from '../../constants/Typography';
import { triggerSubtleHaptic } from '../../utils/haptics';
import PhonkText from '../PhonkText';
import ScalePressable from '../ScalePressable';
import RedeemGiftCard from './RedeemGiftCard';
import type { WalletBrand } from './types';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../../context/AppThemeContext';

const PAGE_SIZE = 10;

type Props = {
    visible: boolean;
    onClose: () => void;
    balance: number;
    currency: string;
};

function normalizeSearchText(text: string) {
    return text.trim().toLowerCase();
}

// Fetch dynamically instead of using placeholders

function BrandListItem({
    brand,
    isSelected,
    onSelect,
    isRTL,
    isArabic,
}: {
    brand: WalletBrand;
    isSelected: boolean;
    onSelect: () => void;
    isRTL: boolean;
    isArabic: boolean;
}) {
    const { theme } = useAppTheme();

    return (
        <ScalePressable
            style={[
                styles.brandItem,
                { borderBottomColor: theme.border },
                isRTL && styles.brandItemRTL,
                isSelected && {
                    backgroundColor: theme.brandSoft,
                    borderColor: theme.brand,
                },
            ]}
            onPress={onSelect}
            pressedScale={0.985}
        >
            <View
                style={[
                    styles.brandLogo,
                    { backgroundColor: brand.backgroundColor || theme.logoTile },
                    isRTL ? { marginLeft: 14 } : { marginRight: 14 },
                ]}
            >
                {brand.logo ? (
                    <Image source={{ uri: brand.logo }} style={styles.brandLogoImage} />
                ) : (
                    <Text style={styles.brandLogoPlaceholder}>
                        {(isArabic && brand.nameAr ? brand.nameAr : brand.name).charAt(0)}
                    </Text>
                )}
            </View>
            <Text style={[styles.brandName, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>
                {isArabic && brand.nameAr ? brand.nameAr : brand.name}
            </Text>
        </ScalePressable>
    );
}

export default function SpendCardDrawer({
    visible,
    onClose,
    balance,
    currency,
}: Props) {
    const insets = useSafeAreaInsets();
    const { theme } = useAppTheme();
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
    const [brands, setBrands] = useState<WalletBrand[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const { t, i18n } = useTranslation();
    const isRTL = I18nManager.isRTL;
    const isArabic = i18n.language === 'ar' || isRTL;
    const fetchingRef = useRef(false);
    const requestIdRef = useRef(0);
    const searchQueryRef = useRef('');
    const lastDocRef = useRef<FirebaseFirestoreTypes.QueryDocumentSnapshot | null>(null);
    const isListEndRef = useRef(false);
    const [isListEnd, setIsListEnd] = useState(false);

    const fetchBrands = useCallback(async (isNew: boolean, currentQuery?: string) => {
        if (!isNew && (fetchingRef.current || isListEndRef.current)) return;

        const trimmedQuery = normalizeSearchText(currentQuery ?? searchQueryRef.current);
        const isSearchMode = trimmedQuery.length > 0;

        const requestId = ++requestIdRef.current;
        fetchingRef.current = true;
        setErrorMessage(null);
        if (isNew) {
            setLoading(true);
            lastDocRef.current = null;
            isListEndRef.current = false;
            setIsListEnd(false);
        } else {
            setLoadingMore(true);
        }

        try {
            const db = getFirestore();
            let q = collection(db, 'vendors').where('xcard', '==', true);

            if (isSearchMode) {
                q = q.where('searchTokens', 'array-contains', trimmedQuery);
            }

            q = isNew || !lastDocRef.current
                ? q.limit(PAGE_SIZE)
                : q.startAfter(lastDocRef.current).limit(PAGE_SIZE);

            const snapshot = await getDocs(q);
            if (requestId !== requestIdRef.current) return;

            const items: WalletBrand[] = snapshot.docs.map((doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    name: data.name || t('unknown'),
                    nameAr: data.nameAr || undefined,
                    logo: data.profilePicture || data.logoUrl || data.imageUrl || null,
                    backgroundColor: '#F0F0F0',
                    loyalty: data.loyalty || [],
                };
            });

            setBrands((prev) => (isNew ? items : [...prev, ...items]));

            if (snapshot.docs.length > 0) {
                lastDocRef.current = snapshot.docs[snapshot.docs.length - 1];
                const reachedEnd = snapshot.docs.length < PAGE_SIZE;
                isListEndRef.current = reachedEnd;
                setIsListEnd(reachedEnd);
            } else {
                isListEndRef.current = true;
                setIsListEnd(true);
            }
        } catch (error) {
            if (requestId !== requestIdRef.current) return;
            logger.error('Error fetching vendors for XCard:', error);
            setErrorMessage(t('failed_to_load_brands'));
        } finally {
            if (requestId !== requestIdRef.current) return;
            fetchingRef.current = false;
            setLoading(false);
            setLoadingMore(false);
        }
    }, [t]);

    useEffect(() => {
        if (visible) {
            setBrands([]);
            setSearchInput('');
            setSearchQuery('');
            setSelectedBrandId(null);
            setErrorMessage(null);
            searchQueryRef.current = '';
            void fetchBrands(true, '');
        }
    }, [visible, fetchBrands]);

    const handleSearchSubmit = () => {
        const committedQuery = normalizeSearchText(searchInput);

        setSearchQuery(committedQuery);
        searchQueryRef.current = committedQuery;
        void fetchBrands(true, committedQuery);
    };

    const handleClearSearch = () => {
        triggerSubtleHaptic();
        const hadCommittedQuery = searchQueryRef.current.length > 0;

        setSearchInput('');
        setSearchQuery('');
        searchQueryRef.current = '';

        if (hadCommittedQuery) {
            void fetchBrands(true, '');
        }
    };

    const handleBrandSelect = (brandId: string) => {
        if (selectedBrandId !== brandId) {
            triggerSubtleHaptic();
        }
        setSelectedBrandId(brandId);
    };

    const selectedBrand = brands.find(b => b.id === selectedBrandId);
    const handleClose = () => {
        triggerSubtleHaptic();
        onClose();
    };
    const searchText = normalizeSearchText(searchQuery);
    const emptyTitle = errorMessage
        ? t('failed_to_load_brands')
        : searchText
            ? t('no_matching_brands')
            : t('no_brands_available');
    const emptyBody = errorMessage
        ? errorMessage
        : searchText
            ? t('no_matching_brands_hint')
            : t('no_brands_available_hint');

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={handleClose}
        >
            <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
                {selectedBrand ? (
                    <RedeemGiftCard
                        brand={selectedBrand}
                        onBack={() => setSelectedBrandId(null)}
                        maxLimit={balance}
                        currency={currency}
                        onSuccess={onClose}
                    />
                ) : (
                    <>
                        {/* Header */}
                        <View style={styles.header}>
                            <ScalePressable
                                style={[styles.backButton, { backgroundColor: theme.cardMuted }]}
                                onPress={handleClose}
                                pressedScale={0.9}
                            >
                                <Text style={[styles.backArrow, { color: theme.text }]}>{isArabic ? '→' : '←'}</Text>
                            </ScalePressable>
                            <View style={[styles.logoContainer, isArabic && styles.logoContainerRTL]}>
                                <PhonkText style={[styles.logoX, { color: theme.brand }]}>{t('xcard_title_x')}</PhonkText>
                                <PhonkText style={[styles.logoCard, { color: theme.text }]}>{t('xcard_title_card')}</PhonkText>
                            </View>
                            <View style={styles.headerSpacer} />
                        </View>

                        {/* Balance Card */}
                        <View style={[styles.balanceCard, { backgroundColor: theme.cardMuted }]}>
                            <Text style={[styles.balanceLabel, { color: theme.mutedText }]} numberOfLines={2}>{t('available_balance')}</Text>
                            <PhonkText style={[styles.balanceValue, { color: theme.text }]} numberOfLines={1}>
                                {balance.toFixed(2)} {currency}
                            </PhonkText>
                        </View>

                        {/* Search Bar */}
                        <View style={[styles.searchContainer, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }, isRTL && styles.searchContainerRTL]}>
                            <Ionicons
                                name="search"
                                size={18}
                                color={theme.iconMuted}
                                style={[styles.searchIcon, isRTL && styles.searchIconRTL]}
                            />
                            <TextInput
                                style={[styles.searchInput, { color: theme.inputText, textAlign: isRTL ? 'right' : 'left' }]}
                                placeholder={t('search_brands_placeholder')}
                                placeholderTextColor={theme.inputPlaceholder}
                                value={searchInput}
                                onChangeText={setSearchInput}
                                onSubmitEditing={handleSearchSubmit}
                                returnKeyType="search"
                                blurOnSubmit={false}
                            />
                            {(searchInput.length > 0 || searchQuery.length > 0) ? (
                                <ScalePressable
                                    style={[styles.clearButton, isRTL && styles.clearButtonRTL]}
                                    onPress={handleClearSearch}
                                    pressedScale={0.9}
                                    accessibilityRole="button"
                                    accessibilityLabel="Clear search"
                                >
                                    <Ionicons name="close-circle" size={18} color={theme.iconMuted} />
                                </ScalePressable>
                            ) : null}
                        </View>

                        {/* Brand List */}
                        {loading && brands.length === 0 ? (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                <ActivityIndicator size="large" color={Colors.brandGreen} />
                            </View>
                        ) : (
                            <View style={styles.brandList}>
                                <FlashList
                                    data={brands}
                                    keyExtractor={(item) => item.id}
                                    maintainVisibleContentPosition={{ disabled: true }}
                                    renderItem={({ item }) => (
                                        <BrandListItem
                                            brand={item}
                                            isSelected={selectedBrandId === item.id}
                                            onSelect={() => handleBrandSelect(item.id)}
                                            isRTL={isRTL}
                                            isArabic={isArabic}
                                        />
                                    )}
                                    style={styles.brandList}
                                    contentContainerStyle={[
                                        styles.brandListContent,
                                        { paddingBottom: insets.bottom + 20 },
                                        brands.length === 0 && styles.brandListEmptyContent,
                                    ]}
                                    showsVerticalScrollIndicator={false}
                                    onEndReached={() => {
                                        if (!loadingMore && !isListEnd) {
                                            void fetchBrands(false, searchQueryRef.current);
                                        }
                                    }}
                                    onEndReachedThreshold={0.2}
                                    ListFooterComponent={loadingMore ? (
                                        <ActivityIndicator size="small" color={Colors.brandGreen} style={{ paddingVertical: 16 }} />
                                    ) : null}
                                    ListEmptyComponent={
                                        <View style={styles.emptyState}>
                                            <Text style={styles.emptyStateEmoji}>🔍</Text>
                                            <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
                                                {emptyTitle}
                                            </Text>
                                            <Text style={[styles.emptyStateText, { color: theme.mutedText }]}>
                                                {emptyBody}
                                            </Text>
                                            {errorMessage ? (
                                                <ScalePressable
                                                    onPress={() => {
                                                        triggerSubtleHaptic();
                                                        void fetchBrands(true, searchQueryRef.current);
                                                    }}
                                                    pressedScale={0.96}
                                                    style={[styles.retryButton, { backgroundColor: theme.actionSolid }]}
                                                >
                                                    <Text style={styles.retryButtonText}>{t('retry')}</Text>
                                                </ScalePressable>
                                            ) : null}
                                        </View>
                                    }
                                />
                            </View>
                        )}
                    </>
                )}
            </View>
        </Modal>
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
    backArrow: {
        fontSize: 20,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoContainerRTL: {
        flexDirection: 'row-reverse',
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
    balanceCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 16,
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderRadius: 12,
    },
    balanceLabel: {
        flex: 1,
        fontSize: 14,
        fontFamily: Typography.poppins.medium,
    },
    balanceValue: {
        flexShrink: 0,
        fontSize: 20,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginBottom: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 25,
        borderWidth: 1,
    },
    searchContainerRTL: {
        flexDirection: 'row-reverse',
    },
    searchIcon: {
        marginRight: 10,
    },
    searchIconRTL: {
        marginLeft: 10,
        marginRight: 0,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        fontFamily: Typography.poppins.medium,
        padding: 0,
    },
    clearButton: {
        marginLeft: 10,
    },
    clearButtonRTL: {
        marginLeft: 0,
        marginRight: 10,
    },
    brandList: {
        flex: 1,
    },
    brandListContent: {
        paddingHorizontal: 16,
    },
    brandListEmptyContent: {
        flexGrow: 1,
    },
    brandItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderRadius: 12,
        marginBottom: 4,
    },
    brandItemRTL: {
        flexDirection: 'row-reverse',
    },
    brandItemSelected: {
        borderWidth: 2,
        borderBottomWidth: 2,
    },
    brandLogo: {
        width: 48,
        height: 48,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    brandLogoImage: {
        width: '100%',
        height: '100%',
    },
    brandLogoPlaceholder: {
        fontSize: 18,
        fontFamily: Typography.poppins.semiBold,
        color: '#FFFFFF',
    },
    brandName: {
        fontSize: 15,
        fontFamily: Typography.poppins.medium,
        flex: 1,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingTop: 32,
    },
    emptyStateEmoji: {
        fontSize: 28,
        marginBottom: 12,
    },
    emptyStateTitle: {
        fontSize: 16,
        fontFamily: Typography.poppins.semiBold,
        textAlign: 'center',
        marginBottom: 8,
    },
    emptyStateText: {
        fontSize: 13,
        fontFamily: Typography.poppins.medium,
        textAlign: 'center',
        lineHeight: 20,
    },
    retryButton: {
        marginTop: 16,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 999,
    },
    retryButtonText: {
        fontSize: 14,
        fontFamily: Typography.poppins.semiBold,
        color: '#FFFFFF',
    },
});
