import type { SharedValue } from 'react-native-reanimated';

export const CARD_MAX_WIDTH = 380;
export const CARD_HORIZONTAL_GUTTER = 40;
export const CARD_ASPECT_RATIO = 2226 / 1235;
export const CARD_RADIUS = 28;

export type XCardInteractionState = {
  halfCardHeight: number;
  halfCardWidth: number;
  isPressing: SharedValue<number>;
  tiltEnabled: boolean;
  tiltX: SharedValue<number>;
  tiltY: SharedValue<number>;
};

export function formatAmount(value: number) {
  if (Number.isInteger(value)) {
    return value.toFixed(0);
  }

  return value.toFixed(2);
}
