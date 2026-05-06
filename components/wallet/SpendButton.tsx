import { I18nManager, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Typography } from '../../constants/Typography';
import { useTranslation } from 'react-i18next';

type Props = {
    onPress?: () => void;
};

export default function SpendButton({ onPress }: Props) {
    const { t } = useTranslation();
    const isRTL = I18nManager.isRTL;
    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={[styles.button, isRTL && styles.buttonRTL]}
                onPress={onPress}
                activeOpacity={0.85}
            >
                <Text style={[styles.lightningIcon, isRTL && styles.lightningIconRTL]}>⚡</Text>
                <Text style={styles.buttonText}>{t('spend_button_text')}</Text>
            </TouchableOpacity>
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
    lightningIcon: {
        fontSize: 18,
        marginRight: 10,
    },
    lightningIconRTL: {
        marginRight: 0,
        marginLeft: 10,
    },
    buttonText: {
        fontSize: 16,
        fontFamily: Typography.hanson.bold,
        color: '#FFFFFF',
        letterSpacing: 1,
    },
});
