import { I18nManager, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Typography } from '../../constants/Typography';
import { useAppTheme } from '../../context/AppThemeContext';
import MascotThemeButton from './MascotThemeButton';

type Props = {
    userName: string;
};

const USER_NAME_PLACEHOLDER = '__USER_NAME__';

export default function GreetingHeader({ userName }: Props) {
    const { t, i18n } = useTranslation();
    const { theme } = useAppTheme();
    const isRTL = i18n.language === 'ar' || I18nManager.isRTL;
    const textAlignStyle = { textAlign: (isRTL ? 'right' : 'left') as 'right' | 'left' };
    const rawGreeting = t('greeting_line', { name: USER_NAME_PLACEHOLDER });
    const [prefix, suffix] = rawGreeting.split(USER_NAME_PLACEHOLDER);

    const greetingTextBlock = (
        <View style={[styles.textContainer, isRTL && styles.textContainerRTL]}>
            <Text style={[{ color: theme.text, fontFamily: Typography.poppins.medium }, styles.greeting, textAlignStyle]}>
                {prefix}
                <Text style={{ color: theme.brand, fontFamily: Typography.hanson.bold }}>{userName}</Text>
                {suffix ?? ''}
            </Text>
            <Text style={[{ color: theme.text, fontFamily: Typography.poppins.medium }, styles.subtitle, textAlignStyle]}>{t('greeting_prompt')}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            {greetingTextBlock}
            <MascotThemeButton />
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
        alignItems: 'flex-start',
    },
    greeting: {
        fontSize: 28,
        fontFamily: Typography.poppins.semiBold,
    },
    subtitle: {
        fontSize: 28,
        fontFamily: Typography.poppins.semiBold,
    },
});
