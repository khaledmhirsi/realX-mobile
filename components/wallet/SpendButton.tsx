import { I18nManager, StyleSheet, Text, View } from 'react-native';
import ScalePressable from '../ScalePressable';
import { Colors } from '../../constants/Colors';
import { Typography } from '../../constants/Typography';
import { triggerSubtleHaptic } from '../../utils/haptics';
import { useTranslation } from 'react-i18next';

type Props = {
    onPress?: () => void;
};

export default function SpendButton({ onPress }: Props) {
    const { t } = useTranslation();
    const isRTL = I18nManager.isRTL;
    return (
        <View style={styles.container}>
            <ScalePressable
                style={[styles.button, isRTL && styles.buttonRTL]}
                onPress={() => {
                    triggerSubtleHaptic();
                    onPress?.();
                }}
                pressedScale={0.975}
            >
                <Text style={styles.buttonText}>{t('spend_button_text')}</Text>
            </ScalePressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    button: {
        backgroundColor: Colors.brandGreen,
        borderRadius: 30,
        paddingVertical: 18,
        paddingHorizontal: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: Colors.brandGreen,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonRTL: {
        flexDirection: 'row-reverse',
    },
    buttonText: {
        fontSize: 16,
        fontFamily: Typography.hanson.bold,
        color: '#FFFFFF',
        letterSpacing: 1,
    },
});
