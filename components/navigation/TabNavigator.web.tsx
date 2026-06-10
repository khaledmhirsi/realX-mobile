import Ionicons from '@expo/vector-icons/Ionicons';
import { createBottomTabNavigator } from 'expo-router/js-tabs';
import { withLayoutContext } from 'expo-router';
import { I18nManager } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../../context/AppThemeContext';

const Tabs = withLayoutContext(createBottomTabNavigator().Navigator);

export default function TabNavigator() {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const screens = [
    { name: 'index', title: t('home'), icon: 'home', outlineIcon: 'home-outline' },
    { name: 'map', title: t('map'), icon: 'map', outlineIcon: 'map-outline' },
    { name: 'wallet', title: t('wallet'), icon: 'card', outlineIcon: 'card-outline' },
    { name: 'profile', title: t('profile'), icon: 'person', outlineIcon: 'person-outline' },
  ];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.brand,
        tabBarInactiveTintColor: theme.iconMuted,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.border,
        },
      }}
    >
      {(I18nManager.isRTL ? [...screens].reverse() : screens).map((screen) => (
        <Tabs.Screen
          key={screen.name}
          name={screen.name}
          options={{
            title: screen.title,
            headerShown: false,
            tabBarIcon: (props: any) => (
              <Ionicons
                name={(props.focused ? screen.icon : screen.outlineIcon) as any}
                size={24}
                color={props.color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
