import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from 'react-native-elements';
import { driverTheme } from '../../theme/driverTheme';

interface MobileHeaderProps {
  title?: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
  notificationCount?: number;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({
  title = 'Active',
  showBackButton = false,
  onBackClick,
  notificationCount = 0,
}) => {
  const router = useRouter();

  const handleBack = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        {showBackButton ? (
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Icon name="arrow-back" type="material" color={driverTheme.colors.text.primary} size={24} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backButton} />
        )}

        <Text style={styles.title}>{title}</Text>

        <TouchableOpacity style={styles.notificationButton}>
          <Icon
            name="notifications-none"
            type="material"
            color={driverTheme.colors.text.primary}
            size={24}
          />
          {notificationCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{notificationCount > 9 ? '9+' : notificationCount}</Text>
            </View>
          )}
        </TouchableOpacity>
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
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: driverTheme.typography.h6.fontSize,
    fontWeight: '600',
    color: driverTheme.colors.text.primary,
  },
  notificationButton: {
    marginLeft: driverTheme.spacing.sm,
    padding: driverTheme.spacing.xs,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: driverTheme.colors.error.main,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: driverTheme.colors.error.contrastText,
    fontSize: 10,
    fontWeight: '600',
  },
});

export default MobileHeader;

