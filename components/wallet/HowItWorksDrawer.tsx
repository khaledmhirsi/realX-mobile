import { BottomSheet, RNHostView } from '@expo/ui';
import { presentationBackground } from '@expo/ui/swift-ui/modifiers';
import {
    I18nManager,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Typography } from '../../constants/Typography';
import PhonkText from '../PhonkText';
import { useAppTheme } from '../../context/AppThemeContext';
import { toArabicDigits } from '../../utils/numbers';

type Props = {
    visible: boolean;
    onClose: () => void;
};

type StepData = {
    number: string;
    text: string;
};

const HOW_IT_WORKS_SHEET_FRACTION = 0.62;

type StepItemProps = {
    step: StepData;
    isArabic: boolean;
};

function StepItem({ step, isArabic }: StepItemProps) {
    const { theme } = useAppTheme();

    return (
        <View
            style={[
                styles.stepItem,
                { backgroundColor: theme.cardMuted },
                isArabic ? styles.stepItemRTL : styles.stepItemLTR,
            ]}
        >
            <View style={styles.stepNumberColumn}>
                <PhonkText
                    style={[
                        styles.stepNumber,
                        isArabic && styles.stepNumberRTL,
                        { color: theme.brand },
                    ]}
                >
                    {isArabic ? toArabicDigits(step.number) : step.number}
                </PhonkText>
            </View>
            <Text
                style={[
                    styles.stepText,
                    isArabic && styles.stepTextRTL,
                    {
                        color: theme.text,
                        textAlign: isArabic ? 'right' : 'left',
                        writingDirection: isArabic ? 'rtl' : 'ltr',
                    },
                ]}
            >
                {step.text}
            </Text>
        </View>
    );
}

export default function HowItWorksDrawer({ visible, onClose }: Props) {
    const insets = useSafeAreaInsets();
    const { height, width } = useWindowDimensions();
    const { t, i18n } = useTranslation();
    const { theme } = useAppTheme();
    const isArabic = i18n.language === 'ar' || I18nManager.isRTL;
    const sheetMaxHeight = Math.max(0, height * HOW_IT_WORKS_SHEET_FRACTION - insets.bottom);

    const steps: StepData[] = [
        { number: '1', text: t('how_it_works_step_1') },
        { number: '2', text: t('how_it_works_step_2') },
        { number: '3', text: t('how_it_works_step_3') },
        { number: '4', text: t('how_it_works_step_4') },
        { number: '5', text: t('how_it_works_step_5') },
    ];

    return (
        <BottomSheet
            isPresented={visible}
            onDismiss={onClose}
            modifiers={Platform.OS === 'ios' ? [presentationBackground(theme.surfaceElevated)] : undefined}
            snapPoints={[{ fraction: HOW_IT_WORKS_SHEET_FRACTION }]}
            testID="xcard-how-it-works-bottom-sheet"
        >
            <RNHostView matchContents>
                <View
                    style={[
                        styles.sheetContent,
                        { backgroundColor: theme.surfaceElevated },
                        { width },
                        { maxHeight: sheetMaxHeight },
                        { paddingBottom: Math.max(insets.bottom, 10) },
                    ]}
                >
                    <ScrollView
                        style={[styles.content, { maxHeight: sheetMaxHeight }]}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        bounces={false}
                        nestedScrollEnabled
                    >
                        {/* Logo */}
                        <View style={styles.logoContainer}>
                            {isArabic ? (
                                <Text style={styles.logoArabicText}>
                                    <Text style={[styles.logoCardArabic, { color: theme.text }]}>{t('xcard_title_card')}</Text>
                                    {' '}
                                    <Text style={[styles.logoXArabic, { color: theme.brand }]}>{t('xcard_title_x')}</Text>
                                </Text>
                            ) : (
                                <>
                                    <PhonkText style={[styles.logoX, { color: theme.brand }]}>{t('xcard_title_x')}</PhonkText>
                                    <PhonkText style={[styles.logoCard, { color: theme.text }]}>{t('xcard_title_card')}</PhonkText>
                                </>
                            )}
                        </View>

                        {/* Divider */}
                        <View style={[styles.divider, { backgroundColor: theme.border }]} />

                        {/* Title */}
                        <View
                            style={[
                                styles.titleContainer,
                                isArabic && styles.titleContainerRTL,
                            ]}
                        >
                            <PhonkText style={[styles.titleText, { color: theme.text }]}>{t('how_it_works_title_prefix')}</PhonkText>
                            <PhonkText style={[styles.titleHighlight, { color: theme.brand }]}>{t('how_it_works_title_highlight')}</PhonkText>
                            <PhonkText style={[styles.titleText, { color: theme.text }]}>{t('how_it_works_title_suffix')}</PhonkText>
                        </View>

                        {/* Steps */}
                        <View style={styles.stepsContainer}>
                            {steps.map((step) => (
                                <StepItem key={step.number} step={step} isArabic={isArabic} />
                            ))}
                        </View>
                    </ScrollView>
                </View>
            </RNHostView>
        </BottomSheet>
    );
}

const styles = StyleSheet.create({
    sheetContent: {
        paddingTop: 12,
        alignSelf: 'center',
    },
    content: {
        flexGrow: 0,
        width: '100%',
    },
    scrollContent: {
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 10,
        paddingBottom: 14,
    },
    logoArabicText: {
        textAlign: 'center',
        writingDirection: 'rtl',
    },
    logoX: {
        fontSize: 28,
    },
    logoCard: {
        fontSize: 28,
    },
    logoXArabic: {
        fontFamily: 'TajawalBlack',
        fontSize: 32,
        lineHeight: 40,
        writingDirection: 'rtl',
    },
    logoCardArabic: {
        fontFamily: 'TajawalBlack',
        fontSize: 32,
        lineHeight: 40,
        writingDirection: 'rtl',
    },
    divider: {
        height: 1,
        marginHorizontal: 20,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 18,
        paddingBottom: 16,
    },
    titleContainerRTL: {
        direction: 'rtl',
    },
    titleText: {
        fontSize: 22,
    },
    titleHighlight: {
        fontSize: 22,
    },
    stepsContainer: {
        width: '100%',
        alignSelf: 'center',
        gap: 8,
        paddingBottom: 4,
    },
    stepItem: {
        width: '100%',
        alignSelf: 'stretch',
        alignItems: 'center',
        justifyContent: 'flex-start',
        borderRadius: 16,
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 20,
        minHeight: 54,
    },
    stepItemLTR: {
        flexDirection: 'row',
    },
    stepItemRTL: {
        flexDirection: 'row-reverse',
        direction: 'rtl',
    },
    stepNumber: {
        fontSize: 28,
        lineHeight: 32,
        textAlign: 'center',
    },
    stepNumberRTL: {
        fontSize: 34,
        lineHeight: 40,
    },
    stepNumberColumn: {
        width: 42,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepText: {
        flex: 1,
        fontSize: 18,
        lineHeight: 26,
        fontFamily: Typography.poppins.medium,
    },
    stepTextRTL: {
        fontSize: 20,
        lineHeight: 28,
    },
});
