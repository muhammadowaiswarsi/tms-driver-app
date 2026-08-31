import { usePathname, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from 'react-native-elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetConversations } from '../../hooks/useMessaging';
import { driverTheme } from '../../theme/driverTheme';

interface BottomNavigationProps {
  currentTab?: string;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ currentTab }) => {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { data: conversationsResponse } = useGetConversations({ limit: 100 });

  const unreadCount = useMemo(() => {
    const conversations = conversationsResponse?.data;
    if (!Array.isArray(conversations)) return 0;
    return conversations.reduce(
      (sum: number, item: { unreadCount?: number }) => sum + (Number(item?.unreadCount) || 0),
      0,
    );
  }, [conversationsResponse]);

  const navigationItems = [
    {
      label: 'Loads',
      icon: 'local-shipping',
      value: 'loads',
      path: '/(tabs)/loads',
      badgeCount: 0,
    },
    {
      label: 'Clock In',
      icon: 'timer',
      value: 'clock-in',
      path: '/(tabs)/clock-in',
      badgeCount: 0,
    },
    {
      label: 'Pay',
      icon: 'account-balance-wallet',
      value: 'pay',
      path: '/(tabs)/pay',
      badgeCount: 0,
    },
    {
      label: 'Messages',
      icon: 'chat-bubble-outline',
      value: 'messages',
      path: '/(tabs)/messages',
      badgeCount: unreadCount,
    },
    // {
    //   label: 'More',
    //   icon: 'menu',
    //   value: 'others',
    //   path: '/(tabs)/others',
    //   badgeCount: 0,
    // },
  ];

  const getCurrentValue = () => {
    if (currentTab) {
      return currentTab;
    }

    if (pathname) {
      if (pathname.includes('/loads') || pathname.includes('/load-details')) {
        return 'loads';
      }
      if (pathname.includes('/clock-in')) {
        return 'clock-in';
      }
      if (pathname.includes('/pay')) {
        return 'pay';
      }
      if (pathname.includes('/messages')) {
        return 'messages';
      }
    }

    return 'loads';
  };

  const handleNavigation = (path: string) => {
    router.push(path as any);
  };

  const currentValue = getCurrentValue();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {navigationItems.map((item) => {
        const isActive = currentValue === item.value;
        return (
          <TouchableOpacity
            key={item.value}
            style={styles.navItem}
            onPress={() => handleNavigation(item.path)}
            activeOpacity={0.7}
          >
            <View style={[styles.itemInner, isActive && styles.itemInnerActive]}>
              <View style={styles.iconContainer}>
                <Icon
                  name={item.icon}
                  type="material"
                  color={isActive ? driverTheme.colors.primary.main : driverTheme.colors.text.secondary}
                  size={22}
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
                numberOfLines={1}
              >
                {item.label}
              </Text>
              {isActive && <View style={styles.activeIndicator} />}
            </View>
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
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: driverTheme.colors.divider,
    minHeight: 72,
    paddingBottom: 8,
    paddingTop: 6,
    paddingHorizontal: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 14,
    minWidth: 56,
  },
  itemInnerActive: {
    backgroundColor: '#E8F1FC',
    ...Platform.select({
      ios: {
        shadowColor: '#1976d2',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 2,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: driverTheme.colors.error.main,
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: driverTheme.colors.error.contrastText,
    fontSize: 9,
    fontWeight: '700',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  activeIndicator: {
    marginTop: 4,
    width: 18,
    height: 3,
    borderRadius: 2,
    backgroundColor: driverTheme.colors.primary.main,
  },
});

export default BottomNavigation;
