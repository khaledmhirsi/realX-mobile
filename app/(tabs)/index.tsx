import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import {
  BrandGrid,
  CategoryGrid,
  FeaturedBanner,
  GreetingHeader,
  PromoBanner,
  SearchBar,
  TrendingOffers,
  WaktiBanner
} from '../../components/home';

import { Colors } from '../../constants/Colors';
import { triggerSubtleHaptic } from '../../utils/haptics';
import { useStudent } from '../../context/StudentContext';

export default function HomeScreen() {
  const { studentData } = useStudent();
  const userName = studentData?.firstName || '';
  const [searchQuery, setSearchQuery] = useState('');
  const { t } = useTranslation();
  const router = useRouter();

  const handleVendorPress = useCallback((vendorId?: string) => {
    const trimmedVendorId = vendorId?.trim();
    if (!trimmedVendorId) return;

    router.push({ pathname: '/vendor/[id]', params: { id: trimmedVendorId } });
  }, [router]);

  const handleSearch = useCallback(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    triggerSubtleHaptic();
    router.push({ pathname: '/search', params: { q: trimmed } });
  }, [searchQuery, router]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: Colors.light.background }]} edges={['top']}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Colors.light.background}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: Colors.light.background }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        nestedScrollEnabled
        directionalLockEnabled
        contentContainerStyle={styles.contentContainer}
      >
        <GreetingHeader userName={userName || t('user')} />
        <SearchBar
          placeholder={t('search_placeholder')}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmit={handleSearch}
        />
        <PromoBanner onBannerPress={(banner) => handleVendorPress(banner.vendorId)} />
        <CategoryGrid />
        <TrendingOffers onVendorPress={(vendor) => handleVendorPress(vendor.vendorId || vendor.id)} />
        <BrandGrid />
        <FeaturedBanner />
        <WaktiBanner />
      </ScrollView>
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
    paddingBottom: 88,
  },
});
