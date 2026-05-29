import { Image, I18nManager, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/Colors';
import { Typography } from '../../constants/Typography';
import { useAppTheme } from '../../context/AppThemeContext';
import { triggerSubtleHaptic } from '../../utils/haptics';

type Props = {
    userName: string;
};

const USER_NAME_PLACEHOLDER = '__USER_NAME__';

export default function GreetingHeader({ userName }: Props) {
    const { t } = useTranslation();
    const { isDark, theme, toggleTheme } = useAppTheme();
    const isRTL = I18nManager.isRTL;
    const textAlignStyle = { textAlign: (isRTL ? 'right' : 'left') as 'right' | 'left' };
    const rawGreeting = t('greeting_line', { name: USER_NAME_PLACEHOLDER });
    const [prefix, suffix] = rawGreeting.split(USER_NAME_PLACEHOLDER);
    const handleToggleTheme = () => {
        triggerSubtleHaptic();
        void toggleTheme();
    };

    const greetingTextBlock = (
        <View style={[styles.textContainer, isRTL && styles.textContainerRTL]}>
            <Text style={[{ color: theme.text, fontFamily: Typography.poppins.medium }, styles.greeting, textAlignStyle]}>
                {prefix}
                <Text style={[{ color: theme.brand, fontFamily: Typography.hanson.bold }, styles.userName]}>{userName}</Text>
                {suffix ?? ''}
            </Text>
            <Text style={[{ color: theme.text, fontFamily: Typography.poppins.medium }, styles.subtitle, textAlignStyle]}>{t('greeting_prompt')}</Text>
        </View>
    );

    const avatarBlock = (
        <TouchableOpacity
            style={styles.avatarContainer}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            onPress={handleToggleTheme}
        >
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.logoTile, borderColor: theme.brand }]}>
                <Image
                    source={isDark ? require('../../assets/images/user-dark.png') : require('../../assets/images/user.png')}
                    style={styles.avatarImage}
                />
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {isRTL ? (
                <>
                    {avatarBlock}
                    {greetingTextBlock}
                </>
            ) : (
                <>
                    {greetingTextBlock}
                    {avatarBlock}
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
    },
    textContainer: {
        flex: 1,
    },
    textContainerRTL: {
        alignItems: 'flex-end',
    },
    greeting: {
        fontSize: 28,
        fontFamily: Typography.poppins.semiBold,
    },
    userName: {
        color: Colors.brandGreen,
    },
    subtitle: {
        fontSize: 28,
        fontFamily: Typography.poppins.semiBold,
    },
    avatarContainer: {
        width: 60,
        height: 60,
    },
    avatarPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: Colors.brandGreen,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
});
