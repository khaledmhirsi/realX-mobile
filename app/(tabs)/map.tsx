import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth } from '@react-native-firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  where,
} from '@react-native-firebase/firestore';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Supercluster, { ClusterFeature, PointFeature } from 'supercluster';
import PhonkText from '../../components/PhonkText';
import { logger } from '../../utils/logger';
import { Colors } from '../../constants/Colors';
import { Typography } from '../../constants/Typography';
import {
  DOHA_CENTER,
  haversineDistanceKm,
  isInQatar,
  isValidLatLng,
  LatLng,
  QATAR_BOUNDS,
  regionCacheKey,
  rememberRegionCacheKey,
  toGeohash
} from '../../utils/mapGeo';

function clampRegion(region: Region): Region {
  const minLatDelta = 0.05;
  const minLngDelta = 0.05;
  const maxLatDelta = 0.5;   // prevents zooming too far out
  const maxLngDelta = 0.5;
  const latDelta = Math.min(Math.max(region.latitudeDelta, minLatDelta), maxLatDelta);
  const lngDelta = Math.min(Math.max(region.longitudeDelta, minLngDelta), maxLngDelta);

  const halfLat = latDelta / 2;
  const halfLng = lngDelta / 2;

  let lat = region.latitude;
  let lng = region.longitude;

  if (lat - halfLat < QATAR_BOUNDS.minLatitude) lat = QATAR_BOUNDS.minLatitude + halfLat;
  if (lat + halfLat > QATAR_BOUNDS.maxLatitude) lat = QATAR_BOUNDS.maxLatitude - halfLat;
  if (lng - halfLng < QATAR_BOUNDS.minLongitude) lng = QATAR_BOUNDS.minLongitude + halfLng;
  if (lng + halfLng > QATAR_BOUNDS.maxLongitude) lng = QATAR_BOUNDS.maxLongitude - halfLng;

  return { latitude: lat, longitude: lng, latitudeDelta: latDelta, longitudeDelta: lngDelta };
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAP_GEOHASH_PRECISION = 5;
const MAP_RECENTS_KEY = 'realx.map.recentPlaces.v1';
const _DEFAULT_ZOOM = 11.5;
void _DEFAULT_ZOOM;

type VendorMapItem = {
  id: string;
  vendorId: string;
  locationId: string;
  name?: string;
  nameAr?: string;
  branchName?: string;
  branchNameAr?: string;
  address?: string;
  addressAr?: string;
  latitude: number;
  longitude: number;
  geohash: string;
  mainCategory?: string | null;
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
  distanceKm?: number;
};

type RegionCachePayload = {
  fetchedAt: number;
  vendors: VendorMapItem[];
};

const CATEGORY_COLORS: Record<string, string> = {
  food: '#FF7A00',
  restaurant: '#FF7A00',
  restaurants: '#FF7A00',
  cafe: '#A66A2C',
  cafes: '#A66A2C',
  coffee: '#A66A2C',
  gym: '#246BFE',
  gyms: '#246BFE',
  fitness: '#246BFE',
  salon: '#D93D8B',
  salons: '#D93D8B',
  beauty: '#D93D8B',
  services: '#5856D6',
  service: '#5856D6',
};

function normalizeFilterLabel(value?: string | null) {
  return (value || '').trim().toLowerCase();
}

function markerColorForVendor(vendor: VendorMapItem) {
  if (vendor.hasBuyOneGetOne || vendor.firstOffer?.discountType === 'buy1get1') return '#111111';
  if (vendor.xcard) return Colors.brandGreen;
  const category = normalizeFilterLabel(vendor.mainCategory);
  return CATEGORY_COLORS[category] || '#6C63FF';
}

function clusterColorForCount(pointCount: number) {
  if (pointCount >= 40) return '#111111';
  if (pointCount >= 15) return '#FF7A00';
  return Colors.brandGreen;
}


export default function MapScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isArabic = i18n.language === 'ar';
  const insets = useSafeAreaInsets();

  const mapRef = useRef<MapView>(null);
  const superclusterRef = useRef<Supercluster>(new Supercluster({ radius: 52, maxZoom: 14 }));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vendors, setVendors] = useState<VendorMapItem[]>([]);
  const [currentRegion, setCurrentRegion] = useState<Region>({
    latitude: DOHA_CENTER.latitude,
    longitude: DOHA_CENTER.longitude,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  });
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [_searchingNearby, setSearchingNearby] = useState(false);
  void _searchingNearby;
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [animatedSearchPlaceholder, setAnimatedSearchPlaceholder] = useState<string | null>(null);
  const [submittedSearchQuery, setSubmittedSearchQuery] = useState('');
  const [searchedVendorIds, setSearchedVendorIds] = useState<Set<string> | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMapVendor, setSelectedMapVendor] = useState<VendorMapItem | null>(null);
  const [savedMapPlaceIds, setSavedMapPlaceIds] = useState<Set<string>>(new Set());
  const [savingMapPlaceIds, setSavingMapPlaceIds] = useState<Set<string>>(new Set());
  const [selectedClusterPreview, setSelectedClusterPreview] = useState<VendorMapItem[]>([]);
  const [navigationTarget, setNavigationTarget] = useState<{ lat: number; lng: number; vendorId: string } | null>(null);
  const pendingSelectVendorIdRef = useRef<string | null>(null);
  const vendorsRef = useRef<VendorMapItem[]>([]);
  const params = useLocalSearchParams<{ vendorId?: string; locationId?: string; lat?: string; lng?: string }>();
  const isSearchActive = isSearchFocused || searchQuery.length > 0;
  const searchPlaceholder = t('search_placeholder');

  useEffect(() => {
    vendorsRef.current = vendors;
  }, [vendors]);

  useEffect(() => {
    const loadSavedMapPlaces = async () => {
      const user = getAuth().currentUser;
      if (!user) {
        setSavedMapPlaceIds(new Set());
        return;
      }

      try {
        const db = getFirestore();
        const savedRef = collection(db, 'students', user.uid, 'savedItems');
        const savedQuery = query(savedRef, where('type', '==', 'mapPlace'));
        const snapshot = await getDocs(savedQuery);
        setSavedMapPlaceIds(new Set(snapshot.docs.map((docSnap: any) => docSnap.id)));
      } catch (savedError) {
        logger.error('Error loading saved map places:', savedError);
      }
    };

    const unsubscribe = getAuth().onAuthStateChanged(() => {
      void loadSavedMapPlaces();
    });
    void loadSavedMapPlaces();
    return unsubscribe;
  }, []);

  useEffect(() => {
    let active = true;
    const trimmedQuery = submittedSearchQuery.trim().toLowerCase();

    if (!trimmedQuery) {
      setSearchedVendorIds(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const runSearch = async () => {
      try {
        const visibleVendors = Array.isArray(vendorsRef.current) ? vendorsRef.current : [];
        const matchingVendorIds = new Set<string>();

        visibleVendors.forEach((vendor) => {
          const haystack = [
            vendor.name,
            vendor.nameAr,
            vendor.branchName,
            vendor.branchNameAr,
            vendor.address,
            vendor.addressAr,
            ...(vendor.searchTokens || []),
          ]
            .filter(Boolean)
            .map((value) => String(value).toLowerCase());

          if (haystack.some((value) => value.includes(trimmedQuery))) {
            matchingVendorIds.add(vendor.vendorId);
          }
        });

        if (!active) return;

        setSearchedVendorIds(matchingVendorIds);

        if (matchingVendorIds.size > 0) {
          const matchedCoords = visibleVendors
            .filter((v: VendorMapItem) => matchingVendorIds.has(v.vendorId))
            .map((v: VendorMapItem) => ({ latitude: v.latitude, longitude: v.longitude }));

          if (matchedCoords.length > 0) {
            mapRef.current?.fitToCoordinates(matchedCoords, {
              edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
              animated: true,
            });
          }
        }
      } catch (err) {
        logger.error('Error fetching vendors for map search:', err);
      } finally {
        if (active) {
          setIsSearching(false);
        }
      }
    };

    void runSearch();

    return () => {
      active = false;
    };
  }, [submittedSearchQuery]);

  useEffect(() => {
    let frame: ReturnType<typeof setTimeout>;
    let index = 0;
    let direction: 'typing' | 'deleting' = 'typing';

    setAnimatedSearchPlaceholder(null);

    const tick = () => {
      if (direction === 'typing') {
        index += 1;
        setAnimatedSearchPlaceholder(searchPlaceholder.slice(0, index));

        if (index >= searchPlaceholder.length) {
          direction = 'deleting';
          frame = setTimeout(tick, 1400);
          return;
        }

        frame = setTimeout(tick, 80);
        return;
      }

      index -= 1;
      setAnimatedSearchPlaceholder(searchPlaceholder.slice(0, index));

      if (index <= 0) {
        direction = 'typing';
        frame = setTimeout(tick, 450);
        return;
      }

      frame = setTimeout(tick, 26);
    };

    frame = setTimeout(tick, 350);

    return () => clearTimeout(frame);
  }, [searchPlaceholder]);

  // In-memory vendor cache — accumulates across fetches so panning back is instant
  const vendorCacheRef = useRef<Map<string, VendorMapItem>>(new Map());
  const lastFetchedKeyRef = useRef<string | null>(null);
  const isClampingRef = useRef(false);
  const hasFetchedOnceRef = useRef(false);

  // Build GeoJSON points from vendors and load into supercluster
  const vendorPoints: PointFeature[] = useMemo(() => {
    let filteredVendors = vendors;
    if (searchedVendorIds) {
      filteredVendors = vendors.filter((v) => searchedVendorIds.has(v.vendorId));
    }

    return filteredVendors.map((vendor) => ({
      type: 'Feature' as const,
      id: vendor.id,
      properties: {
        cluster: false,
        id: vendor.id,
        vendorId: vendor.vendorId,
        name: vendor.name,
        nameAr: vendor.nameAr,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [vendor.longitude, vendor.latitude] as [number, number],
      },
    }));
  }, [vendors, searchedVendorIds]);

  // Get clusters for current viewport
  const clusters = useMemo(() => {
    const { longitudeDelta } = currentRegion;
    const safeLongitudeDelta =
      Number.isFinite(longitudeDelta) && longitudeDelta > 0 ? longitudeDelta : 0.05;
    const zoom = Math.max(0, Math.round(Math.log2(360 / safeLongitudeDelta)));
    const bounds: [number, number, number, number] = [
      currentRegion.longitude - currentRegion.longitudeDelta / 2,
      currentRegion.latitude - currentRegion.latitudeDelta / 2,
      currentRegion.longitude + currentRegion.longitudeDelta / 2,
      currentRegion.latitude + currentRegion.latitudeDelta / 2,
    ];

    // Load points before querying so supercluster has an initialized index.
    superclusterRef.current.load(vendorPoints);

    if (!vendorPoints.length) return [];
    return superclusterRef.current.getClusters(bounds, zoom);
  }, [currentRegion, vendorPoints]);

  useEffect(() => {
    const requestLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== Location.PermissionStatus.GRANTED) {
          setLocationEnabled(false);
          return;
        }

        setLocationEnabled(true);
        const position = await Location.getCurrentPositionAsync({});
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        setUserLocation(coords);
        mapRef.current?.animateCamera({
          center: { latitude: coords.latitude, longitude: coords.longitude },
          zoom: 15,
        });
      } catch (locationError) {
        logger.warn('Unable to read location permissions:', locationError);
      }
    };

    void requestLocation();
  }, []);

  const fetchVendorsForVisibleRegion = useCallback(async (center: LatLng, zoom: number) => {
    if (!getAuth().currentUser) {
      logger.warn('[Map] Skipping fetch — user not authenticated yet');
      setLoading(false);
      return;
    }

    setSearchingNearby(true);
    setError(null);

    const regionHash = toGeohash(center.latitude, center.longitude, MAP_GEOHASH_PRECISION);
    const cacheKey = regionCacheKey(regionHash);

    try {
      // Fast path: use in-memory cache (no async I/O)
      const cachedRaw = await AsyncStorage.getItem(cacheKey);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw) as RegionCachePayload;
        if (Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
          // Merge into in-memory cache
          cached.vendors.forEach((v) => vendorCacheRef.current.set(v.id, v));
          setLoading(false);
          setSearchingNearby(false);
          setVendors(sortVendorsByDistance(Array.from(vendorCacheRef.current.values()), userLocation));
          return;
        }
      }

      const db = getFirestore();
      const locationsSnap = await getDoc(doc(db, 'maps', 'locations'));

      if (!locationsSnap.exists()) {
        logger.warn('[Map] No maps/locations document found');
        setVendors([]);
        setLoading(false);
        setSearchingNearby(false);
        return;
      }

      const byId = new Map<string, VendorMapItem>();
      const locationsData = locationsSnap.data() as Record<string, any>;
      parseMapLocations(locationsData).forEach((location) => byId.set(location.id, location));

      logger.log('[Map] Parsed', byId.size, 'valid map locations');

      // Merge new vendors into in-memory cache
      byId.forEach((v, id) => vendorCacheRef.current.set(id, v));

      const allVendors = sortVendorsByDistance(Array.from(vendorCacheRef.current.values()), userLocation);
      const payload: RegionCachePayload = {
        fetchedAt: Date.now(),
        vendors: Array.from(byId.values()),
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(payload));
      await rememberRegionCacheKey(regionHash);

      setVendors(allVendors);
    } catch (fetchError) {
      logger.error('Failed loading map vendors:', fetchError);
      setError(t('map_load_error'));
    } finally {
      setLoading(false);
      setSearchingNearby(false);
    }
  }, [t, userLocation]);

  // Debounced fetch on region change
  const onRegionChangeComplete = useCallback(
    (region: Region) => {
      if (isClampingRef.current) {
        isClampingRef.current = false;
        setCurrentRegion(region);
        return;
      }

      const clamped = clampRegion(region);
      const didClamp =
        clamped.latitude !== region.latitude ||
        clamped.longitude !== region.longitude ||
        clamped.latitudeDelta !== region.latitudeDelta ||
        clamped.longitudeDelta !== region.longitudeDelta;

      if (didClamp) {
        isClampingRef.current = true;
        mapRef.current?.animateToRegion(clamped, 200);
      }

      setCurrentRegion(clamped);
    },
    []
  );

  // Initial fetch on mount — wait for auth to be ready
  useEffect(() => {
    if (hasFetchedOnceRef.current) return;

    const doFetch = () => {
      if (!getAuth().currentUser) return false;
      hasFetchedOnceRef.current = true;
      const zoom = Math.round(Math.log2(360 / 0.6));
      const center = { latitude: DOHA_CENTER.latitude, longitude: DOHA_CENTER.longitude };
      lastFetchedKeyRef.current = `${toGeohash(center.latitude, center.longitude, MAP_GEOHASH_PRECISION)}-${zoom}`;
      void fetchVendorsForVisibleRegion(center, zoom);
      return true;
    };

    // Try immediately in case auth is already restored
    if (doFetch()) return;

    // Otherwise listen for auth readiness
    const unsubscribe = getAuth().onAuthStateChanged((user) => {
      if (user && !hasFetchedOnceRef.current) {
        doFetch();
        unsubscribe();
      }
    });
    return unsubscribe;
  }, [fetchVendorsForVisibleRegion]);

  useEffect(() => {
    if (!userLocation) return;
    setVendors((previous) => sortVendorsByDistance(previous, userLocation));
  }, [userLocation]);

  // Handle navigation from vendor page
  useEffect(() => {
    if (!params.lat || !params.lng) return;
    const lat = parseFloat(params.lat);
    const lng = parseFloat(params.lng);
    if (!isValidLatLng(lat, lng)) return;

    setNavigationTarget({ lat, lng, vendorId: params.vendorId || '' });
    pendingSelectVendorIdRef.current = params.vendorId || null;

    setTimeout(() => {
      mapRef.current?.animateCamera({
        center: { latitude: lat, longitude: lng },
        zoom: 15,
      });
    }, 300);
  }, [params.lat, params.lng, params.vendorId]);

  // Auto-select vendor when data loads after navigation
  useEffect(() => {
    const vendorId = pendingSelectVendorIdRef.current;
    if (!vendorId || !vendors.length) return;
    const vendor =
      vendors.find((v) => v.id === vendorId) ||
      vendors.find((v) => v.vendorId === vendorId && v.locationId === params.locationId) ||
      vendors
        .filter((v) => v.vendorId === vendorId)
        .sort((a, b) => {
          const targetLat = navigationTarget?.lat;
          const targetLng = navigationTarget?.lng;
          if (typeof targetLat !== 'number' || typeof targetLng !== 'number') return 0;
          const target = { latitude: targetLat, longitude: targetLng };
          return haversineDistanceKm(target, a) - haversineDistanceKm(target, b);
        })[0];
    if (vendor) {
      pendingSelectVendorIdRef.current = null;
      setSelectedMapVendor(vendor);
      void rememberRecentMapPlace(vendor);
    }
  }, [navigationTarget, params.locationId, vendors]);

  const rememberRecentMapPlace = async (vendor: VendorMapItem) => {
    try {
      const raw = await AsyncStorage.getItem(MAP_RECENTS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const previous = Array.isArray(parsed) ? parsed : [];
      const next = [
        {
          id: vendor.id,
          vendorId: vendor.vendorId,
          locationId: vendor.locationId,
          name: vendor.name,
          nameAr: vendor.nameAr,
          branchName: vendor.branchName,
          branchNameAr: vendor.branchNameAr,
          latitude: vendor.latitude,
          longitude: vendor.longitude,
          viewedAt: Date.now(),
        },
        ...previous.filter((item: any) => item?.id !== vendor.id),
      ].slice(0, 20);
      await AsyncStorage.setItem(MAP_RECENTS_KEY, JSON.stringify(next));
    } catch (recentError) {
      logger.warn('Error saving recent map place:', recentError);
    }
  };

  const selectMapVendor = (vendor: VendorMapItem) => {
    setSelectedClusterPreview([]);
    setSelectedMapVendor(vendor);
    void rememberRecentMapPlace(vendor);
  };

  const toggleSavedMapPlace = async (vendor: VendorMapItem) => {
    const user = getAuth().currentUser;
    if (!user) {
      Alert.alert(t('error'), t('login_required_message'));
      return;
    }

    const savedId = `${vendor.vendorId}_${vendor.locationId}_map`;
    if (savingMapPlaceIds.has(savedId)) return;

    setSavingMapPlaceIds((previous) => new Set(previous).add(savedId));
    try {
      const db = getFirestore();
      const savedRef = doc(db, 'students', user.uid, 'savedItems', savedId);
      if (savedMapPlaceIds.has(savedId)) {
        await deleteDoc(savedRef);
        setSavedMapPlaceIds((previous) => {
          const next = new Set(previous);
          next.delete(savedId);
          return next;
        });
        return;
      }

      await setDoc(savedRef, {
        type: 'mapPlace',
        vendorId: vendor.vendorId,
        locationId: vendor.locationId,
        vendorName: vendor.name || '',
        vendorNameAr: vendor.nameAr || '',
        branchName: vendor.branchName || '',
        branchNameAr: vendor.branchNameAr || '',
        address: vendor.address || '',
        addressAr: vendor.addressAr || '',
        latitude: vendor.latitude,
        longitude: vendor.longitude,
        mainCategory: vendor.mainCategory || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSavedMapPlaceIds((previous) => new Set(previous).add(savedId));
    } catch (saveError) {
      logger.error('Error toggling saved map place:', saveError);
      Alert.alert(t('error'), t('saved_offer_failed'));
    } finally {
      setSavingMapPlaceIds((previous) => {
        const next = new Set(previous);
        next.delete(savedId);
        return next;
      });
    }
  };

  const handleClusterPress = (cluster: ClusterFeature) => {
    const leaves = superclusterRef.current.getLeaves(cluster.properties.cluster_id, Infinity);
    if (!leaves.length) return;
    const preview = leaves
      .map((leaf) => vendors.find((vendor) => vendor.id === leaf.properties.id))
      .filter((vendor): vendor is VendorMapItem => !!vendor)
      .slice(0, 4);
    setSelectedMapVendor(null);
    setSelectedClusterPreview(preview);

    // Zoom to fit all children
    const coords = leaves.map((l) => ({
      latitude: l.geometry.coordinates[1],
      longitude: l.geometry.coordinates[0],
    }));
    mapRef.current?.fitToCoordinates(coords, {
      edgePadding: { top: 80, right: 40, bottom: 40, left: 40 },
      animated: true,
    });
  };

  const centerOnUser = async () => {
    if (!locationEnabled) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) return;
      setLocationEnabled(true);
    }

    const position = await Location.getCurrentPositionAsync({});
    const coords = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };

    setUserLocation(coords);
    mapRef.current?.animateCamera({
      center: { latitude: coords.latitude, longitude: coords.longitude },
      zoom: 15,
    });
  };

  const handleSubmitMapSearch = () => {
    setSubmittedSearchQuery(searchQuery.trim().toLowerCase());
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.light.background} />

      <View style={[styles.titleBar, isArabic && { alignItems: 'flex-start' }]}>
        <PhonkText style={[styles.headerTitle]}>
          {isArabic ? (
            <>
              <Text style={{ color: Colors.light.text }}>الخريطة </Text>
              <Text style={{ color: Colors.brandGreen }}>إكس</Text>
            </>
          ) : (
            <>
              <Text style={{ color: Colors.brandGreen }}>X </Text>
              <Text style={{ color: Colors.light.text }}>MAP</Text>
            </>
          )}
        </PhonkText>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude: DOHA_CENTER.latitude,
            longitude: DOHA_CENTER.longitude,
            latitudeDelta: 0.03,
            longitudeDelta: 0.03,
          }}
          showsUserLocation={true}
          showsMyLocationButton={false}
          onRegionChangeComplete={onRegionChangeComplete}
        >
          {clusters.map((cluster) => {
            const [lng, lat] = cluster.geometry.coordinates;
            const isCluster = 'cluster' in cluster.properties && cluster.properties.cluster;
            const pointCount = ('point_count' in cluster.properties && cluster.properties.point_count) || 0;
            const clusterId = isCluster ? (cluster as any).id : (cluster as any).id || cluster.properties.id;

            if (isCluster) {
              const clusterColor = clusterColorForCount(pointCount);
              return (
                <Marker
                  key={`cluster-${clusterId}`}
                  coordinate={{ latitude: lat, longitude: lng }}
                  onPress={() => handleClusterPress(cluster as ClusterFeature)}
                >
                  <View style={[styles.clusterBubble, { backgroundColor: clusterColor }, pointCount > 20 && styles.clusterBubbleLarge]}>
                    <Text style={styles.clusterText}>{pointCount}</Text>
                  </View>
                </Marker>
              );
            }

            const vendorId = cluster.properties.id;

            return (
              <Marker
                key={vendorId}
                coordinate={{ latitude: lat, longitude: lng }}
                onPress={() => {
                  const vendor = vendors.find((v) => v.id === vendorId);
                  if (vendor) {
                    selectMapVendor(vendor);
                  }
                }}
              >
                <View style={[styles.vendorDot, { borderColor: markerColorForVendor(vendors.find((v) => v.id === vendorId) || {} as VendorMapItem) }]}>
                  {(vendors.find((v) => v.id === vendorId)?.xcard || vendors.find((v) => v.id === vendorId)?.hasBuyOneGetOne) && (
                    <View style={[styles.vendorDotCore, { backgroundColor: markerColorForVendor(vendors.find((v) => v.id === vendorId) || {} as VendorMapItem) }]} />
                  )}
                </View>
              </Marker>
            );
          })}
          {navigationTarget && userLocation && isValidLatLng(navigationTarget.lat, navigationTarget.lng) && (
            <Polyline
              coordinates={[
                { latitude: userLocation.latitude, longitude: userLocation.longitude },
                { latitude: navigationTarget.lat, longitude: navigationTarget.lng },
              ]}
              strokeColor={Colors.brandGreen}
              strokeWidth={3}
              lineDashPattern={[8, 4]}
            />
          )}
        </MapView>

        <View style={styles.floatingSearch} pointerEvents="box-none">
          <View style={styles.searchContainer} pointerEvents="auto">
            <Ionicons
              name="search"
              size={20}
              color={isSearchActive ? Colors.brandGreen : Colors.light.tabIconDefault}
              style={styles.searchIcon}
            />
            <TextInput
              style={[styles.searchInput, isSearchActive && styles.searchInputActive]}
              placeholder={isSearchActive ? '' : (animatedSearchPlaceholder ?? searchPlaceholder)}
              placeholderTextColor={Colors.light.tabIconDefault}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              onSubmitEditing={handleSubmitMapSearch}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              selectionColor={Colors.brandGreen}
              cursorColor={Colors.brandGreen}
            />
            {isSearching ? (
              <ActivityIndicator size="small" color={Colors.brandGreen} />
            ) : searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => {
                setSearchQuery('');
                setSubmittedSearchQuery('');
              }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={18} color="#AAA" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Pressable style={styles.locationButton} onPress={() => void centerOnUser()}>
          <Ionicons name="locate" size={18} color={Colors.brandGreen} />
        </Pressable>

        {navigationTarget && (
          <TouchableOpacity
            style={styles.cancelNavButton}
            onPress={() => setNavigationTarget(null)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={16} color={Colors.brandGreen} />
          </TouchableOpacity>
        )}

        {selectedMapVendor && (
          <Pressable
            style={[styles.calloutOverlay, { bottom: insets.bottom + 50 }]}
            onPress={() => {
              setSelectedMapVendor(null);
            }}
          >
            <Pressable style={styles.calloutCard} onPress={(e) => e.stopPropagation()}>
              <View style={styles.calloutHeader}>
                <View style={styles.calloutTitleBlock}>
                  <PhonkText style={styles.calloutVendorName} numberOfLines={1}>
                    {isArabic
                      ? (selectedMapVendor.nameAr || selectedMapVendor.name)
                      : selectedMapVendor.name}
                  </PhonkText>
                  {(selectedMapVendor.branchName || selectedMapVendor.address) && (
                    <Text style={styles.calloutBranchText} numberOfLines={1}>
                      {isArabic
                        ? (selectedMapVendor.branchNameAr || selectedMapVendor.branchName || selectedMapVendor.addressAr || selectedMapVendor.address)
                        : (selectedMapVendor.branchName || selectedMapVendor.branchNameAr || selectedMapVendor.address || selectedMapVendor.addressAr)}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedMapVendor(null);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={20} color="#666" />
                </TouchableOpacity>
              </View>

              {selectedMapVendor.firstOffer && (
                <View style={styles.calloutOfferPill}>
                  <Ionicons name="pricetag" size={14} color={Colors.brandGreen} />
                  <PhonkText style={styles.calloutOfferText} numberOfLines={1}>
                    {isArabic
                      ? (selectedMapVendor.firstOffer.titleAr || selectedMapVendor.firstOffer.titleEn || '')
                      : (selectedMapVendor.firstOffer.titleEn || selectedMapVendor.firstOffer.titleAr || '')}
                  </PhonkText>
                </View>
              )}

              {userLocation && (
                <View style={styles.calloutDistanceRow}>
                  <Ionicons name="navigate-outline" size={14} color="#8E8E93" />
                  <Text style={styles.calloutDistanceText}>
                    {haversineDistanceKm(userLocation, { latitude: selectedMapVendor.latitude, longitude: selectedMapVendor.longitude }).toFixed(1)} km
                  </Text>
                </View>
              )}

              <View style={styles.calloutActions}>
                <TouchableOpacity
                  style={styles.calloutIconBtn}
                  onPress={() => void toggleSavedMapPlace(selectedMapVendor)}
                  disabled={savingMapPlaceIds.has(`${selectedMapVendor.vendorId}_${selectedMapVendor.locationId}_map`)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={savedMapPlaceIds.has(`${selectedMapVendor.vendorId}_${selectedMapVendor.locationId}_map`) ? 'bookmark' : 'bookmark-outline'}
                    size={18}
                    color={Colors.brandGreen}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.calloutViewBtn}
                  onPress={() => router.push({ pathname: '/vendor/[id]', params: { id: selectedMapVendor.vendorId } })}
                  activeOpacity={0.7}
                >
                  <Ionicons name="storefront-outline" size={16} color={Colors.light.text} />
                  <Text style={[styles.calloutBtnText, { color: Colors.light.text }]}>{t('map_callout_view')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.calloutDirectionsBtn}
                  onPress={() => {
                    const lat = selectedMapVendor.latitude;
                    const lng = selectedMapVendor.longitude;
                    if (Platform.OS === 'android') {
                      void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
                    } else {
                      const rawLabel = isArabic ? (selectedMapVendor.nameAr || selectedMapVendor.name || '') : (selectedMapVendor.name || '');
                      const label = encodeURIComponent(rawLabel);
                      void Linking.openURL(`http://maps.apple.com/?daddr=${lat},${lng}&dirflg=d&q=${label}`).catch(() => {
                        void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
                      });
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="navigate" size={16} color="#FFF" />
                  <Text style={[styles.calloutBtnText, { color: '#FFF' }]}>{t('map_callout_directions')}</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        )}

        {selectedClusterPreview.length > 0 && !selectedMapVendor && (
          <View style={[styles.clusterPreviewCard, { bottom: insets.bottom + 50 }]}>
            <View style={styles.clusterPreviewHeader}>
              <Text style={styles.clusterPreviewTitle}>{selectedClusterPreview.length} nearby places</Text>
              <TouchableOpacity onPress={() => setSelectedClusterPreview([])}>
                <Ionicons name="close" size={18} color="#666" />
              </TouchableOpacity>
            </View>
            {selectedClusterPreview.map((vendor) => (
              <TouchableOpacity key={vendor.id} style={styles.clusterPreviewRow} onPress={() => selectMapVendor(vendor)}>
                <View style={[styles.clusterPreviewDot, { backgroundColor: markerColorForVendor(vendor) }]} />
                <Text style={styles.clusterPreviewName} numberOfLines={1}>
                  {isArabic ? (vendor.nameAr || vendor.name) : vendor.name}
                </Text>
                {vendor.distanceKm != null && <Text style={styles.clusterPreviewDistance}>{vendor.distanceKm.toFixed(1)} km</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {loading && (
          <View style={styles.overlayCard}>
            <ActivityIndicator size="small" color={Colors.brandGreen} />
            <Text style={styles.overlayText}>{t('map_loading')}</Text>
          </View>
        )}

        {searchQuery.length > 0 && !isSearching && searchedVendorIds?.size === 0 && (
          <View style={styles.overlayCard}>
            <Ionicons name="search-outline" size={18} color={Colors.light.tabIconDefault} />
            <Text style={styles.overlayText}>{t('no_search_results')}</Text>
          </View>
        )}

        {!loading && error && (
          <View style={styles.overlayError}>
            <Text style={styles.overlayErrorText}>{error}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function sortVendorsByDistance(vendors: VendorMapItem[], userLocation: LatLng | null) {
  if (!userLocation) return vendors;

  return [...vendors]
    .map((vendor) => ({
      ...vendor,
      distanceKm: haversineDistanceKm(userLocation, {
        latitude: vendor.latitude,
        longitude: vendor.longitude,
      }),
    }))
    .sort((a, b) => (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY));
}

function parseMapLocations(locationsData: Record<string, any> | undefined): VendorMapItem[] {
  if (!locationsData || typeof locationsData !== 'object') return [];

  const vendorEntries =
    locationsData.vendors && typeof locationsData.vendors === 'object'
      ? locationsData.vendors
      : locationsData;

  return Object.entries(vendorEntries).flatMap(([vendorId, data]) => {
    if (!data || typeof data !== 'object') return [];

    const base = data as Record<string, any>;
    const rawLocations = Array.isArray(base.locations) && base.locations.length > 0
      ? base.locations
      : [{
        id: 'primary',
        name: base.branchName,
        nameAr: base.branchNameAr,
        address: base.address,
        addressAr: base.addressAr,
        latitude: base.latitude,
        longitude: base.longitude,
        geohash: base.geohash,
        isPrimary: true,
      }];

    return rawLocations.flatMap((rawLocation: any, index: number) => {
      if (!rawLocation || typeof rawLocation !== 'object') return [];

      const rawLat = rawLocation.latitude;
      const rawLng = rawLocation.longitude;
      const latitude = typeof rawLat === 'string' ? parseFloat(rawLat) : rawLat;
      const longitude = typeof rawLng === 'string' ? parseFloat(rawLng) : rawLng;

      if (!isValidLatLng(latitude, longitude)) {
        logger.warn('[Map] Skipping', vendorId, '- invalid lat/lng:', rawLat, rawLng);
        return [];
      }
      if (!isInQatar(latitude, longitude)) {
        logger.warn('[Map] Skipping', vendorId, '- outside Qatar bounds:', latitude, longitude);
        return [];
      }

      const locationId = String(rawLocation.id || (rawLocation.isPrimary ? 'primary' : `branch-${index + 1}`));
      const geohash = typeof rawLocation.geohash === 'string' && rawLocation.geohash.length > 0
        ? rawLocation.geohash
        : toGeohash(latitude, longitude, MAP_GEOHASH_PRECISION);

      return [{
        id: `${vendorId}:${locationId}`,
        vendorId,
        locationId,
        name: base.vendorName || base.name,
        nameAr: base.vendorNameAr || base.nameAr,
        branchName: rawLocation.name,
        branchNameAr: rawLocation.nameAr,
        address: rawLocation.address || base.address,
        addressAr: rawLocation.addressAr || base.addressAr,
        latitude,
        longitude,
        geohash,
        mainCategory: base.mainCategory || null,
        xcard: base.xcard === true,
        offerTypes: Array.isArray(base.offerTypes) ? base.offerTypes : [],
        hasBuyOneGetOne: base.hasBuyOneGetOne === true,
        hasStudentDeal: base.hasStudentDeal === true,
        openingHours: base.openingHours || null,
        searchTokens: Array.isArray(base.searchTokens) ? base.searchTokens : [],
        firstOffer: base.firstOffer || null,
      }];
    });
  });
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  titleBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: Colors.light.background,
    flexDirection: 'column',
  },
  floatingSearch: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 28,
    color: Colors.light.text,
  },
  headerMeta: {
    marginTop: 4,
    color: Colors.light.subtitle,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: Typography.poppins.medium,
    color: Colors.light.text,
    padding: 0,
  },
  searchInputActive: {
    color: Colors.brandGreen,
  },
  mapContainer: {
    flex: 1,
  },
  locationButton: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  clusterBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.88,
  },
  clusterBubbleLarge: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  clusterText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Typography.poppins.semiBold,
  },
  vendorDot: {
    backgroundColor: '#FFFFFF',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 4,
    borderColor: Colors.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorDotCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  overlayCard: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  overlayText: {
    color: Colors.light.text,
    fontFamily: Typography.poppins.medium,
    fontSize: 13,
  },
  overlayError: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  overlayErrorText: {
    color: Colors.light.text,
    textAlign: 'center',
    fontFamily: Typography.poppins.medium,
    fontSize: 13,
  },
  cancelNavButton: {
    position: 'absolute',
    right: 16,
    bottom: 80,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  calloutOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  calloutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  calloutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  calloutVendorName: {
    fontSize: 20,
    color: Colors.light.text,
  },
  calloutTitleBlock: {
    flex: 1,
    marginRight: 12,
  },
  calloutBranchText: {
    marginTop: 2,
    fontSize: 13,
    color: '#6E6E73',
    fontFamily: Typography.poppins.medium,
  },
  calloutOfferPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  calloutOfferText: {
    fontSize: 14,
    color: Colors.brandGreen,
  },
  calloutDistanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  calloutDistanceText: {
    fontSize: 13,
    fontFamily: Typography.poppins.medium,
    color: '#8E8E93',
  },
  calloutActions: {
    flexDirection: 'row',
    gap: 12,
  },
  calloutIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
  },
  calloutViewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    borderRadius: 24,
  },
  calloutDirectionsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.brandGreen,
    paddingVertical: 12,
    borderRadius: 24,
  },
  calloutBtnText: {
    fontSize: 14,
    fontFamily: Typography.poppins.semiBold,
  },
  clusterPreviewCard: {
    position: 'absolute',
    left: 14,
    right: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  clusterPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clusterPreviewTitle: {
    fontSize: 14,
    color: Colors.light.text,
    fontFamily: Typography.poppins.semiBold,
  },
  clusterPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 34,
  },
  clusterPreviewDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  clusterPreviewName: {
    flex: 1,
    fontSize: 13,
    color: Colors.light.text,
    fontFamily: Typography.poppins.medium,
  },
  clusterPreviewDistance: {
    fontSize: 12,
    color: Colors.brandGreen,
    fontFamily: Typography.poppins.semiBold,
  },
});
