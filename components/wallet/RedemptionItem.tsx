import { I18nManager, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Colors } from '../../constants/Colors';
import { Typography } from '../../constants/Typography';
import { useTranslation } from 'react-i18next';
import { toArabicDigits } from '../../utils/numbers';
import { useAppTheme } from '../../context/AppThemeContext';

export type RedemptionData = {
    id: string;
    merchantName: string;
    date: string;
    offerType: string;
    savedAmount: number;
    totalBill: number;
    remainingToPay: number;
    currency: string;
    logoPlaceholder?: string;
    logoBackgroundColor?: string;
    logoUrl?: string | null;
};

type Props = {
    item: RedemptionData;
};

export default function RedemptionItem({ item }: Props) {
    const isRTL = I18nManager.isRTL;
    const { t, i18n } = useTranslation();
    const { theme } = useAppTheme();
    const isArabic = i18n.language === 'ar';
    const fmt = (n: number) => isArabic ? toArabicDigits(n.toFixed(2)) : n.toFixed(2);

    return (
        <View style={[styles.container, { backgroundColor: theme.background }, isRTL && styles.containerRTL]}>
            {/* Merchant Logo */}
            <View style={[
                styles.logoContainer,
                { backgroundColor: item.logoBackgroundColor || '#F5F5F5' },
                isRTL ? { marginLeft: 14 } : { marginRight: 14 },
            ]}>
                {item.logoUrl ? (
                    <Image source={{ uri: item.logoUrl }} style={styles.logoImage} contentFit="cover" />
                ) : (
                    <Text style={styles.logoText}>
                        {item.logoPlaceholder || item.merchantName.substring(0, 2).toUpperCase()}
                    </Text>
                )}
            </View>

            {/* Merchant Info */}
            <View style={styles.infoContainer}>
                <Text style={[styles.dateText, { color: theme.subtleText, textAlign: isRTL ? 'right' : 'left' }]}>
                    {item.date}
                </Text>
                <Text style={[styles.merchantName, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>
                    {item.merchantName}
                </Text>
                <Text style={[styles.offerType, { color: theme.mutedText, textAlign: isRTL ? 'right' : 'left' }]}>
                    {item.offerType}
                </Text>
            </View>

            {/* Saved Amount */}
            <View style={[styles.savedContainer, isRTL && { alignItems: 'flex-start' }]}> 
                <Text style={styles.savedLabel}>
                    {fmt(item.savedAmount)} {item.currency}
                </Text>
                <Text style={[styles.totalBillText, { color: theme.subtleText, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t('instead_of', {
                        total: fmt(item.totalBill),
                        currency: item.currency,
                    })}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
    },
    containerRTL: {
        flexDirection: 'row-reverse',
    },
    logoContainer: {
        width: 50,
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    logoText: {
        fontSize: 12,
        fontFamily: Typography.poppins.semiBold,
        color: '#FFFFFF',
    },
    logoImage: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
    },
    infoContainer: {
        flex: 1,
    },
    dateText: {
        fontSize: 11,
        fontFamily: Typography.poppins.medium,
        marginBottom: 2,
    },
    merchantName: {
        fontSize: 16,
        fontFamily: Typography.poppins.semiBold,
        marginBottom: 2,
    },
    offerType: {
        fontSize: 12,
        fontFamily: Typography.poppins.medium,
    },
    savedContainer: {
        alignItems: 'flex-end',
        marginTop: 16,
    },
    savedLabel: {
        fontSize: 18,
        fontFamily: Typography.poppins.semiBold,
        color: Colors.brandGreen,
    },
    totalBillText: {
        fontSize: 11,
        fontFamily: Typography.poppins.medium,
    },
});
