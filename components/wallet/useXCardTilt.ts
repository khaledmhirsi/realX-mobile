import type { GestureResponderEvent, ViewProps } from 'react-native';
import {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import type { XCardInteractionState } from './xCardLayout';

export type XCardTiltConfig = {
  enabled?: boolean;
  maxRotateX?: number;
  maxRotateY?: number;
  activeScale?: number;
  perspective?: number;
  shineOpacity?: number;
};

export type XCardTilt = boolean | XCardTiltConfig;

export type ResolvedTiltConfig = Required<XCardTiltConfig> & {
  enabled: boolean;
};

type UseXCardTiltParams = {
  cardHeight: number;
  cardWidth: number;
  glassStrength: number;
  onPress: () => void;
  tiltConfig: ResolvedTiltConfig;
};

type ResponderProps = Pick<
  ViewProps,
  | 'onMoveShouldSetResponder'
  | 'onResponderGrant'
  | 'onResponderMove'
  | 'onResponderRelease'
  | 'onResponderTerminate'
  | 'onStartShouldSetResponder'
>;

const TILT_PRESET: ResolvedTiltConfig = {
  enabled: true,
  maxRotateX: 8,
  maxRotateY: 10,
  activeScale: 1.025,
  perspective: 900,
  shineOpacity: 0.92,
};

const TILT_SPRING = {
  damping: 16,
  stiffness: 190,
  mass: 0.65,
};

export function useXCardTilt({
  cardHeight,
  cardWidth,
  glassStrength,
  onPress,
  tiltConfig,
}: UseXCardTiltParams) {
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);
  const isPressing = useSharedValue(0);
  const gestureIsActive = useSharedValue(0);
  const halfCardWidth = cardWidth / 2;
  const halfCardHeight = cardHeight / 2;
  const tiltEnabled = tiltConfig.enabled;

  const resetTilt = () => {
    gestureIsActive.value = 0;
    tiltX.value = withSpring(0, TILT_SPRING);
    tiltY.value = withSpring(0, TILT_SPRING);
    isPressing.value = withSpring(0, TILT_SPRING);
  };

  const updateTilt = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;

    if (!isInsideCard(locationX, locationY, cardWidth, cardHeight)) {
      resetTilt();
      return false;
    }

    tiltX.value = clampTouchPoint(locationX, cardWidth) - halfCardWidth;
    tiltY.value = clampTouchPoint(locationY, cardHeight) - halfCardHeight;

    return true;
  };

  const responderProps: ResponderProps = {
    onStartShouldSetResponder: () => tiltEnabled,
    onMoveShouldSetResponder: () => tiltEnabled,
    onResponderGrant: (event) => {
      if (!tiltEnabled || !updateTilt(event)) {
        resetTilt();
        return;
      }

      gestureIsActive.value = 1;
      onPress();
      isPressing.value = withSpring(1, TILT_SPRING);
    },
    onResponderMove: (event) => {
      if (gestureIsActive.value === 0) {
        return;
      }

      updateTilt(event);
    },
    onResponderRelease: resetTilt,
    onResponderTerminate: resetTilt,
  };

  const tiltStyle = useAnimatedStyle(() => {
    const rotateX = tiltEnabled
      ? interpolate(tiltY.value, [-halfCardHeight, halfCardHeight], [tiltConfig.maxRotateX, -tiltConfig.maxRotateX], Extrapolation.CLAMP)
      : 0;
    const rotateY = tiltEnabled
      ? interpolate(tiltX.value, [-halfCardWidth, halfCardWidth], [-tiltConfig.maxRotateY, tiltConfig.maxRotateY], Extrapolation.CLAMP)
      : 0;
    const scale = tiltEnabled
      ? interpolate(isPressing.value, [0, 1], [1, tiltConfig.activeScale], Extrapolation.CLAMP)
      : 1;

    return {
      transform: [
        { perspective: tiltConfig.perspective },
        { rotateX: `${rotateX}deg` },
        { rotateY: `${rotateY}deg` },
        { scale },
      ],
    };
  });

  const glassTouchStyle = useAnimatedStyle(() => {
    const opacity = tiltEnabled
      ? interpolate(isPressing.value, [0, 1], [0, glassStrength * 0.32], Extrapolation.CLAMP)
      : 0;
    const translateX = tiltEnabled
      ? interpolate(tiltX.value, [-halfCardWidth, halfCardWidth], [-cardWidth * 0.18, cardWidth * 0.18], Extrapolation.CLAMP)
      : 0;
    const translateY = tiltEnabled
      ? interpolate(tiltY.value, [-halfCardHeight, halfCardHeight], [-cardHeight * 0.16, cardHeight * 0.16], Extrapolation.CLAMP)
      : 0;

    return {
      opacity,
      transform: [
        { translateX },
        { translateY },
      ],
    };
  });

  return {
    glassTouchStyle,
    responderProps,
    state: {
      halfCardHeight,
      halfCardWidth,
      isPressing,
      tiltEnabled,
      tiltX,
      tiltY,
    } satisfies XCardInteractionState,
    tiltConfig,
    tiltStyle,
  };
}

export function resolveTiltConfig(tilt: XCardTilt): ResolvedTiltConfig {
  if (tilt === false) {
    return { ...TILT_PRESET, enabled: false };
  }

  if (tilt === true) {
    return TILT_PRESET;
  }

  return {
    ...TILT_PRESET,
    ...tilt,
    enabled: tilt.enabled ?? true,
  };
}

function clampTouchPoint(value: number, maxValue: number) {
  return Math.max(0, Math.min(maxValue, value));
}

function isInsideCard(x: number, y: number, width: number, height: number) {
  return x >= 0 && x <= width && y >= 0 && y <= height;
}
