import { I18nManager, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import PhonkText from '../PhonkText';
import { useAppTheme } from '../../context/AppThemeContext';

export default function XCardHeader() {
    const { t, i18n } = useTranslation();
    const { theme } = useAppTheme();
    const isArabic = i18n.language === 'ar' || I18nManager.isRTL;

    return (
        <View style={styles.container}>
            {isArabic ? (
                <Text style={styles.titleArabic}>
                    <Text style={[styles.titleCardArabic, { color: theme.text }]}>{t('xcard_title_card')}</Text>
                    {' '}
                    <Text style={[styles.titleXArabic, { color: theme.brand }]}>{t('xcard_title_x')}</Text>
                </Text>
            ) : (
                <View style={styles.titleRow}>
                    <PhonkText style={[styles.titleX, { color: theme.brand }]}>{t('xcard_title_x')}</PhonkText>
                    <PhonkText style={[styles.titleCard, { color: theme.text }]}>{t('xcard_title_card')}</PhonkText>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        alignItems: 'flex-start',
        paddingStart: 20,
        paddingEnd: 20,
        paddingTop: 16,
        paddingBottom: 12,
    },
    titleRow: {
        flexDirection: 'row',
        gap: 4,
    },
    titleX: {
        fontSize: 28,
    },
    titleCard: {
        fontSize: 28,
    },
    titleArabic: {
        textAlign: 'right',
        writingDirection: 'rtl',
    },
    titleXArabic: {
        fontFamily: 'TajawalBlack',
        fontSize: 32,
        lineHeight: 40,
        writingDirection: 'rtl',
    },
    titleCardArabic: {
        fontFamily: 'TajawalBlack',
        fontSize: 32,
        lineHeight: 40,
        writingDirection: 'rtl',
    },
});
