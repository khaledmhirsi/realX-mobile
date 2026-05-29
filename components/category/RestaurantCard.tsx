import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { I18nManager, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Typography } from '../../constants/Typography';
import { triggerSubtleHaptic } from '../../utils/haptics';

const cashbackBadgeIcon = require('../../assets/images/cashback.png');

type Props = {
  id: string;
  name: string;
  nameAr?: string;
  cashbackText?: string;
  discountText?: string;
  isTrending?: boolean;
  isTopRated?: boolean;
  imageUri?: string;
  logoUri?: string;
  onPress?: () => void;
  style?: any;
  xcardEnabled?: boolean;
};

export default function RestaurantCard({
  name,
  nameAr,
  cashbackText = '',
  discountText = '',
  isTrending = false,
  isTopRated = false,
  imageUri,
  logoUri,
  onPress,
  style,
  xcardEnabled = false,
}: Props) {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar' || I18nManager.isRTL;

  const handlePress = () => {
    triggerSubtleHaptic();
    onPress?.();
  };
  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      {/* Image placeholder or actual image */}
      <View style={styles.imageContainer}>
        {imageUri ? (
          <>
            <View style={styles.topPill}>
              <Image
                source={{ uri: imageUri }}
                style={styles.topImage}
                contentFit="cover"
              />
            </View>
            <View style={styles.bottomPill}>
              <Image
                source={{ uri: imageUri }}
                style={styles.bottomImage}
                contentFit="cover"
              />
            </View>
          </>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderEmoji}>🏪</Text>
          </View>
        )}
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoWrapper}>
            {logoUri ? (
              <Image
                source={{ uri: logoUri }}
                style={styles.logoImage}
                contentFit="cover"
              />
            ) : (
              <Text style={[{ color: '#000', fontFamily: Typography.poppins.medium }, styles.logoEmoji]}>🏪</Text>
            )}
          </View>
        </View>

        {/* Cashback Badge */}
        {xcardEnabled && (
          <View style={styles.xcardBadge}>
            <Image
              source={cashbackBadgeIcon}
              style={styles.xcardIcon}
              contentFit="contain"
            />
          </View>
        )}
      </View>


      {/* Content */}
      <View style={styles.content}>
        <Text style={[
          { color: '#000', fontFamily: Typography.poppins.medium },
          styles.name,
          { textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }
        ]} numberOfLines={1}>{isArabic ? (nameAr || name) : name}</Text>

        {cashbackText || discountText ? (
          <Text style={[
            { color: '#666666', fontFamily: Typography.poppins.medium },
            styles.descriptionText,
            { textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }
          ]} numberOfLines={2}>{discountText || cashbackText}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 200, // Fixed height for consistency
    backgroundColor: 'transparent',
    borderRadius: 0,
  },
  imageContainer: {
    width: '100%',
    height: 120,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 40,
    opacity: 0.3,
  },
  logoContainer: {
    position: 'absolute',
    start: 10,
    bottom: 10, // Logo in the corner
    zIndex: 2,
  },
  logoWrapper: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoEmoji: {
    fontSize: 20,
  },
  badgesContainer: { // Container for badges to handle spacing/positioning if needed
    position: 'absolute',
    top: 10,
    start: 0,
    end: 0,
    flexDirection: 'row',
    justifyContent: 'space-between', // Distribute badges
    paddingHorizontal: 10,
    pointerEvents: 'none', // Allow clicks to pass through if needed
  },
  trendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.brandGreen,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    alignSelf: 'flex-start',
    marginStart: 'auto', // Push to right if alone, or use justifyContent
  },
  topRatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700', // Gold for top rated
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    alignSelf: 'flex-start',
  },
  trendingIcon: {
    fontSize: 10,
  },
  badgeText: { // generic text style for badges
    fontSize: 10,
    fontFamily: Typography.poppins.semiBold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  topRatedText: {
    color: '#000000', // Dark text on Gold
  },

  content: {
    paddingTop: 8,
    paddingHorizontal: 2,
    paddingBottom: 8,
  },
  name: {
    fontSize: 14,
    fontFamily: Typography.poppins.semiBold,
    marginBottom: 2,
  },
  descriptionText: {
    fontSize: 12,
    fontFamily: Typography.poppins.medium,
    color: '#666666',
    lineHeight: 16,
  },

  xcardBadge: {
    position: 'absolute',
    top: 8,
    end: 8,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    overflow: 'hidden',
  },
  topPill: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  bottomPill: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  topImage: {
    width: '100%',
    height: '200%',
  },
  bottomImage: {
    width: '100%',
    height: '200%',
    transform: [{ translateY: '-50%' }],
  },
  xcardIcon: {
    width: '100%',
    height: '100%',
  },
});
