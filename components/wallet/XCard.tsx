import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { Dimensions, I18nManager, Platform, StyleSheet, Text, View } from 'react-native';
import { Typography } from '../../constants/Typography';
import PhonkText from '../PhonkText';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/Colors';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = screenWidth - 40;
const CARD_ASPECT_RATIO = 335 / 190;
const CARD_HEIGHT = CARD_WIDTH / CARD_ASPECT_RATIO;

type Props = {
  earnings?: number;
  currency?: string;
  creatorCode?: string;
};

export default function AZxXCard({ earnings = 0, currency = 'XP', creatorCode }: Props) {
  const { t } = useTranslation();
  const isRTL = I18nManager.isRTL;
  const useNativeGlass = canUseNativeGlass();

  return (
    <View style={styles.container}>
      <View style={styles.cardBorder}>
        <View pointerEvents="none" style={styles.borderGlowTopLeft} />
        <View pointerEvents="none" style={styles.borderGlowBottomRight} />
        <View style={styles.cardShell}>
          <View pointerEvents="none" style={styles.backdrop}>
            <View style={styles.greenBloomLeft} />
            <View style={styles.greenBloomRight} />
            <View style={styles.darkDepth} />
          </View>

          {useNativeGlass ? (
            <GlassView
              style={StyleSheet.absoluteFillObject}
              glassEffectStyle={{
                style: 'regular',
                animate: true,
                animationDuration: 0.35,
              }}
              colorScheme="light"
              tintColor={Colors.brandGreen}
              isInteractive
            />
          ) : (
            <View style={styles.fallbackGlass} />
          )}

          <View pointerEvents="none" style={styles.topSheen} />
          <View pointerEvents="none" style={styles.bottomTint} />

          <View pointerEvents="none" style={styles.diagonalGloss} />

          <View pointerEvents="none" style={styles.innerStroke} />

          <View style={styles.cardContent}>
            <View style={[styles.topRow, isRTL && styles.topRowRTL]}>
              <View style={styles.earningsSection}>
                <Text style={styles.earningsLabel}>{t('xcard_cashback_label')}</Text>
                <Text style={styles.earningsAmount}>
                  {earnings.toFixed(2)} {currency}
                </Text>
              </View>

            </View>

            <View style={styles.divider} />

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
      </View>
    </View>
  );
}

function canUseNativeGlass() {
  if (Platform.OS !== 'ios') {
    return false;
  }

  try {
    return isGlassEffectAPIAvailable();
  } catch {
    return false;
  }
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  cardBorder: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 30,
    padding: 1.4,
    overflow: 'hidden',
    backgroundColor: 'rgba(100, 232, 156, 0.34)',
    shadowColor: Colors.brandGreen,
    shadowOpacity: 0.45,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 18,
  },
  borderGlowTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CARD_WIDTH * 0.72,
    height: CARD_HEIGHT * 0.58,
    borderTopLeftRadius: 30,
    borderBottomRightRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  borderGlowBottomRight: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: CARD_WIDTH * 0.58,
    height: CARD_HEIGHT * 0.62,
    borderTopLeftRadius: 110,
    borderBottomRightRadius: 30,
    backgroundColor: 'rgba(0, 95, 48, 0.32)',
  },
  cardShell: {
    flex: 1,
    borderRadius: 29,
    overflow: 'hidden',
    backgroundColor: 'rgba(9, 45, 25, 0.18)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  greenBloomLeft: {
    position: 'absolute',
    left: -42,
    top: -28,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(42, 220, 120, 0.34)',
  },
  greenBloomRight: {
    position: 'absolute',
    right: -50,
    bottom: -60,
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: 'rgba(22, 145, 74, 0.32)',
  },
  darkDepth: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
    backgroundColor: 'rgba(0, 18, 10, 0.22)',
  },
  cardContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 22,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  fallbackGlass: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(170, 255, 205, 0.18)',
  },
  topSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '44%',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  bottomTint: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '46%',
    backgroundColor: 'rgba(37, 180, 96, 0.08)',
  },
  diagonalGloss: {
    position: 'absolute',
    top: -20,
    left: CARD_WIDTH * 0.55,
    width: CARD_WIDTH * 0.26,
    height: CARD_HEIGHT + 60,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    transform: [{ skewX: '-14deg' }],
  },
  innerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 29,
    borderWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.55)',
    borderLeftColor: 'rgba(180, 255, 210, 0.42)',
    borderRightColor: 'rgba(255, 255, 255, 0.26)',
    borderBottomColor: 'rgba(0, 120, 62, 0.55)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  topRowRTL: {
    flexDirection: 'row-reverse',
  },
  earningsSection: {
    flex: 1,
    minWidth: 0,
  },
  earningsLabel: {
    fontSize: 22,
    fontFamily: Typography.poppins.medium,
    color: 'rgba(245, 255, 248, 0.72)',
    marginBottom: 4,
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 2 },
  },
  earningsAmount: {
    fontSize: 46,
    lineHeight: 52,
    fontFamily: Typography.hanson.bold,
    color: 'rgba(245, 255, 248, 0.88)',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 3 },
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
    marginVertical: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
  },
  bottomRowRTL: {
    flexDirection: 'row-reverse',
  },
  creatorCodeContainer: {
    alignItems: 'flex-start',
  },
  creatorCodeContainerRTL: {
    alignItems: 'flex-start',
  },
  creatorCodeSpacer: {
    flex: 1,
  },
  creatorCodeLabel: {
    fontSize: 15,
    fontFamily: Typography.poppins.semiBold,
    color: 'rgba(245, 255, 248, 0.72)',
    letterSpacing: 2.4,
    marginBottom: 2,
  },
  creatorCodeText: {
    fontSize: 28,
    color: 'rgba(245, 255, 248, 0.9)',
    textAlign: 'left',
    textShadowColor: 'rgba(0, 0, 0, 0.38)',
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 2 },
  },
});
