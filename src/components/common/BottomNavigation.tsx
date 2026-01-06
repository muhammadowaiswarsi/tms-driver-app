import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from 'react-native-elements';
import { useRouter, usePathname } from 'expo-router';
import { driverTheme } from '../../theme/driverTheme';

interface BottomNavigationProps {
  currentTab?: string;
}

const BottomNavigation: React.FC<BottomNavigationProps> = () => {
  const router = useRouter();
  const pathname = usePathname();

  const navigationItems = [
    {
      label: 'Loads',
      icon: 'home',
      value: 'loads',
      path: '/(tabs)/loads',
      badgeCount: 0,
    },
    // {
    //   label: 'Clock in',
    //   icon: 'timer',
    //   value: 'clockin',
    //   path: '/(tabs)/clock-in',
    //   badgeCount: 0,
    // },
    // {
    //   label: 'Pay',
    //   icon: 'receipt',
    //   value: 'documents',
    //   path: '/(tabs)/pay',
    //   badgeCount: 0,
    // },
    {
      label: 'Messages',
      icon: 'chat-bubble-outline',
      value: 'messages',
      path: '/(tabs)/messages',
      badgeCount: 0,
    },
    {
      label: 'Other',
      icon: 'more-horiz',
      value: 'other',
      path: '/(tabs)/others',
      badgeCount: 0,
    },
  ];

  const getCurrentValue = () => {
    const currentItem = navigationItems.find((item) => pathname?.startsWith(item.path));
    return currentItem?.value || 'loads';
  };

  const handleNavigation = (path: string) => {
    router.push(path as any);
  };

  const currentValue = getCurrentValue();

  return (
    <View style={styles.container}>
      {navigationItems.map((item) => {
        const isActive = currentValue === item.value;
        return (
          <TouchableOpacity
            key={item.value}
            style={styles.navItem}
            onPress={() => handleNavigation(item.path)}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Icon
                name={item.icon}
                type="material"
                color={isActive ? driverTheme.colors.primary.main : driverTheme.colors.text.secondary}
                size={24}
              />
              {item.badgeCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badgeCount > 9 ? '9+' : item.badgeCount}</Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.label,
                { color: isActive ? driverTheme.colors.primary.main : driverTheme.colors.text.secondary },
              ]}
            >
              {item.label}
            </Text>
            {isActive && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: driverTheme.colors.background.paper,
    borderTopWidth: 1,
    borderTopColor: driverTheme.colors.divider,
    height: 64,
    paddingBottom: 8,
    paddingTop: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: driverTheme.colors.error.main,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: driverTheme.colors.error.contrastText,
    fontSize: 10,
    fontWeight: '600',
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: driverTheme.colors.primary.main,
  },
});

export default BottomNavigation;

