import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View, I18nManager } from 'react-native';
import { useAppTheme } from '../../context/AppThemeContext';
import { Typography } from '../../constants/Typography';
import RestaurantCard from './RestaurantCard';

type Restaurant = {
    id: string;
    name: string;
    nameAr?: string;
    cashbackText?: string;
    discountText?: string;
    isTrending?: boolean;
    imageUri?: string;
    logoUri?: string;
    xcardEnabled?: boolean;
};

type Props = {
    title?: string;
    mainCategory?: string;
    restaurants?: Restaurant[];
    onRestaurantPress?: (restaurant: Restaurant) => void;
};

export default function BrowseSection({
    title,
    mainCategory,
    restaurants = [],
    onRestaurantPress,
}: Props) {
    const { t, i18n } = useTranslation();
    const { theme } = useAppTheme();
    const isArabic = i18n.language === 'ar' || I18nManager.isRTL;

    const displayTitle = title || (mainCategory 
        ? t('browse_main_category', { category: mainCategory }) 
        : t('browse_food_fallback'));

    return (
        <View style={styles.container}>
            <View style={styles.headerContainer}>
                <Text style={[
                    styles.headerTitle,
                    { 
                      color: theme.text,
                      textAlign: isArabic ? 'right' : 'left',
                      writingDirection: isArabic ? 'rtl' : 'ltr'
                    }
                ]}>
                    {displayTitle}
                </Text>
            </View>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {restaurants.map((restaurant) => (
                    <RestaurantCard
                        key={restaurant.id}
                        id={restaurant.id}
                        name={restaurant.name}
                        nameAr={restaurant.nameAr}
                        cashbackText={restaurant.cashbackText}
                        discountText={restaurant.discountText}
                        isTrending={restaurant.isTrending}
                        imageUri={restaurant.imageUri}
                        logoUri={restaurant.logoUri}
                        xcardEnabled={restaurant.xcardEnabled}
                        onPress={() => onRestaurantPress?.(restaurant)}
                        style={{ width: 170 }}
                    />
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingBottom: 16,
    },
    headerContainer: {
        paddingHorizontal: 20,
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: Typography.poppins.semiBold,
    },
    scrollContent: {
        paddingHorizontal: 20,
        gap: 12,
    },
});
