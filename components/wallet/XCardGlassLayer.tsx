import { useEffect } from 'react';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { GlassStyle } from 'expo-glass-effect';
import { Platform, StyleSheet, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type AnimatedStyle,
} from 'react-native-reanimated';
import { CARD_RADIUS } from './xCardLayout';

export type XCardGlassPreset = 'subtle' | 'liquid' | 'frosted';

export type XCardGlassConfig = {
  preset?: XCardGlassPreset;
  intensity?: number;
  tintColor?: string;
  borderColor?: string;
  useNativeGlass?: boolean;
  nativeStyle?: GlassStyle;
  nativeOpacity?: number;
  interactive?: boolean;
};

export type XCardGlass = boolean | XCardGlassPreset | XCardGlassConfig;

export type ResolvedGlassConfig = Required<
  Pick<
    XCardGlassConfig,
    'preset' | 'intensity' | 'tintColor' | 'borderColor' | 'useNativeGlass' | 'nativeStyle' | 'nativeOpacity' | 'interactive'
  >
> & {
  enabled: boolean;
};

const GLASS_PRESETS: Record<XCardGlassPreset, ResolvedGlassConfig> = {
  subtle: {
    enabled: true,
    preset: 'subtle',
    intensity: 0.18,
    tintColor: 'rgba(244, 255, 249, 0.05)',
    borderColor: 'rgba(246, 255, 250, 0.24)',
    useNativeGlass: true,
    nativeStyle: 'clear',
    nativeOpacity: 0.04,
    interactive: false,
  },
  liquid: {
    enabled: true,
    preset: 'liquid',
    intensity: 0.32,
    tintColor: 'rgba(242, 255, 248, 0.06)',
    borderColor: 'rgba(241, 255, 248, 0.36)',
    useNativeGlass: true,
    nativeStyle: 'clear',
    nativeOpacity: 0.07,
    interactive: false,
  },
  frosted: {
    enabled: true,
    preset: 'frosted',
    intensity: 0.48,
    tintColor: 'rgba(244, 255, 249, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.5)',
    useNativeGlass: true,
    nativeStyle: 'regular',
    nativeOpacity: 0.1,
    interactive: false,
  },
};

type Props = {
  config: ResolvedGlassConfig;
  strength: number;
  touchStyle: AnimatedStyle<ViewStyle>;
};

export default function XCardGlassLayer({ config, strength, touchStyle }: Props) {
  const loopProgress = useSharedValue(0);

  useEffect(() => {
    loopProgress.value = withRepeat(
      withTiming(1, {
        duration: 4600,
        easing: Easing.inOut(Easing.cubic),
      }),
      -1,
      false,
    );

    return () => {
      cancelAnimation(loopProgress);
    };
  }, [loopProgress]);

  const sweepStyle = useAnimatedStyle(() => {
    const translateX = interpolate(loopProgress.value, [0, 1], [-180, 360], Extrapolation.CLAMP);
    const opacity = interpolate(
      loopProgress.value,
      [0, 0.16, 0.5, 0.8, 1],
      [0, 0.08, 0.18, 0.08, 0],
      Extrapolation.CLAMP,
    );

    return {
      opacity,
      transform: [
        { translateX },
        { translateY: -18 },
        { rotate: '18deg' },
      ],
    };
  });

  if (!config.enabled) {
    return null;
  }

  const showNativeGlass = config.useNativeGlass && canUseNativeGlass();
  const nativeGlassOpacity = showNativeGlass ? Math.min(config.nativeOpacity, strength * 0.16) : 0;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.glassLayer,
        { borderColor: config.borderColor },
        config.preset === 'frosted' && styles.glassLayerFrosted,
      ]}
    >
      {showNativeGlass && nativeGlassOpacity > 0 && (
        <GlassView
          testID={`xcard-${config.preset}-native-glass`}
          style={[
            StyleSheet.absoluteFill,
            styles.nativeGlassSurface,
            { opacity: nativeGlassOpacity },
          ]}
          glassEffectStyle={{
            style: config.nativeStyle,
            animate: true,
            animationDuration: 0.24,
          }}
          tintColor={config.tintColor}
          colorScheme="light"
          isInteractive={config.interactive}
        />
      )}
      <View style={[styles.glassTint, { backgroundColor: config.tintColor, opacity: strength }]} />
      <Animated.View pointerEvents="none" style={styles.ambientSweepClip}>
        <Animated.View
          style={[
            styles.ambientSweepSheen,
            sweepStyle,
          ]}
        />
        <Animated.View
          style={[
            styles.ambientSweepGlow,
            sweepStyle,
          ]}
        />
      </Animated.View>
      <Animated.View style={[styles.touchLens, touchStyle]} />
      <View style={[styles.topRim, { opacity: strength * 1.25 }]} />
      <View style={[styles.leftRim, { opacity: strength * 0.82 }]} />
      <View style={[styles.rightShade, { opacity: strength * 0.55 }]} />
      <View style={[styles.bottomShade, { opacity: strength * 0.72 }]} />
      <View style={[styles.topLeftLens, { opacity: strength * 0.7 }]} />
      <View style={[styles.bottomLeftLens, { opacity: strength * 0.58 }]} />
    </View>
  );
}

export function resolveGlassConfig(glass: XCardGlass): ResolvedGlassConfig {
  if (glass === false) {
    return { ...GLASS_PRESETS.subtle, enabled: false };
  }

  if (glass === true) {
    return GLASS_PRESETS.liquid;
  }

  if (typeof glass === 'string') {
    return GLASS_PRESETS[glass];
  }

  const preset = glass.preset ?? 'liquid';
  return {
    ...GLASS_PRESETS[preset],
    ...glass,
    preset,
    enabled: true,
  };
}

export function getGlassStrength(config: ResolvedGlassConfig) {
  return config.enabled ? clamp01(config.intensity) : 0;
}

function canUseNativeGlass() {
  if (Platform.OS !== 'ios') {
    return false;
  }

  try {
    return isGlassEffectAPIAvailable() && isLiquidGlassAvailable();
  } catch {
    return false;
  }
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

const styles = StyleSheet.create({
  glassLayer: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    backgroundColor: 'transparent',
    boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.24), inset 0 -8px 14px rgba(0, 18, 8, 0.2)',
  },
  glassLayerFrosted: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  nativeGlassSurface: {
    borderRadius: CARD_RADIUS,
  },
  glassTint: {
    ...StyleSheet.absoluteFill,
  },
  ambientSweepClip: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    borderRadius: CARD_RADIUS,
  },
  ambientSweepSheen: {
    position: 'absolute',
    top: '-28%',
    left: -18,
    width: 96,
    height: '156%',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    boxShadow: '0 0 18px 9px rgba(245, 255, 249, 0.12)',
  },
  ambientSweepGlow: {
    position: 'absolute',
    top: '-10%',
    left: -28,
    width: 154,
    height: '118%',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    boxShadow: '0 0 44px 18px rgba(239, 255, 246, 0.08)',
  },
  touchLens: {
    position: 'absolute',
    top: '15%',
    left: '18%',
    width: '54%',
    height: '56%',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    boxShadow: '0 0 28px 14px rgba(225, 255, 239, 0.16)',
  },
  topRim: {
    position: 'absolute',
    top: 1,
    left: 18,
    right: 18,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.76)',
    boxShadow: '0 1px 8px rgba(233, 255, 243, 0.28)',
  },
  leftRim: {
    position: 'absolute',
    top: 22,
    bottom: 22,
    left: 1,
    width: 1,
    backgroundColor: 'rgba(238, 255, 246, 0.55)',
  },
  rightShade: {
    position: 'absolute',
    top: 18,
    right: 0,
    bottom: 18,
    width: 2,
    backgroundColor: 'rgba(0, 28, 13, 0.58)',
  },
  bottomShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 9,
    backgroundColor: 'rgba(0, 20, 9, 0.5)',
  },
  topLeftLens: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 70,
    height: 52,
    borderTopLeftRadius: CARD_RADIUS,
    borderBottomRightRadius: 42,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  bottomLeftLens: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: 78,
    height: 42,
    borderBottomLeftRadius: CARD_RADIUS,
    borderTopRightRadius: 32,
    backgroundColor: 'rgba(242, 255, 248, 0.11)',
  },
});
