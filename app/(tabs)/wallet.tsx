import { useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  HelpLink,
  HowItWorksDrawer,
  RecentRedemptions,
  SpendButton,
  SpendCardDrawer,
  XCard,
  XCardHeader,
} from '../../components/wallet';
import { useStudent } from '../../context/StudentContext';
import { useAppTheme } from '../../context/AppThemeContext';

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const { studentData } = useStudent();
  const { isDark, theme } = useAppTheme();
  const balance = typeof studentData?.cashback === 'number' ? studentData.cashback : 0;
  const creatorCode = studentData?.creatorCode;
  const currency = 'XP';

  const [isHelpDrawerVisible, setIsHelpDrawerVisible] = useState(false);
  const [isSpendDrawerVisible, setIsSpendDrawerVisible] = useState(false);

  const handleSpendPress = () => {
    setIsSpendDrawerVisible(true);
  };

  const handleSpendDrawerClose = () => {
    setIsSpendDrawerVisible(false);
  };

  const handleHelpPress = () => {
    setIsHelpDrawerVisible(true);
  };

  const handleHelpDrawerClose = () => {
    setIsHelpDrawerVisible(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />
      <ScrollView
        style={[styles.scrollView, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <XCardHeader />
        <XCard earnings={balance} currency={currency} creatorCode={creatorCode} />
        <SpendButton onPress={handleSpendPress} />
        <HelpLink onPress={handleHelpPress} />
        <RecentRedemptions />
      </ScrollView>

      <HowItWorksDrawer
        visible={isHelpDrawerVisible}
        onClose={handleHelpDrawerClose}
      />

      <SpendCardDrawer
        visible={isSpendDrawerVisible}
        onClose={handleSpendDrawerClose}
        balance={balance}
        currency={currency}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
});
