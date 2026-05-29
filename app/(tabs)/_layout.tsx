import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';
import Ionicons from '@expo/vector-icons/Ionicons';
import { createBottomTabNavigator } from 'expo-router/js-tabs';
import { withLayoutContext } from 'expo-router';
import { I18nManager, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../../context/AppThemeContext';

const NativeTabsNavigator = createNativeBottomTabNavigator().Navigator;
const JSTabsNavigator = createBottomTabNavigator().Navigator;

const NativeTabs = withLayoutContext(NativeTabsNavigator);
const JSTabs = withLayoutContext(JSTabsNavigator);

export default function TabLayout() {
    const { t } = useTranslation();
    const { theme } = useAppTheme();
    const Tabs = Platform.OS === 'ios' ? NativeTabs : JSTabs;
    const isRTL = I18nManager.isRTL;
    const screenOptions = Platform.OS === 'ios'
        ? {
            tabBarActiveTintColor: theme.brand,
            tabBarInactiveTintColor: theme.iconMuted,
        }
        : {
            tabBarActiveTintColor: theme.brand,
            tabBarInactiveTintColor: theme.iconMuted,
            tabBarStyle: {
                backgroundColor: theme.tabBar,
                borderTopColor: theme.border,
            },
        };

    const screens = [
        <Tabs.Screen
            key="index"
            name="index"
            options={{
                title: t('home'),
                headerShown: false,
                tabBarIcon: (props: any) =>
                    Platform.OS === 'ios'
                        ? ({ sfSymbol: 'house' } as any)
                        : <Ionicons name={props.focused ? 'home' : 'home-outline'} size={24} color={props.color} />,
            }}
        />,
        <Tabs.Screen
            key="map"
            name="map"
            options={{
                title: t('map'),
                headerShown: false,
                tabBarIcon: (props: any) =>
                    Platform.OS === 'ios'
                        ? ({ sfSymbol: 'map.fill' } as any)
                        : <Ionicons name={props.focused ? 'map' : 'map-outline'} size={24} color={props.color} />,
            }}
        />,
        <Tabs.Screen
            key="wallet"
            name="wallet"
            options={{
                title: t('wallet'),
                headerShown: false,
                tabBarIcon: (props: any) =>
                    Platform.OS === 'ios'
                        ? ({ sfSymbol: 'creditcard.fill' } as any)
                        : <Ionicons name={props.focused ? 'card' : 'card-outline'} size={24} color={props.color} />,
            }}
        />,
        <Tabs.Screen
            key="profile"
            name="profile"
            options={{
                title: t('profile'),
                headerShown: false,
                tabBarIcon: (props: any) =>
                    Platform.OS === 'ios'
                        ? ({ sfSymbol: 'person.fill' } as any)
                        : <Ionicons name={props.focused ? 'person' : 'person-outline'} size={24} color={props.color} />,
            }}
        />,
    ];

    return (
        <Tabs screenOptions={screenOptions as any}>
            {isRTL ? [...screens].reverse() : screens}
        </Tabs>
    );
}
