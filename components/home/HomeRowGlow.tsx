import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';
import { useAppTheme } from '../../context/AppThemeContext';

const darkRowGlowImage = require('../../assets/images/home-row-glow.png');

type HomeRowGlowProps = {
  variant: 'promo' | 'offers';
};

export default function HomeRowGlow({ variant }: HomeRowGlowProps) {
  const { isDark } = useAppTheme();
  const isPromo = variant === 'promo';

  if (!isDark) {
    return null;
  }

  return (
    <Image
      source={darkRowGlowImage}
      style={[
        styles.glow,
        isPromo ? styles.promoGlow : styles.offersGlow,
        isPromo ? styles.darkPromoGlow : styles.darkOffersGlow,
      ]}
      contentFit="fill"
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    left: -36,
    right: -36,
  },
  promoGlow: {
    top: -28,
    height: 268,
  },
  offersGlow: {
    top: 82,
    height: 138,
  },
  darkPromoGlow: {
    opacity: 0.95,
  },
  darkOffersGlow: {
    opacity: 0.38,
  },
});
