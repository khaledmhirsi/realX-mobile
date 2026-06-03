import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { memo, useMemo } from 'react';
import { I18nManager, ImageSourcePropType, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '../../context/AppThemeContext';
import { Typography } from '../../constants/Typography';

type Props = {
    title: string;
    icon?: string | ImageSourcePropType;
    onBackPress?: () => void;
};

function CategoryHeader({ title, icon, onBackPress }: Props) {
    const { theme } = useAppTheme();
    const imageSource = useMemo(() => {
        if (typeof icon === 'string') {
            return { uri: icon };
        }
        return icon;
    }, [icon]);

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.backButton}
                onPress={onBackPress}
                activeOpacity={0.7}
            >
                <Ionicons name={I18nManager.isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={theme.icon} />
            </TouchableOpacity>


            <View style={styles.titleContainer}>
                {icon && (
                    <Image
                        source={imageSource}
                        style={styles.imageIcon}

                        contentFit="cover"
                    />
                )}
                <Text style={[styles.title, { color: theme.text }, I18nManager.isRTL && styles.titleRTL]}>{title}</Text>
            </View>
        </View>
    );
}

export default memo(CategoryHeader);

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        fontSize: 22,
        fontFamily: Typography.poppins.semiBold,
    },
    titleRTL: {
        textAlign: 'right',
        writingDirection: 'rtl',
    },
    imageIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
});
