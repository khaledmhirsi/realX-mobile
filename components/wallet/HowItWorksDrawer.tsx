import { GlassView } from 'expo-glass-effect';
import {
    Dimensions,
    I18nManager,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Typography } from '../../constants/Typography';
import PhonkText from '../PhonkText';
import { useAppTheme } from '../../context/AppThemeContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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
                <PhonkText style={[styles.stepNumber, { color: theme.brand }]}>
                    {step.number}
                </PhonkText>
            </View>
            <Text
                style={[
                    styles.stepText,
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
                        showsVerticalScrollIndicator={false}
                        bounces={false}
                    >
                        {/* Logo */}
                        <View style={[styles.logoContainer, isArabic && styles.logoContainerRTL]}>
                            <PhonkText style={[styles.logoX, { color: theme.brand }]}>{t('xcard_title_x')}</PhonkText>
                            <PhonkText style={[styles.logoCard, { color: theme.text }]}>{t('xcard_title_card')}</PhonkText>
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
        maxHeight: SCREEN_HEIGHT * 0.85,
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
        paddingHorizontal: 24,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 20,
        paddingBottom: 24,
    },
    logoContainerRTL: {
        flexDirection: 'row-reverse',
    },
    logoX: {
        fontSize: 28,
    },
    logoCard: {
        fontSize: 28,
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
        gap: 12,
        paddingBottom: 20,
    },
    stepItem: {
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
        fontSize: 22,
    },
    stepNumberColumn: {
        width: 42,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepText: {
        fontSize: 16,
        fontFamily: Typography.poppins.medium,
        flex: 1,
    },
});
