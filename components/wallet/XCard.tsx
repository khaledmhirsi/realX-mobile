import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { I18nManager, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Typography } from '../../constants/Typography';
import PhonkText from '../PhonkText';
import XCardGlassLayer, {
  getGlassStrength,
  resolveGlassConfig,
  type XCardGlass,
  type XCardGlassConfig,
  type XCardGlassPreset,
} from './XCardGlassLayer';
import XCardLogoLayer from './XCardLogoLayer';
import XCardShineLayer, { useXCardShine } from './XCardShineLayer';
import {
  CARD_ASPECT_RATIO,
  CARD_HORIZONTAL_GUTTER,
  CARD_MAX_WIDTH,
  CARD_RADIUS,
  formatAmount,
} from './xCardLayout';
import { resolveTiltConfig, type XCardTilt, type XCardTiltConfig, useXCardTilt } from './useXCardTilt';

export type { XCardGlass, XCardGlassConfig, XCardGlassPreset, XCardTilt, XCardTiltConfig };

const xCardBackground = require('../../assets/images/xcard-background.png');

type Props = {
  earnings?: number;
  currency?: string;
  creatorCode?: string;
  glass?: XCardGlass;
  tilt?: XCardTilt;
};

export default function XCard({ earnings = 0, currency = 'XP', creatorCode, glass = 'liquid', tilt = true }: Props) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isRTL = I18nManager.isRTL;
  const cardWidth = Math.min(width - CARD_HORIZONTAL_GUTTER, CARD_MAX_WIDTH);
  const cardHeight = cardWidth / CARD_ASPECT_RATIO;
  const amount = formatAmount(earnings);
  const glassConfig = resolveGlassConfig(glass);
  const glassStrength = getGlassStrength(glassConfig);
  const tiltConfig = resolveTiltConfig(tilt);
  const { shineLayerProps, triggerShine } = useXCardShine({
    cardHeight,
    cardWidth,
    shineOpacity: tiltConfig.shineOpacity,
    tiltEnabled: tiltConfig.enabled,
  });
  const {
    glassTouchStyle,
    responderProps,
    state: tiltState,
    tiltStyle,
  } = useXCardTilt({
    cardHeight,
    cardWidth,
    glassStrength,
    onPress: triggerShine,
    tiltConfig,
  });

  return (
    <View style={styles.container}>
      <Animated.View
        {...responderProps}
        style={[styles.tiltFrame, { width: cardWidth, height: cardHeight }, tiltStyle]}
      >
        <View style={styles.card}>
          <Image
            source={xCardBackground}
            style={styles.cardArtwork}
            contentFit="cover"
            transition={120}
          />
          <XCardGlassLayer config={glassConfig} strength={glassStrength} touchStyle={glassTouchStyle} />
          <XCardShineLayer {...shineLayerProps} />
          <XCardLogoLayer cardHeight={cardHeight} cardWidth={cardWidth} {...tiltState} />
          <View
            pointerEvents="none"
            style={[
              styles.innerStroke,
              { borderColor: glassConfig.enabled ? glassConfig.borderColor : 'rgba(28, 197, 84, 0.32)' },
            ]}
          />

          <View style={[styles.cardContent, isRTL && styles.cardContentRTL]}>
            <View style={styles.earningsSection}>
              <Text style={[styles.earningsLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
                {t('xcard_cashback_label')}
              </Text>
              <Text style={[styles.earningsAmount, { textAlign: isRTL ? 'right' : 'left' }]}>
                {amount} {currency}
              </Text>
            </View>

            <View style={[styles.bottomRow, isRTL && styles.bottomRowRTL]}>
              {creatorCode ? (
                <View style={[styles.creatorCodeContainer, isRTL && styles.creatorCodeContainerRTL]}>
                  <Text style={styles.creatorCodeLabel}>{t('xcard_creator_code_label')}</Text>
                  <PhonkText style={styles.creatorCodeText}>{creatorCode}</PhonkText>
                </View>
              ) : (
                <View style={styles.creatorCodeSpacer} />
              )}
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  tiltFrame: {
    borderRadius: CARD_RADIUS,
    boxShadow: '0 14px 32px rgba(8, 74, 41, 0.18)',
  },
  card: {
    flex: 1,
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    backgroundColor: '#052B18',
  },
  cardArtwork: {
    ...StyleSheet.absoluteFillObject,
  },
  innerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
  },
  cardContent: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 18,
    justifyContent: 'space-between',
  },
  cardContentRTL: {
    alignItems: 'flex-end',
  },
  earningsSection: {
    maxWidth: '78%',
  },
  earningsLabel: {
    fontSize: 17,
    lineHeight: 22,
    fontFamily: Typography.poppins.semiBold,
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.18)',
    textShadowRadius: 8,
  },
  earningsAmount: {
    fontSize: 29,
    lineHeight: 35,
    fontFamily: Typography.hanson.bold,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.18)',
    textShadowRadius: 10,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    minHeight: 30,
  },
  bottomRowRTL: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
  },
  creatorCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    maxWidth: '62%',
    gap: 8,
  },
  creatorCodeContainerRTL: {
    flexDirection: 'row-reverse',
    alignSelf: 'flex-start',
  },
  creatorCodeSpacer: {
    minHeight: 30,
  },
  creatorCodeLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: Typography.poppins.semiBold,
    color: 'rgba(255, 255, 255, 0.74)',
  },
  creatorCodeText: {
    fontSize: 20,
    lineHeight: 24,
    color: 'rgba(255, 255, 255, 0.92)',
    textShadowColor: 'rgba(0, 0, 0, 0.24)',
    textShadowRadius: 8,
  },
});
