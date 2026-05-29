import Ionicons from '@expo/vector-icons/Ionicons';
import { I18nManager, StyleSheet, Text, View } from 'react-native';
import ScalePressable from '../ScalePressable';
import { Colors } from '../../constants/Colors';
import { Typography } from '../../constants/Typography';
import { triggerSubtleHaptic } from '../../utils/haptics';
import { useTranslation } from 'react-i18next';

type Props = {
    onPress?: () => void;
    label?: string;
    leadingIcon?: keyof typeof Ionicons.glyphMap;
    iconSize?: number;
    iconColor?: string;
    variant?: 'default' | 'compact';
};

export default function SpendButton({
    onPress,
    label,
    leadingIcon,
    iconSize = 16,
    iconColor = '#FFFFFF',
    variant = 'default',
}: Props) {
    const { t } = useTranslation();
    const isRTL = I18nManager.isRTL;
    return (
        <View style={styles.container}>
            <ScalePressable
                style={[
                    styles.button,
                    variant === 'compact' && styles.buttonCompact,
                    isRTL && styles.buttonRTL,
                ]}
                onPress={() => {
                    triggerSubtleHaptic();
                    onPress?.();
                }}
                pressedScale={0.975}
            >
                {leadingIcon && (
                    <Ionicons
                        name={leadingIcon}
                        size={iconSize}
                        color={iconColor}
                        style={[styles.buttonIcon, isRTL && styles.buttonIconRTL]}
                    />
                )}
                <Text style={[styles.buttonText, variant === 'compact' && styles.buttonTextCompact]}>
                    {label || t('spend_button_text')}
                </Text>
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
    buttonCompact: {
        borderRadius: 24,
        paddingVertical: 12,
        paddingHorizontal: 20,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        elevation: 1,
    },
    buttonRTL: {
        flexDirection: 'row-reverse',
    },
    buttonIcon: {
        marginRight: 8,
    },
    buttonIconRTL: {
        marginRight: 0,
        marginLeft: 8,
    },
    buttonText: {
        fontSize: 16,
        fontFamily: Typography.hanson.bold,
        color: '#FFFFFF',
        letterSpacing: 1,
    },
    buttonTextCompact: {
        fontSize: 15,
        letterSpacing: 0.3,
    },
});
