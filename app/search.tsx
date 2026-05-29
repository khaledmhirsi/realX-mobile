import Ionicons from '@expo/vector-icons/Ionicons';
import { collection, getDocs, getFirestore, query, where, limit, startAfter } from '@react-native-firebase/firestore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { logger } from '../utils/logger';
import {
    ActivityIndicator,
    FlatList,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView} from 'react-native-safe-area-context';
import { RestaurantCard } from '../components/category';
import { useAppTheme } from '../context/AppThemeContext';
import { Typography } from '../constants/Typography';
import { triggerSubtleHaptic } from '../utils/haptics';

export default function SearchScreen() {
    const { q } = useLocalSearchParams<{ q: string }>();
    const router = useRouter();
    const { i18n } = useTranslation();
    const { isDark, theme } = useAppTheme();
    const isArabic = i18n.language === 'ar';

    const [searchQuery, setSearchQuery] = useState(q || '');
    const [committedQuery, setCommittedQuery] = useState((q || '').trim().toLowerCase());
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const lastDocRef = useRef<any>(null);
    const [isListEnd, setIsListEnd] = useState(false);

    // Fetch vendors with pagination — only when user has typed a query
    const fetchVendors = useCallback(async (isNew = false, currentQuery?: string) => {
        const trimmedQuery = (currentQuery ?? committedQuery).trim().toLowerCase();

        if (!trimmedQuery) {
            setResults([]);
            lastDocRef.current = null;
            setIsListEnd(true);
            setLoading(false);
            setLoadingMore(false);
            return;
        }

        if (loading || (loadingMore && !isNew) || (isListEnd && !isNew)) return;

        if (isNew) {
            setLoading(true);
            lastDocRef.current = null;
            setIsListEnd(false);
        } else {
            setLoadingMore(true);
        }

        try {
            const db = getFirestore();
            const vendorsRef = collection(db, 'vendors');
            const PAGE_SIZE = 20;

            const constraints: any[] = [
                where('searchTokens', 'array-contains', trimmedQuery),
            ];

            let q;
            if (isNew) {
                q = query(vendorsRef, ...constraints, limit(PAGE_SIZE) as any);
            } else {
                const startAfterDoc = lastDocRef.current;
                q = startAfterDoc
                    ? query(vendorsRef, ...constraints, startAfter(startAfterDoc) as any, limit(PAGE_SIZE) as any)
                    : query(vendorsRef, ...constraints, limit(PAGE_SIZE) as any);
            }

            const snapshot = await getDocs(q);

            // Map vendor documents directly
            const fetched: any[] = snapshot.docs.map((docSnap: any) => ({
                id: docSnap.id,
                ...docSnap.data(),
            }));

            if (isNew) {
                setResults(fetched);
            } else {
                setResults(prev => [...prev, ...fetched]);
            }

            if (snapshot.docs.length > 0) {
                lastDocRef.current = snapshot.docs[snapshot.docs.length - 1];
                setIsListEnd(snapshot.docs.length < PAGE_SIZE);
            } else {
                setIsListEnd(true);
            }
        } catch (error) {
            logger.error('Error fetching vendors for search:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [loading, loadingMore, isListEnd, committedQuery]);

    const fetchVendorsRef = useRef(fetchVendors);
    useEffect(() => {
        fetchVendorsRef.current = fetchVendors;
    }, [fetchVendors]);

    useEffect(() => {
        fetchVendorsRef.current(true, committedQuery);
    }, [committedQuery]);

    const handleSubmitSearch = useCallback(() => {
        const trimmed = searchQuery.trim().toLowerCase();
        setCommittedQuery(trimmed);
    }, [searchQuery]);

    const handleVendorPress = useCallback(
        (vendor: any) => {
            router.push({ pathname: '/vendor/[id]', params: { id: vendor.id } });
        },
        [router]
    );

    const handleLoadMore = () => {
        if (!isListEnd && !loadingMore && !loading) {
            fetchVendors(false);
        }
    };

    const renderItem = useCallback(
        ({ item, index }: { item: any; index: number }) => (
            <View
                style={[
                    styles.cardWrapper,
                    {
                        paddingLeft: index % 2 === 0 ? 20 : 8,
                        paddingRight: index % 2 === 0 ? 8 : 20,
                    },
                ]}
            >
                <RestaurantCard
                    id={item.id}
                    name={isArabic ? (item.nameAr || item.nameEn || item.name || 'Vendor') : (item.nameEn || item.name || 'Vendor')}
                    cashbackText={isArabic ? (item.shortDescriptionAR || item.shortDescriptionAr || item.descriptionAr || item.brandDescription || '') : (item.shortDescription || item.brandDescription || item.descriptionEn || '')}
                    isTrending={item.isTrending}
                    isTopRated={item.isTopRated}
                    imageUri={item.coverImage}
                    logoUri={item.profilePicture}
                    xcardEnabled={item.xcard}
                    onPress={() => handleVendorPress(item)}
                />
            </View>
        ),
        [handleVendorPress, isArabic]
    );

    const renderFooter = () => {
        if (!loadingMore) return <View style={{ height: 20 }} />;
        return (
            <View style={styles.loaderFooter}>
                <ActivityIndicator size="small" color={theme.brand} />
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top']}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={[styles.backButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}
                    onPress={() => {
                        triggerSubtleHaptic();
                        router.back();
                    }}
                    activeOpacity={0.8}
                >
                    <Ionicons name="arrow-back" size={22} color={theme.icon} />
                </TouchableOpacity>

                <View style={[styles.searchContainer, { backgroundColor: theme.cardMuted, borderColor: theme.border }]}>
                    <Ionicons name="search" size={18} color={theme.brand} style={styles.searchIcon} />
                    <TextInput
                        style={[styles.searchInput, { color: theme.text }]}
                        placeholder="Search for offers..."
                        placeholderTextColor={theme.inputPlaceholder}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        returnKeyType="search"
                        onSubmitEditing={handleSubmitSearch}
                        autoFocus
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity
                            onPress={() => {
                                triggerSubtleHaptic();
                                setSearchQuery('');
                                setCommittedQuery('');
                            }}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="close-circle" size={18} color={theme.iconMuted} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Results */}
            {loading ? (
                <View style={styles.centeredContainer}>
                    <ActivityIndicator size="large" color={theme.brand} />
                </View>
            ) : results.length === 0 ? (
                <View style={styles.centeredContainer}>
                    <Text style={[{ color: theme.text, fontFamily: Typography.poppins.medium }, styles.emptyEmoji]}>🔍</Text>
                    <Text style={[{ color: theme.text, fontFamily: Typography.poppins.medium }, styles.emptyTitle]}>
                        {committedQuery ? 'No offers found' : 'Search for offers'}
                    </Text>
                    <Text style={[{ color: theme.mutedText, fontFamily: Typography.poppins.medium }, styles.emptySubtitle]}>
                        {committedQuery
                            ? `We couldn't find any offers matching "${committedQuery}"`
                            : 'Type a keyword to find deals and discounts'}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={results}
                    keyExtractor={(item) => item.id}
                    numColumns={2}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={renderFooter}
                    ListHeaderComponent={
                        <Text style={[{ color: theme.mutedText, fontFamily: Typography.poppins.medium }, styles.resultCount]}>
                            {results.length} {results.length === 1 ? 'result' : 'results'}
                        </Text>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 24,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderWidth: 1,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        fontFamily: Typography.poppins.medium,
        padding: 0,
    },
    centeredContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyEmoji: {
        fontSize: 60,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontFamily: Typography.poppins.semiBold,
        textAlign: 'center',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 15,
        fontFamily: Typography.poppins.medium,
        textAlign: 'center',
        lineHeight: 22,
    },
    resultCount: {
        fontSize: 14,
        fontFamily: Typography.poppins.medium,
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 16,
    },
    listContent: {
        paddingBottom: 40,
    },
    cardWrapper: {
        flex: 1,
        marginBottom: 16,
    },
    loaderFooter: {
        paddingVertical: 20,
        alignItems: 'center',
    },
});
