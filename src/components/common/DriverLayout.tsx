import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import MobileHeader from './MobileHeader';
import BottomNavigation from './BottomNavigation';
import { driverTheme } from '../../theme/driverTheme';

interface DriverLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
  currentTab?: string;
}

const DriverLayout: React.FC<DriverLayoutProps> = ({
  children,
  title,
  showBackButton,
  onBackClick,
  currentTab,
}) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.wrapper}>
        {/* Header */}
        <MobileHeader
          title={title}
          showBackButton={showBackButton}
          onBackClick={onBackClick}
        />

        {/* Main Content */}
        <View style={styles.content}>{children}</View>

        {/* Bottom Navigation */}
        <BottomNavigation currentTab={currentTab} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: driverTheme.colors.background.default,
  },
  wrapper: {
    flex: 1,
    flexDirection: 'column',
  },
  content: {
    flex: 1,
    width: '100%',
  },
});

export default DriverLayout;

