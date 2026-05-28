import { Image } from 'expo-image';
import { PixelRatio, StyleSheet } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

const LOGO_ASPECT_RATIO = 454 / 179;
const LOGO_WIDTH_RATIO = 0.25;
const LOGO_LEFT_RATIO = 0.072;
const LOGO_BOTTOM_RATIO = 0.095;
const LOGO_RELIEF_OUTSET = 2;
const xCardLogo = require('../../assets/images/xcard-logo.png');

type Props = {
  cardHeight: number;
  cardWidth: number;
  halfCardHeight: number;
  halfCardWidth: number;
  isPressing: SharedValue<number>;
  tiltEnabled: boolean;
  tiltX: SharedValue<number>;
  tiltY: SharedValue<number>;
};

export default function XCardLogoLayer({
  cardHeight,
  cardWidth,
  halfCardHeight,
  halfCardWidth,
  isPressing,
  tiltEnabled,
  tiltX,
  tiltY,
}: Props) {
  const pixelStep = 1 / PixelRatio.get();
  const logoWidth = PixelRatio.roundToNearestPixel(cardWidth * LOGO_WIDTH_RATIO);
  const logoHeight = PixelRatio.roundToNearestPixel(logoWidth / LOGO_ASPECT_RATIO);
  const logoLeft = PixelRatio.roundToNearestPixel(cardWidth * LOGO_LEFT_RATIO);
  const logoBottom = PixelRatio.roundToNearestPixel(cardHeight * LOGO_BOTTOM_RATIO);

  const logoDepthStyle = useAnimatedStyle(() => {
    const translateX = tiltEnabled
      ? snapToPixel(interpolate(tiltX.value, [-halfCardWidth, halfCardWidth], [-3.8, 3.8], Extrapolation.CLAMP), pixelStep)
      : 0;
    const translateY = tiltEnabled
      ? snapToPixel(interpolate(tiltY.value, [-halfCardHeight, halfCardHeight], [-2.6, 2.6], Extrapolation.CLAMP), pixelStep)
      : 0;

    return {
      transform: [
        { translateX },
        { translateY },
      ],
    };
  });

  const logoShadowStyle = useAnimatedStyle(() => {
    const translateX = tiltEnabled
      ? snapToPixel(interpolate(tiltX.value, [-halfCardWidth, halfCardWidth], [3, -3], Extrapolation.CLAMP), pixelStep)
      : 0;
    const translateY = tiltEnabled
      ? snapToPixel(interpolate(tiltY.value, [-halfCardHeight, halfCardHeight], [3.6, 0.4], Extrapolation.CLAMP), pixelStep)
      : 2;
    const opacity = tiltEnabled
      ? interpolate(isPressing.value, [0, 1], [0.16, 0.24], Extrapolation.CLAMP)
      : 0.16;

    return {
      opacity,
      transform: [
        { translateX },
        { translateY },
        { scale: 1.025 },
      ],
    };
  });

  const logoReliefStyle = useAnimatedStyle(() => {
    const translateX = tiltEnabled
      ? snapToPixel(interpolate(tiltX.value, [-halfCardWidth, halfCardWidth], [-0.7, 0.7], Extrapolation.CLAMP), pixelStep)
      : 0;
    const translateY = tiltEnabled
      ? snapToPixel(interpolate(tiltY.value, [-halfCardHeight, halfCardHeight], [-0.5, 0.5], Extrapolation.CLAMP) + 1, pixelStep)
      : 1;
    const opacity = tiltEnabled
      ? interpolate(isPressing.value, [0, 1], [0.72, 0.88], Extrapolation.CLAMP)
      : 0.72;

    return {
      opacity,
      transform: [
        { translateX },
        { translateY },
      ],
    };
  });

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.logoReliefLayer,
          {
            left: logoLeft - LOGO_RELIEF_OUTSET,
            bottom: logoBottom - LOGO_RELIEF_OUTSET,
            width: logoWidth + LOGO_RELIEF_OUTSET * 2,
            height: logoHeight + LOGO_RELIEF_OUTSET * 2,
          },
          logoReliefStyle,
        ]}
      >
        <Image
          source={xCardLogo}
          style={styles.logoImage}
          contentFit="contain"
          allowDownscaling={false}
          tintColor="rgba(35, 225, 112, 0.58)"
        />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.logoStage,
          {
            left: logoLeft,
            bottom: logoBottom,
            width: logoWidth,
            height: logoHeight,
          },
        ]}
      >
        <Animated.View style={[styles.logoContactShadow, logoShadowStyle]}>
          <Image
            source={xCardLogo}
            style={styles.logoImage}
            contentFit="contain"
            allowDownscaling={false}
            tintColor="rgba(0, 20, 9, 0.72)"
          />
        </Animated.View>
        <Animated.View style={[styles.logoLiftedPlane, logoDepthStyle]}>
          <Image source={xCardLogo} style={styles.logoImage} contentFit="contain" allowDownscaling={false} />
        </Animated.View>
      </Animated.View>
    </>
  );
}

function snapToPixel(value: number, pixelStep: number) {
  'worklet';
  return Math.round(value / pixelStep) * pixelStep;
}

const styles = StyleSheet.create({
  logoStage: {
    position: 'absolute',
  },
  logoReliefLayer: {
    position: 'absolute',
  },
  logoContactShadow: {
    ...StyleSheet.absoluteFill,
  },
  logoLiftedPlane: {
    ...StyleSheet.absoluteFill,
  },
  logoImage: {
    ...StyleSheet.absoluteFill,
  },
});
