import { usePathname, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetConversations } from '../../hooks/useMessaging';
import { driverTheme } from '../../theme/driverTheme';

interface BottomNavigationProps {
  currentTab?: string;
}

const ACTIVE_BLUE = "#0066FF";
const INACTIVE_GRAY = "#6B7280";

const NAV_ICONS = {
  loads: require('../../../assets/images/nav/loads.png'),
  'clock-in': require('../../../assets/images/nav/clock-in.png'),
  pay: require('../../../assets/images/nav/pay.png'),
  messages: require('../../../assets/images/nav/messages.png'),
} as const;

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
      value: 'loads',
      path: '/(tabs)/loads',
      badgeCount: 0,
    },
    {
      label: 'Clock In',
      value: 'clock-in',
      path: '/(tabs)/clock-in',
      badgeCount: 0,
    },
    {
      label: 'Pay',
      value: 'pay',
      path: '/(tabs)/pay',
      badgeCount: 0,
    },
    {
      label: 'Messages',
      value: 'messages',
      path: '/(tabs)/messages',
      badgeCount: unreadCount,
    },
    // {
    //   label: 'More',
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
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.bar}>
        <View style={styles.protrusionBg} pointerEvents="none" />
        <View style={styles.barBg} />
        <View style={styles.row}>
        {navigationItems.map((item) => {
          const isActive = currentValue === item.value;
          const iconColor = isActive ? ACTIVE_BLUE : INACTIVE_GRAY;

          return (
            <TouchableOpacity
              key={item.value}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => handleNavigation(item.path)}
              activeOpacity={0.7}
            >
              {isActive && <View style={styles.activeCap} pointerEvents="none" />}
              <View style={styles.itemInner}>
                <View style={styles.iconContainer}>
                  <Image
                    source={NAV_ICONS[item.value as keyof typeof NAV_ICONS]}
                    style={[styles.navIcon, { tintColor: iconColor }]}
                    resizeMode="contain"
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
                    { color: iconColor, fontWeight: isActive ? '700' : '500' },
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
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    backgroundColor: driverTheme.colors.background.default,
    overflow: 'visible',
  },
  bar: {
    width: '100%',
    overflow: 'visible',
    minHeight: 82,
  },
  protrusionBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 18,
    backgroundColor: driverTheme.colors.background.default,
  },
  barBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 64,
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#0F2850',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '100%',
    // keeps tab content above the elevated bar background on Android
    ...Platform.select({ android: { elevation: 9 }, default: {} }),
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: 64,
    paddingTop: 8,
  },
  navItemActive: {
    height: 82,
    zIndex: 2,
    backgroundColor: 'transparent',
  },
  activeCap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 20,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderBottomWidth: 0,
    borderColor: ACTIVE_BLUE,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    backgroundColor: '#fff',
  },
  itemInner: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingBottom: 8,
    paddingHorizontal: 4,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 2,
  },
  navIcon: {
    width: 24,
    height: 24,
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
    marginTop: 6,
    width: 22,
    height: 4,
    borderRadius: 2,
    backgroundColor: ACTIVE_BLUE,
  },
});

export default BottomNavigation;
