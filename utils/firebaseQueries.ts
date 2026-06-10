import {
    collection,
    doc,
    documentId,
    FirebaseFirestoreTypes,
    getDoc,
    getDocs,
    getFirestore,
    limit,
    orderBy,
    query,
    startAfter,
    where,
} from '@react-native-firebase/firestore';
import { getCachedVendorDisplayFields } from './vendorDisplayCache';

export type FirestorePage<T> = {
    items: T[];
    lastDoc: FirebaseFirestoreTypes.QueryDocumentSnapshot | null;
    lastDocId: string | null;
    reachedEnd: boolean;
};

export type MappedPage<T, Cursor> = {
    items: T[];
    nextCursor: Cursor | null;
    reachedEnd: boolean;
};

export type VendorQueryItem = {
    id: string;
    [key: string]: unknown;
};

export type CategoryVendorCursor = {
    createdAt: unknown;
    id: string;
};

export type CategoryVendorPageOptions = {
    categoryName: string;
    searchQuery: string;
    selectedFilter: string;
    selectedSubCategory: string;
    pageSize: number;
    cursor: CategoryVendorCursor | null;
};

export type SavedOfferItem = {
    id: string;
    type?: string;
    vendorId: string;
    offerIndex: number;
    vendorName?: string;
    vendorNameAr?: string;
    vendorLogo?: string;
    vendorCoverImage?: string;
    titleEn?: string;
    titleAr?: string;
    descriptionEn?: string;
    descriptionAr?: string;
    discountType?: string;
    discountValue?: number | null;
    xcard?: boolean;
};

export type RedemptionHistoryTransaction = {
    id: string;
    type: string;
    vendorId: string;
    vendorName: string;
    vendorNameAr?: string;
    totalAmount: number;
    discountAmount?: number;
    finalAmount?: number;
    offer?: {
        discountType?: string;
        discountValue?: number;
        titleEn?: string;
        titleAr?: string;
    } | null;
    createdAt?: any;
    offerAmount?: number;
    paidAmount?: number;
    amount?: number;
    timestamp?: any;
};

export type RedemptionHistoryResult = {
    transactions: RedemptionHistoryTransaction[];
    vendorLogos: Record<string, string>;
};

export type WalletBrandQueryItem = {
    id: string;
    name: string;
    nameAr?: string;
    logo: string | null;
    backgroundColor: string;
    loyalty: any[];
};

export type MapLocationQueryItem = {
    id: string;
    vendorId: string;
    locationId: string;
    name?: string | null;
    nameAr?: string | null;
    vendorName?: string | null;
    vendorNameAr?: string | null;
    branchName?: string | null;
    branchNameAr?: string | null;
    phoneNumber?: string | null;
    address?: string | null;
    addressAr?: string | null;
    latitude: number;
    longitude: number;
    geohash?: string | null;
    geohash4?: string | null;
    geohash5?: string | null;
    geohash6?: string | null;
    mainCategory?: string | null;
    profilePicture?: string | null;
    xcard?: boolean;
    offerTypes?: string[];
    hasBuyOneGetOne?: boolean;
    hasStudentDeal?: boolean;
    openingHours?: any;
    searchTokens?: string[];
    firstOffer?: {
        titleEn?: string;
        titleAr?: string;
        discountType?: string;
    } | null;
    isPrimary?: boolean;
};

export async function fetchCmsDocument<T = Record<string, any>>(documentId: string): Promise<T | null> {
    const db = getFirestore();
    const docSnap = await getDoc(doc(db, 'cms', documentId));
    return docSnap.exists() ? (docSnap.data() as T) : null;
}

export async function fetchCategories(isArabic: boolean) {
    const db = getFirestore();
    const categoriesQuery = query(
        collection(db, 'categories'),
        orderBy('order', 'asc')
    );

    const snapshot = await getDocs(categoriesQuery);
    return snapshot.docs.map((docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            name: isArabic ? (data.nameArabic || data.nameAr || data.nameEnglish) : data.nameEnglish,
            englishName: data.nameEnglish,
            image: data.imageUrl,
        };
    });
}

export async function fetchCategory(categoryId: string) {
    const db = getFirestore();
    const docSnap = await getDoc(doc(db, 'categories', categoryId));
    return docSnap.exists() ? docSnap.data() : null;
}

export async function fetchVendor(vendorId: string) {
    const db = getFirestore();
    const docSnap = await getDoc(doc(db, 'vendors', vendorId));
    return docSnap.exists() ? { id: docSnap.id, data: docSnap.data() } : null;
}

export async function fetchVendorRoute(vendorIdOrName: string, isArabic: boolean) {
    const db = getFirestore();
    const directVendor = await fetchVendor(vendorIdOrName);
    if (directVendor) {
        return {
            vendorId: directVendor.id,
            vendorData: directVendor.data,
        };
    }

    const vendorsRef = collection(db, 'vendors');
    const nameSnap = await getDocs(query(vendorsRef, where('name', '==', vendorIdOrName), limit(1)));
    if (!nameSnap.empty) {
        const foundDoc = nameSnap.docs[0];
        return {
            vendorId: foundDoc.id,
            vendorData: foundDoc.data(),
        };
    }

    if (isArabic) {
        const nameArSnap = await getDocs(query(vendorsRef, where('nameAr', '==', vendorIdOrName), limit(1)));
        if (!nameArSnap.empty) {
            const foundDoc = nameArSnap.docs[0];
            return {
                vendorId: foundDoc.id,
                vendorData: foundDoc.data(),
            };
        }
    }

    return null;
}

export async function fetchSavedOffers(userId: string, pageSize = 50): Promise<SavedOfferItem[]> {
    const db = getFirestore();
    const savedRef = collection(db, 'students', userId, 'savedItems');
    const savedQuery = query(savedRef, orderBy('createdAt', 'desc'), limit(pageSize));
    const snapshot = await getDocs(savedQuery);

    return snapshot.docs
        .map((docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot) => ({
            id: docSnap.id,
            ...docSnap.data(),
        }))
        .filter((item: SavedOfferItem) => !item.type || item.type === 'offer') as SavedOfferItem[];
}

export async function fetchSavedOfferIds(userId: string, vendorId: string): Promise<Set<string>> {
    const db = getFirestore();
    const savedRef = collection(db, 'students', userId, 'savedItems');
    const savedQuery = query(savedRef, where('vendorId', '==', vendorId));
    const snapshot = await getDocs(savedQuery);
    return new Set<string>(snapshot.docs.map((docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot) => docSnap.id));
}

export async function fetchSavedMapPlaceIds(userId: string, pageSize = 100): Promise<Set<string>> {
    const db = getFirestore();
    const savedRef = collection(db, 'students', userId, 'savedItems');
    const savedQuery = query(savedRef, where('type', '==', 'mapPlace'), limit(pageSize));
    const snapshot = await getDocs(savedQuery);
    return new Set<string>(snapshot.docs.map((docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot) => docSnap.id));
}

export async function fetchRedemptionHistory(userId: string, pageSize = 10): Promise<RedemptionHistoryResult> {
    const db = getFirestore();
    const historyQuery = query(
        collection(db, 'transactions'),
        where('userId', '==', userId),
        where('type', 'in', ['offer', 'online_redemption']),
        orderBy('createdAt', 'desc'),
        limit(pageSize)
    );

    const snap = await getDocs(historyQuery);
    const transactions: RedemptionHistoryTransaction[] = [];
    const uniqueVendorIds = new Set<string>();

    snap.forEach((docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
        const data = docSnap.data();
        transactions.push({
            id: docSnap.id,
            ...data,
        } as RedemptionHistoryTransaction);

        if (typeof data.vendorId === 'string' && data.vendorId.length > 0) {
            uniqueVendorIds.add(data.vendorId);
        }
    });

    const vendorLogos: Record<string, string> = {};
    await Promise.all(
        Array.from(uniqueVendorIds).map(async (vendorId) => {
            const vendorDisplay = await getCachedVendorDisplayFields(vendorId);
            vendorLogos[vendorId] = vendorDisplay?.profilePicture || '';
        })
    );

    return {
        transactions,
        vendorLogos,
    };
}

export async function fetchMapLocations() {
    const db = getFirestore();
    const locationsSnap = await getDoc(doc(db, 'maps', 'locations'));
    return locationsSnap.exists() ? locationsSnap.data() : null;
}

export async function fetchMapLocationsByPrefixes(
    precision: 4 | 5 | 6,
    prefixes: string[],
    perPrefixLimit = 80,
): Promise<MapLocationQueryItem[]> {
    const normalizedPrefixes = Array.from(new Set(
        prefixes
            .map((prefix) => prefix.trim())
            .filter((prefix) => prefix.length === precision)
    ));

    if (!normalizedPrefixes.length) return [];

    const db = getFirestore();
    const fieldName = `geohash${precision}`;
    const byId = new Map<string, MapLocationQueryItem>();

    await Promise.all(normalizedPrefixes.map(async (prefix) => {
        let cursor: FirebaseFirestoreTypes.QueryDocumentSnapshot | null = null;

        do {
            const constraints: any[] = [
                where(fieldName, '==', prefix),
                orderBy(documentId()),
            ];
            if (cursor) constraints.push(startAfter(cursor));
            constraints.push(limit(perPrefixLimit));

            const snapshot = await getDocs(query(collection(db, 'mapLocations'), ...constraints));
            snapshot.docs.forEach((docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
                const data = docSnap.data();
                byId.set(docSnap.id, {
                    id: docSnap.id,
                    ...data,
                } as MapLocationQueryItem);
            });
            cursor = snapshot.docs.length === perPrefixLimit
                ? snapshot.docs[snapshot.docs.length - 1]
                : null;
        } while (cursor);
    }));

    return Array.from(byId.values()).sort((a, b) => a.id.localeCompare(b.id));
}

export async function searchMapLocations(searchQuery: string, pageSize = 25): Promise<MapLocationQueryItem[]> {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return [];

    const db = getFirestore();
    const snapshot = await getDocs(query(
        collection(db, 'mapLocations'),
        where('searchTokens', 'array-contains', normalizedQuery),
        limit(pageSize)
    ));

    return snapshot.docs.map((docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot) => ({
        id: docSnap.id,
        ...docSnap.data(),
    } as MapLocationQueryItem));
}

export async function fetchStudentProfile(userId: string) {
    const db = getFirestore();
    const docSnap = await getDoc(doc(db, 'students', userId));
    return docSnap.exists() ? docSnap.data() : null;
}

export async function fetchVendorSearchPage(
    searchQuery: string,
    pageSize: number,
    cursorId: string | null,
): Promise<MappedPage<VendorQueryItem, string>> {
    const db = getFirestore();
    const constraints: any[] = [
        where('searchTokens', 'array-contains', searchQuery),
        orderBy(documentId()),
    ];
    if (cursorId) constraints.push(startAfter(cursorId));
    constraints.push(limit(pageSize));

    const snapshot = await getDocs(query(collection(db, 'vendors'), ...constraints));
    const items = snapshot.docs.map((docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot) => ({
        id: docSnap.id,
        ...docSnap.data(),
    }));

    return {
        items,
        nextCursor: items.length === pageSize ? items[items.length - 1]?.id || null : null,
        reachedEnd: items.length < pageSize,
    };
}

export async function fetchCategoryVendorsPage({
    categoryName,
    searchQuery,
    selectedFilter,
    selectedSubCategory,
    pageSize,
    cursor,
}: CategoryVendorPageOptions): Promise<MappedPage<VendorQueryItem, CategoryVendorCursor>> {
    const db = getFirestore();
    const constraints: any[] = [];

    if (selectedSubCategory !== 'all' && !searchQuery) {
        constraints.push(where('subcategory', 'array-contains', selectedSubCategory));
    } else {
        constraints.push(where('mainCategory', '==', categoryName));
    }
    if (searchQuery) constraints.push(where('searchTokens', 'array-contains', searchQuery));
    if (selectedFilter === 'trending') constraints.push(where('isTrending', '==', true));
    if (selectedFilter === 'cashbacks') constraints.push(where('xcard', '==', true));

    constraints.push(
        orderBy('createdAt', 'desc'),
        orderBy(documentId(), 'desc')
    );
    if (cursor) constraints.push(startAfter(cursor.createdAt, cursor.id));
    constraints.push(limit(pageSize));

    const snapshot = await getDocs(query(collection(db, 'vendors'), ...constraints));
    const items = snapshot.docs.map((docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot) => ({
        id: docSnap.id,
        ...docSnap.data(),
        xcard: docSnap.data().xcard || false,
    }));
    const lastItem = items[items.length - 1];

    return {
        items,
        nextCursor: items.length === pageSize && lastItem
            ? { createdAt: lastItem.createdAt, id: lastItem.id }
            : null,
        reachedEnd: items.length < pageSize,
    };
}

export async function fetchXcardBrandsPage(
    searchQuery: string,
    pageSize: number,
    startAfterDoc: FirebaseFirestoreTypes.QueryDocumentSnapshot | null,
    unknownLabel: string,
): Promise<FirestorePage<WalletBrandQueryItem>> {
    const db = getFirestore();
    let brandsQuery = collection(db, 'vendors').where('xcard', '==', true);

    if (searchQuery.length > 0) {
        brandsQuery = brandsQuery.where('searchTokens', 'array-contains', searchQuery);
    }

    brandsQuery = startAfterDoc
        ? brandsQuery.startAfter(startAfterDoc).limit(pageSize)
        : brandsQuery.limit(pageSize);

    const snapshot = await getDocs(brandsQuery);
    const items: WalletBrandQueryItem[] = snapshot.docs.map((docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            name: data.name || unknownLabel,
            nameAr: data.nameAr || undefined,
            logo: data.profilePicture || data.logoUrl || data.imageUrl || null,
            backgroundColor: '#F0F0F0',
            loyalty: data.loyalty || [],
        };
    });
    const lastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

    return {
        items,
        lastDoc,
        lastDocId: lastDoc?.id ?? null,
        reachedEnd: snapshot.docs.length < pageSize,
    };
}
