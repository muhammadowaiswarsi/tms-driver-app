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
  subtitle?: string;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({
  title = 'Active',
  showBackButton = false,
  onBackClick,
  notificationCount = 0,
  subtitle,
}) => {
  const router = useRouter();

  const handleBack = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      router.back();
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getFormattedDate = () => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
    const date = now.toLocaleDateString('en-US', options);
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${date} - ${time}`;
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

        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>

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
      {title === 'Clock In' && (
        <View style={styles.greetingContainer}>
          <Text style={styles.greeting}>{getGreeting()}, Tamara!</Text>
          <Text style={styles.dateTime}>{getFormattedDate()}</Text>
        </View>
      )}
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
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    fontSize: driverTheme.typography.h6.fontSize,
    fontWeight: '600',
    color: driverTheme.colors.text.primary,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 12,
    color: driverTheme.colors.text.secondary,
    marginTop: 2,
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
  greetingContainer: {
    paddingHorizontal: driverTheme.spacing.lg,
    paddingVertical: driverTheme.spacing.md,
    backgroundColor: driverTheme.colors.background.paper,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '600',
    color: driverTheme.colors.text.primary,
    marginBottom: 4,
  },
  dateTime: {
    fontSize: 14,
    color: driverTheme.colors.text.secondary,
  },
});

export default MobileHeader;

