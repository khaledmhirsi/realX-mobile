import { collection, doc, getDoc, getDocs, getFirestore, limit, orderBy, query, startAfter, where } from '@react-native-firebase/firestore';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, ImageSourcePropType, Keyboard, NativeSyntheticEvent, NativeScrollEvent, ScrollView, StatusBar, StyleSheet, Text, View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { logger } from '../../utils/logger';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    BrowseSection,
    CategoryHeader,
    FilterTabs,
    RestaurantCard,
    SubCategoryChips
} from '../../components/category';
import { useTranslation } from 'react-i18next';
import { SearchBar } from '../../components/home';
import { useAppTheme } from '../../context/AppThemeContext';
import { Typography } from '../../constants/Typography';

const BACKGROUND_ICONS = [
    { name: 'laptop-outline' as const, top: '2%', left: '75%', size: 28, color: '#8E8E93', rotation: '15deg' },
    { name: 'watch-outline' as const, top: '1%', left: '90%', size: 32, color: '#8E8E93', rotation: '-20deg' },
    { name: 'pizza-outline' as const, top: '8%', left: '25%', size: 22, color: '#8E8E93', rotation: '-30deg' },
    { name: 'fast-food-outline' as const, top: '1%', left: '45%', size: 32, color: '#8E8E93', rotation: '10deg' },
    { name: 'cafe-outline' as const, top: '22%', left: '60%', size: 24, color: '#53C268', rotation: '-15deg' },
    { name: 'beaker-outline' as const, top: '22%', left: '72%', size: 28, color: '#53C268', rotation: '25deg' },
    { name: 'ice-cream-outline' as const, top: '25%', left: '20%', size: 22, color: '#8E8E93', rotation: '15deg' },
    { name: 'football-outline' as const, top: '28%', left: '38%', size: 26, color: '#8E8E93', rotation: '-25deg' },
    { name: 'storefront-outline' as const, top: '35%', left: '5%', size: 36, color: '#53C268', rotation: '-10deg' },
    { name: 'car-outline' as const, top: '35%', left: '85%', size: 32, color: '#8E8E93', rotation: '25deg' },
    { name: 'medkit-outline' as const, top: '42%', left: '15%', size: 30, color: '#53C268', rotation: '-15deg' },
    { name: 'bicycle-outline' as const, top: '48%', left: '85%', size: 26, color: '#8E8E93', rotation: '45deg' },
    { name: 'laptop-outline' as const, top: '55%', left: '5%', size: 28, color: '#53C268', rotation: '10deg' },
    { name: 'bus-outline' as const, top: '65%', left: '92%', size: 32, color: '#8E8E93', rotation: '-15deg' },
    { name: 'fast-food-outline' as const, top: '72%', left: '35%', size: 32, color: '#8E8E93', rotation: '-20deg' },
    { name: 'egg-outline' as const, top: '70%', left: '80%', size: 28, color: '#8E8E93', rotation: '45deg' },
    { name: 'nutrition-outline' as const, top: '78%', left: '50%', size: 24, color: '#8E8E93', rotation: '15deg' },
    { name: 'ice-cream-outline' as const, top: '80%', left: '88%', size: 40, color: '#8E8E93', rotation: '30deg' },
    { name: 'laptop-outline' as const, top: '85%', left: '8%', size: 36, color: '#8E8E93', rotation: '-15deg' },
    { name: 'watch-outline' as const, top: '90%', left: '28%', size: 32, color: '#8E8E93', rotation: '10deg' },
    { name: 'pizza-outline' as const, top: '88%', left: '60%', size: 24, color: '#53C268', rotation: '-45deg' },
    { name: 'restaurant-outline' as const, top: '92%', left: '65%', size: 30, color: '#53C268', rotation: '20deg' },
    { name: 'cafe-outline' as const, top: '95%', left: '75%', size: 28, color: '#53C268', rotation: '-15deg' },
    { name: 'ice-cream-outline' as const, top: '95%', left: '55%', size: 26, color: '#53C268', rotation: '10deg' },
];

// Category configuration map
const categoryConfig: Record<string, {
    title: string;
    icon: string | ImageSourcePropType;
    subCategories: { id: string; name: string; icon: string }[];
    promos: {
        id: string;
        title: string;
        subtitle: string;
        discount?: string;
        backgroundColor: string;
        accentColor?: string;
    }[];
    browseTitle: string;
    restaurants: {
        id: string;
        name: string;
        cashbackText?: string;
        isTrending?: boolean;
        logoUri?: string;
    }[];
}> = {};


// Default config for unknown categories
const defaultConfig = {
    title: 'Category',
    icon: '📦',
    subCategories: [],
    promos: [],
    browseTitle: 'Yallah! Browse',
    restaurants: [],
};

interface HeaderContentProps {
    headerTitle: string;
    headerIcon: any;
    handleBackPress: () => void;
    loading: boolean;
    hasSubCategories: boolean;
    isCategoryActive: boolean;
    selectedFilter: string;
    handleFilterChange: (id: string) => void;
    subCategories: any[];
    selectedSubCategory: string;
    handleSubCategorySelect: (sub: any) => void;
    config: any;
    handleRestaurantPress: (r: any) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    handleSearch: () => void;
    onClearSearch: () => void;
    t: any;
    showComingSoon: boolean;
    loadingVendors: boolean;
}

const HeaderContent = memo(({
    headerTitle,
    headerIcon,
    handleBackPress,
    loading,
    hasSubCategories,
    isCategoryActive,
    selectedFilter,
    handleFilterChange,
    subCategories,
    selectedSubCategory,
    handleSubCategorySelect,
    config,
    handleRestaurantPress,
    searchQuery,
    setSearchQuery,
    handleSearch,
    onClearSearch,
    t,
    showComingSoon,
    loadingVendors,
}: HeaderContentProps) => {
    const { theme } = useAppTheme();

    return (
        <>
            <CategoryHeader
                title={headerTitle}
                icon={headerIcon}
                onBackPress={handleBackPress}
            />

            {isCategoryActive && !showComingSoon && (
                <SearchBar
                    placeholder={t('search_placeholder_category', { category: headerTitle.toLowerCase() })}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmit={handleSearch}
                    onClear={onClearSearch}
                />
            )}

            {loading ? (
                <View style={styles.comingSoonContainer}>
                    <ActivityIndicator size="large" color={theme.brand} />
                </View>
            ) : !showComingSoon ? (
                <>
                    <FilterTabs
                        selectedFilter={selectedFilter}
                        onFilterChange={handleFilterChange}
                    />

                    {hasSubCategories && (
                        <SubCategoryChips
                            subCategories={subCategories}
                            selectedId={selectedSubCategory}
                            onSelect={handleSubCategorySelect}
                        />
                    )}
                    <BrowseSection
                        mainCategory={headerTitle}
                        restaurants={config.restaurants}
                        onRestaurantPress={handleRestaurantPress}
                    />
                </>
            ) : (
                <View style={styles.comingSoonContainer}>
                    <Image
                        source={require('../../assets/images/comingsoon.png')}
                        style={styles.comingSoonImage}
                        resizeMode="contain"
                    />
                    <Text style={[styles.comingSoonTitle, { color: theme.text }]}>
                        {t('coming_soon_title')} <Text style={[styles.comingSoonTitleGreen, { color: theme.brand }]}>{t('coming_soon_accent')}</Text> 🚀
                    </Text>
                    <Text style={[styles.comingSoonSubtitle, { color: theme.mutedText }]}>
                        {t('coming_soon_subtitle')}
                    </Text>
                </View>
            )}
        </>
    );
});

HeaderContent.displayName = 'HeaderContent';

export default function CategoryScreen() {
    const { id, name, englishName } = useLocalSearchParams<{ id: string; name?: string; englishName?: string }>();
    const router = useRouter();
    const { t, i18n } = useTranslation();
    const { isDark, theme } = useAppTheme();
    const isArabic = i18n.language === 'ar';

    const [categoryData, setCategoryData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedFilter, setSelectedFilter] = useState('all');
    const [selectedSubCategory, setSelectedSubCategory] = useState('all');
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const [vendors, setVendors] = useState<any[]>([]);
    const [loadingVendors, setLoadingVendors] = useState(false);
    const lastDocRef = useRef<any>(null);
    const [isListEnd, setIsListEnd] = useState(false);
    const flashListRef = useRef<any>(null);
    const scrollOffsetRef = useRef(0);
    const shouldRestoreScrollRef = useRef(false);

    // Get category configuration or use default
    const config = categoryConfig[id?.toLowerCase() || ''] || {
        ...defaultConfig,
        title: name || defaultConfig.title,
    };

    // Derived state for subcategories existence
    const hasSubCategories = (categoryData?.subcategories && categoryData.subcategories.length > 0) || (config.subCategories && config.subCategories.length > 0);
    const isCategoryActive = categoryData ? categoryData.isActive !== false : true;

    // Determine if we should show the "Coming Soon" UI
    // Only show for inactive categories, not when a filter/subcategory returns no results
    const showComingSoon = !isCategoryActive;
    const englishCategoryName = useMemo(() => {
        return categoryData?.nameEnglish || englishName || name || config.title || undefined;
    }, [categoryData?.nameEnglish, config.title, englishName, name]);

    const restoreFlashListScroll = useCallback(() => {
        if (!shouldRestoreScrollRef.current) return;
        shouldRestoreScrollRef.current = false;
        requestAnimationFrame(() => {
            flashListRef.current?.scrollToOffset({ offset: scrollOffsetRef.current, animated: true });
        });
    }, []);

    useEffect(() => {
        const fetchCategory = async () => {
            if (!id) return;
            try {
                const db = getFirestore();
                const docRef = doc(db, 'categories', id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setCategoryData(docSnap.data());
                }
            } catch (error) {
                logger.error("Error fetching category:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCategory();
    }, [id]);

    const fetchVendors = useCallback(async (isNew = false) => {
        if (loadingVendors || (isListEnd && !isNew) || !isCategoryActive) return;

        setLoadingVendors(true);
        try {
            if (!englishCategoryName) {
                setIsListEnd(true);
                setVendors([]);
                return;
            }

            const db = getFirestore();
            const vendorsRef = collection(db, 'vendors');
            const PAGE_SIZE = 10;
            const activeSearchQuery = searchQuery.trim().toLowerCase();

            const baseConstraints: any[] = [];

            if (selectedSubCategory !== 'all' && !activeSearchQuery) {
                baseConstraints.push(where('subcategory', 'array-contains', selectedSubCategory));
            } else {
                baseConstraints.push(where('mainCategory', '==', englishCategoryName));
            }

            if (activeSearchQuery) {
                baseConstraints.push(where('searchTokens', 'array-contains', activeSearchQuery));
            }

            if (selectedFilter === 'trending') {
                baseConstraints.push(where('isTrending', '==', true));
            } else if (selectedFilter === 'cashbacks') {
                baseConstraints.push(where('xcard', '==', true));
            }

            let q;
            if (isNew) {
                q = query(vendorsRef, ...baseConstraints, orderBy('createdAt', 'desc') as any, limit(PAGE_SIZE) as any);
            } else {
                const startAfterDoc = lastDocRef.current;
                q = startAfterDoc
                    ? query(vendorsRef, ...baseConstraints, orderBy('createdAt', 'desc') as any, startAfter(startAfterDoc) as any, limit(PAGE_SIZE) as any)
                    : query(vendorsRef, ...baseConstraints, orderBy('createdAt', 'desc') as any, limit(PAGE_SIZE) as any);
            }

            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const fetchedVendors = querySnapshot.docs.map((doc: any) => ({
                    id: doc.id,
                    ...doc.data(),
                    xcard: doc.data().xcard || false
                }));

                if (isNew) {
                    setVendors(fetchedVendors);
                } else {
                    setVendors(prev => [...prev, ...fetchedVendors]);
                }

                restoreFlashListScroll();

                lastDocRef.current = querySnapshot.docs[querySnapshot.docs.length - 1];
                setIsListEnd(querySnapshot.docs.length < PAGE_SIZE);
            } else {
                setIsListEnd(true);
                if (isNew) {
                    setVendors([]);
                    restoreFlashListScroll();
                }
            }
        } catch (error) {
            logger.error("Error fetching vendors:", error);
        } finally {
            setLoadingVendors(false);
        }
    }, [loadingVendors, isListEnd, isCategoryActive, selectedSubCategory, selectedFilter, englishCategoryName, searchQuery, restoreFlashListScroll]);

    const fetchVendorsRef = useRef(fetchVendors);
    useEffect(() => {
        fetchVendorsRef.current = fetchVendors;
    }, [fetchVendors]);

    // Initial fetch or filter change
    useEffect(() => {
    if (!loading && isCategoryActive) {
        lastDocRef.current = null;
        setIsListEnd(false);
        fetchVendorsRef.current(true);
    }
}, [selectedSubCategory, selectedFilter, loading, isCategoryActive, englishCategoryName, searchQuery]);

    const handleLoadMore = () => {
        if (!loadingVendors && !isListEnd) {
            fetchVendors(false);
        }
    };

    const handleBackPress = useCallback(() => {
        router.back();
    }, [router]);

    const handleFilterChange = useCallback((filterId: string) => {
        setSelectedFilter(filterId);
        requestAnimationFrame(() => {
            flashListRef.current?.scrollToOffset({ offset: 0, animated: false });
        });
    }, []);

    const handleSearch = useCallback(() => {
        const nextQuery = searchInput.trim().toLowerCase();
        if (nextQuery) {
            setSelectedSubCategory('all');
        }
        lastDocRef.current = null;
        setIsListEnd(false);
        setSearchQuery(nextQuery);
        Keyboard.dismiss();
    }, [searchInput]);

    const handleClearSearch = useCallback(() => {
        setSearchInput('');
        lastDocRef.current = null;
        setIsListEnd(false);
        setSearchQuery('');
    }, []);

    const handleSubCategorySelect = useCallback((subCategory: { id: string; name: string; icon: any }) => {
        if (subCategory.id === 'all' && selectedSubCategory !== 'all') {
            shouldRestoreScrollRef.current = true;
        }

        setSelectedSubCategory(subCategory.id);
    }, [selectedSubCategory]);

    const handleFlashListScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
    }, []);

    const handleRestaurantPress = useCallback((restaurant: { id: string; name: string }) => {
        logger.log('Restaurant pressed:', restaurant.name);
    }, []);


    const subCategories = useMemo(() => {
        const fetchedSubCategories = categoryData?.subcategories?.map((sub: any) => ({
            id: sub.nameEnglish,
            name: isArabic ? (sub.nameArabic || sub.nameAr || sub.nameEnglish) : sub.nameEnglish,
            icon: sub.imageUrl
        })) || config.subCategories;

        return [
            { id: 'all', name: t('all'), icon: require('../../assets/images/all.svg') },
            ...fetchedSubCategories
        ];
    }, [categoryData, config.subCategories, isArabic, t]);

    const headerTitle = (isArabic ? (categoryData?.nameArabic || categoryData?.nameAr || name) : null) || categoryData?.nameEnglish || name || config.title;
    const headerIcon = categoryData?.imageUrl || config.icon;

    const renderFooter = () => (
        <View style={{ height: 40, alignItems: 'center', justifyContent: 'center' }}>
            {loadingVendors && <ActivityIndicator size="small" color={theme.brand} />}
        </View>
    );

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top']}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
            {showComingSoon && !loading && (
                <View style={styles.backgroundIconsOverlay} pointerEvents="none">
                    {BACKGROUND_ICONS.map((icon, i) => (
                        <Ionicons
                            key={i}
                            name={icon.name}
                            size={icon.size}
                            color={icon.color === '#53C268' ? theme.brand : theme.iconMuted}
                            style={{
                                position: 'absolute',
                                top: icon.top as any,
                                left: icon.left as any,
                                transform: [{ rotate: icon.rotation }],
                                opacity: 0.3,
                            }}
                        />
                    ))}
                </View>
            )}
            {!loading && isCategoryActive ? (
                <FlashList
                    ref={flashListRef}
                    data={vendors}
                    keyExtractor={(item) => item.id}
                    numColumns={2}
                    contentContainerStyle={styles.contentContainer}
                    showsVerticalScrollIndicator={false}
                    onScroll={handleFlashListScroll}
                    scrollEventThrottle={16}
                    ListHeaderComponent={
                        <HeaderContent
                            headerTitle={headerTitle}
                            headerIcon={headerIcon}
                            handleBackPress={handleBackPress}
                            loading={loading}
                            hasSubCategories={hasSubCategories}
                            isCategoryActive={isCategoryActive}
                            selectedFilter={selectedFilter}
                            handleFilterChange={handleFilterChange}
                            subCategories={subCategories}
                            selectedSubCategory={selectedSubCategory}
                            handleSubCategorySelect={handleSubCategorySelect}
                            config={config}
                            handleRestaurantPress={handleRestaurantPress}
                            searchQuery={searchInput}
                            setSearchQuery={setSearchInput}
                            handleSearch={handleSearch}
                            onClearSearch={handleClearSearch}
                            t={t}
                            showComingSoon={showComingSoon}
                            loadingVendors={loadingVendors}
                        />
                    }
                    ListFooterComponent={renderFooter}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    renderItem={({ item, index }) => (
                        <View style={[
                            {
                                paddingLeft: index % 2 === 0 ? 20 : 8,
                                paddingRight: index % 2 === 0 ? 8 : 20
                            }
                        ]}>
                            <RestaurantCard
                                id={item.id}
                                name={isArabic ? (item.nameAr || item.nameEn || item.name || 'Vendor') : (item.nameEn || item.name || 'Vendor')}
                                cashbackText={isArabic ? (item.shortDescriptionAR || item.shortDescriptionAr || item.descriptionAr || item.brandDescription || '') : (item.shortDescription || item.brandDescription || item.descriptionEn || '')}
                                isTrending={item.isTrending}
                                isTopRated={item.isTopRated}
                                imageUri={item.coverImage}
                                logoUri={item.profilePicture}
                                xcardEnabled={item.xcard}
                                onPress={() => router.push({ pathname: '/vendor/[id]', params: { id: item.id } })}
                            />
                        </View>
                    )}
                />
            ) : (
                <ScrollView
                    style={[styles.container, { backgroundColor: theme.background }]}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.contentContainer}
                >
                    <HeaderContent
                        headerTitle={headerTitle}
                        headerIcon={headerIcon}
                        handleBackPress={handleBackPress}
                        loading={loading}
                        hasSubCategories={hasSubCategories}
                        isCategoryActive={isCategoryActive}
                        selectedFilter={selectedFilter}
                        handleFilterChange={handleFilterChange}
                        subCategories={subCategories}
                        selectedSubCategory={selectedSubCategory}
                        handleSubCategorySelect={handleSubCategorySelect}
                        config={config}
                        handleRestaurantPress={handleRestaurantPress}
                        searchQuery={searchInput}
                        setSearchQuery={setSearchInput}
                        handleSearch={handleSearch}
                        onClearSearch={handleClearSearch}
                        t={t}
                        showComingSoon={showComingSoon}
                        loadingVendors={loadingVendors}
                    />
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    contentContainer: {
        paddingBottom: 20,
    },
    // New FlashList spacing style
    flatListContent: {
        paddingBottom: 20,
    },
    backgroundIconsOverlay: {
        ...StyleSheet.absoluteFill,
        zIndex: 0,
    },
    comingSoonContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        minHeight: Dimensions.get('window').height - 200,
    },
    comingSoonImage: {
        width: 200,
        height: 200,
        marginBottom: 20,
        zIndex: 10,
    },
    comingSoonTitle: {
        fontSize: 28,
        fontFamily: Typography.poppins.semiBold,
        textAlign: 'center',
        marginBottom: 12,
        zIndex: 10,
    },
    comingSoonTitleGreen: {
        fontStyle: 'italic',
    },
    comingSoonSubtitle: {
        fontSize: 16,
        fontFamily: Typography.poppins.medium,
        textAlign: 'center',
        lineHeight: 24,
        zIndex: 10,
    },
    loadingContainer: {
        padding: 20,
        alignItems: 'center',
        width: '100%',
    },
});
