import { StyleSheet, type ViewStyle } from 'react-native';
import { useCallback, useEffect } from 'react';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  type AnimatedStyle,
  type SharedValue,
  runOnUI,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { CARD_RADIUS } from './xCardLayout';

const SHINE_ROTATION_DEGREES = 18;
const SHINE_WIDTH_RATIO = 0.105;
const SHINE_HEIGHT_RATIO = 1.85;
const SHINE_TOP_RATIO = -0.42;
const SHINE_TRACKS = 8;
const SHINE_LOOP_INTERVAL_MS = 1200;
const SHINE_ROTATION = `${SHINE_ROTATION_DEGREES}deg`;
const SHINE_TIMING = {
  duration: 1400,
  easing: Easing.out(Easing.cubic),
};

type UseXCardShineParams = {
  cardHeight: number;
  cardWidth: number;
  shineOpacity: number;
  tiltEnabled: boolean;
};

type XCardShineLayerProps = {
  cardHeight: number;
  shineHeight: number;
  shineSweepStyles: AnimatedStyle<ViewStyle>[];
  shineWidth: number;
};

export default function XCardShineLayer({
  cardHeight,
  shineHeight,
  shineSweepStyles,
  shineWidth,
}: XCardShineLayerProps) {
  return (
    <Animated.View pointerEvents="none" style={styles.shineClip}>
      {shineSweepStyles.map((shineSweepStyle, index) => (
        <Animated.View
          key={index}
          style={[
            styles.shineSweep,
            {
              top: cardHeight * SHINE_TOP_RATIO,
              width: shineWidth,
              height: shineHeight,
            },
            shineSweepStyle,
          ]}
        />
      ))}
    </Animated.View>
  );
}

export function useXCardShine({
  cardHeight,
  cardWidth,
  shineOpacity,
  tiltEnabled,
}: UseXCardShineParams) {
  const shineWidth = cardWidth * SHINE_WIDTH_RATIO;
  const shineHeight = cardHeight * SHINE_HEIGHT_RATIO;
  const shineTravel = getShineTravel(cardWidth, shineWidth, shineHeight);
  const progressA = useSharedValue(1);
  const progressB = useSharedValue(1);
  const progressC = useSharedValue(1);
  const progressD = useSharedValue(1);
  const progressE = useSharedValue(1);
  const progressF = useSharedValue(1);
  const progressG = useSharedValue(1);
  const progressH = useSharedValue(1);
  const trackIndex = useSharedValue(0);

  const triggerShine = useCallback(() => {
    'worklet';
    const activeTrack = Math.round(trackIndex.value) % SHINE_TRACKS;
    const progress =
      activeTrack === 0
        ? progressA
        : activeTrack === 1
          ? progressB
          : activeTrack === 2
            ? progressC
            : activeTrack === 3
              ? progressD
              : activeTrack === 4
                ? progressE
                : activeTrack === 5
                  ? progressF
                  : activeTrack === 6
                    ? progressG
                    : progressH;
    trackIndex.value = (trackIndex.value + 1) % SHINE_TRACKS;
    progress.value = 0;
    progress.value = withTiming(1, SHINE_TIMING);
  }, [progressA, progressB, progressC, progressD, progressE, progressF, progressG, progressH, trackIndex]);

  useEffect(() => {
    if (!tiltEnabled) {
      return;
    }

    runOnUI(triggerShine)();
    const intervalId = setInterval(() => {
      runOnUI(triggerShine)();
    }, SHINE_LOOP_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [tiltEnabled, triggerShine]);

  const shineSweepStyles = [
    useShineSweepStyle(progressA, tiltEnabled, shineOpacity, shineTravel.startX, shineTravel.endX),
    useShineSweepStyle(progressB, tiltEnabled, shineOpacity, shineTravel.startX, shineTravel.endX),
    useShineSweepStyle(progressC, tiltEnabled, shineOpacity, shineTravel.startX, shineTravel.endX),
    useShineSweepStyle(progressD, tiltEnabled, shineOpacity, shineTravel.startX, shineTravel.endX),
    useShineSweepStyle(progressE, tiltEnabled, shineOpacity, shineTravel.startX, shineTravel.endX),
    useShineSweepStyle(progressF, tiltEnabled, shineOpacity, shineTravel.startX, shineTravel.endX),
    useShineSweepStyle(progressG, tiltEnabled, shineOpacity, shineTravel.startX, shineTravel.endX),
    useShineSweepStyle(progressH, tiltEnabled, shineOpacity, shineTravel.startX, shineTravel.endX),
  ];

  return {
    shineLayerProps: {
      cardHeight,
      shineHeight,
      shineSweepStyles,
      shineWidth,
    },
    triggerShine,
  };
}

function useShineSweepStyle(
  progress: SharedValue<number>,
  tiltEnabled: boolean,
  shineOpacity: number,
  startX: number,
  endX: number,
) {
  return useAnimatedStyle(() => {
    const opacity = tiltEnabled
      ? interpolate(
          progress.value,
          [0, 0.08, 0.72, 1],
          [0, shineOpacity, shineOpacity * 0.52, 0],
          Extrapolation.CLAMP,
        )
      : 0;
    const translateX = interpolate(progress.value, [0, 1], [startX, endX], Extrapolation.CLAMP);

    return {
      opacity,
      transform: [
        { translateX },
        { rotate: SHINE_ROTATION },
      ],
    };
  });
}

function getShineTravel(cardWidth: number, shineWidth: number, shineHeight: number) {
  const angle = (SHINE_ROTATION_DEGREES * Math.PI) / 180;
  const rotatedHalfWidth = (shineWidth * Math.abs(Math.cos(angle)) + shineHeight * Math.abs(Math.sin(angle))) / 2;

  return {
    startX: -(shineWidth / 2 + rotatedHalfWidth),
    endX: cardWidth - shineWidth / 2 + rotatedHalfWidth,
  };
}

const styles = StyleSheet.create({
  shineClip: {
    ...StyleSheet.absoluteFill,
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
  },
  shineSweep: {
    position: 'absolute',
    left: 0,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.48)',
    boxShadow: '0 0 26px 11px rgba(245, 255, 249, 0.38)',
  },
});
