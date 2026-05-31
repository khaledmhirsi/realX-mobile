import { GlassView } from 'expo-glass-effect';
import {
    I18nManager,
    Modal,
    Pressable,
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

type Props = {
    visible: boolean;
    onClose: () => void;
};

type StepData = {
    number: string;
    text: string;
};

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
                    {step.number}
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
    const { height } = useWindowDimensions();
    const { t, i18n } = useTranslation();
    const { theme } = useAppTheme();
    const isArabic = i18n.language === 'ar' || I18nManager.isRTL;

    const steps: StepData[] = [
        { number: '1', text: t('how_it_works_step_1') },
        { number: '2', text: t('how_it_works_step_2') },
        { number: '3', text: t('how_it_works_step_3') },
        { number: '4', text: t('how_it_works_step_4') },
        { number: '5', text: t('how_it_works_step_5') },
    ];

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <GlassView style={StyleSheet.absoluteFill} glassEffectStyle="regular" colorScheme="dark" tintColor={theme.overlay} />
                <Pressable
                    style={[
                        styles.drawerContainer,
                        { backgroundColor: theme.surfaceElevated },
                        { maxHeight: height * 0.85 },
                        { paddingBottom: insets.bottom + 20 },
                    ]}
                    onPress={(e) => e.stopPropagation()}
                >
                    {/* Drawer Handle */}
                    <View style={styles.handleContainer}>
                        <View style={[styles.handle, { backgroundColor: theme.borderStrong }]} />
                    </View>

                    <ScrollView
                        style={styles.content}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        bounces={false}
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
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'transparent',
        justifyContent: 'flex-end',
    },
    drawerContainer: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    handleContainer: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 8,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
    },
    content: {
        flexGrow: 0,
    },
    scrollContent: {
        width: '100%',
        alignItems: 'stretch',
        paddingHorizontal: 24,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 20,
        paddingBottom: 24,
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
        paddingTop: 28,
        paddingBottom: 24,
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
        alignSelf: 'stretch',
        gap: 12,
        paddingBottom: 20,
    },
    stepItem: {
        width: '100%',
        alignSelf: 'stretch',
        alignItems: 'center',
        justifyContent: 'flex-start',
        borderRadius: 16,
        paddingVertical: 18,
        paddingHorizontal: 20,
        minHeight: 68,
    },
    stepItemLTR: {
        flexDirection: 'row',
    },
    stepItemRTL: {
        flexDirection: 'row-reverse',
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
