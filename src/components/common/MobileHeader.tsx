import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Icon } from 'react-native-elements';
import { useAuth } from '../../hooks/useAuth';
import { driverTheme } from '../../theme/driverTheme';
import BrandLogo from './BrandLogo';

interface MobileHeaderProps {
  showBackButton?: boolean;
  onBackClick?: () => void;
  notificationCount?: number;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({
  showBackButton = false,
  onBackClick,
}) => {
  const router = useRouter();
  const { logout } = useAuth();

  const handleBack = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      router.back();
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout? You\'ll need to sign in again to access your account.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          logout().catch(() => {
            Alert.alert('Error', 'Failed to logout');
          });
        },
      },
    ]);
  };

  const logoutButton = (
    <TouchableOpacity style={styles.notificationButton} onPress={handleLogout} accessibilityLabel="Logout">
      <Icon
        name="logout"
        type="material"
        color={driverTheme.colors.text.primary}
        size={24}
      />
    </TouchableOpacity>
  );

  if (!showBackButton) {
    return (
      <View style={styles.logoContainer}>
        <View style={styles.logoToolbar}>
          <View style={styles.backButton} />
          <View style={styles.titleContainer}>
            <BrandLogo />
          </View>
          {logoutButton}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Icon name="arrow-back" type="material" color={driverTheme.colors.text.primary} size={24} />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <BrandLogo compact />
        </View>

        {logoutButton}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: driverTheme.colors.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: driverTheme.colors.divider,
    elevation: 0,
    shadowOpacity: 0,
  },
  logoContainer: {
    backgroundColor: driverTheme.colors.background.paper,
    paddingTop: driverTheme.spacing.sm,
    paddingBottom: driverTheme.spacing.md,
    paddingHorizontal: driverTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: driverTheme.colors.divider,
  },
  logoToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: driverTheme.spacing.md,
    height: 56,
  },
  backButton: {
    marginRight: driverTheme.spacing.sm,
    padding: driverTheme.spacing.xs,
    width: 40,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  notificationButton: {
    marginLeft: driverTheme.spacing.sm,
    padding: driverTheme.spacing.xs,
    position: 'relative',
    width: 40,
    alignItems: 'flex-end',
  },
});

export default MobileHeader;
