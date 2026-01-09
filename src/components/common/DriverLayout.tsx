import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { driverTheme } from '../../theme/driverTheme';
import BottomNavigation from './BottomNavigation';
import MobileHeader from './MobileHeader';

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
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
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
    </View>
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

