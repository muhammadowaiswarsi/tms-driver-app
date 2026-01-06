import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Avatar, Button, Card, Icon } from 'react-native-elements';
import DriverLayout from '../../src/components/common/DriverLayout';
import { useAuth } from '../../src/hooks/useAuth';
import AuthService from '../../src/services/AuthService';
import { driverTheme } from '../../src/theme/driverTheme';

// Type assertion helper for Card component (React Native Elements types don't include children)
const TypedCard = Card as any;

const Others: React.FC = () => {
  const router = useRouter();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const { logout: logoutAuth, authState } = useAuth();
  const { userData } = authState || {};

  const handleBackClick = () => {
    router.back();
  };

  const handleLogoutClick = () => {
    setLogoutDialogOpen(true);
  };

  const handleLogoutConfirm = async () => {
    try {
      await AuthService.logout();
      await logoutAuth();
      // Clear AsyncStorage if needed
      router.replace('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout');
    }
  };

  const handleLogoutCancel = () => {
    setLogoutDialogOpen(false);
  };

  const settingsItems = [
    {
      id: 'profile',
      title: 'Profile',
      icon: 'person',
      type: 'navigation',
      action: () => router.push('/(tabs)/loads?tab=active' as any),
    },
    {
      id: 'notifications',
      title: 'Push Notifications',
      icon: 'notifications',
      type: 'toggle',
      value: notificationsEnabled,
      action: () => setNotificationsEnabled(!notificationsEnabled),
    },
    {
      id: 'location',
      title: 'Location Services',
      icon: 'location-on',
      type: 'toggle',
      value: locationEnabled,
      action: () => setLocationEnabled(!locationEnabled),
    },
  ];

  const generalItems = [
    {
      id: 'security',
      title: 'Security & Privacy',
      icon: 'security',
      type: 'navigation',
      action: () => router.push('/(tabs)/loads?tab=active' as any),
    },
    {
      id: 'language',
      title: 'Language',
      icon: 'language',
      subtitle: 'English',
      type: 'navigation',
      action: () => router.push('/(tabs)/loads?tab=active' as any),
    },
    {
      id: 'help',
      title: 'Help & Support',
      icon: 'help',
      type: 'navigation',
      action: () => router.push('/(tabs)/loads?tab=active' as any),
    },
    {
      id: 'about',
      title: 'About',
      icon: 'info',
      type: 'navigation',
      action: () => router.push('/(tabs)/loads?tab=active' as any),
    },
  ];

  const renderSettingsItem = (item: any) => (
    <TouchableOpacity
      key={item.id}
      style={styles.listItem}
      onPress={item.type === 'navigation' ? item.action : undefined}
      activeOpacity={0.7}
    >
      <View style={styles.listItemContent}>
        <Icon
          name={item.icon}
          type="material"
          color={driverTheme.colors.text.primary}
          size={24}
          containerStyle={styles.listItemIcon}
        />
        <View style={styles.listItemText}>
          <Text style={styles.listItemTitle}>{item.title}</Text>
          {item.subtitle && <Text style={styles.listItemSubtitle}>{item.subtitle}</Text>}
        </View>
        {item.type === 'toggle' ? (
          <Switch
            value={item.value}
            onValueChange={item.action}
            trackColor={{
              false: driverTheme.colors.grey[300],
              true: driverTheme.colors.primary.main,
            }}
            thumbColor={driverTheme.colors.background.paper}
          />
        ) : (
          <Icon
            name="chevron-right"
            type="material"
            color={driverTheme.colors.text.secondary}
            size={24}
          />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <DriverLayout title="Others" showBackButton onBackClick={handleBackClick}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Profile Section */}
        <TypedCard containerStyle={styles.profileCard}>
          <View style={styles.profileContent}>
            <Avatar
              size={80}
              rounded
              title={userData?.name ? userData.name.charAt(0).toUpperCase() : ''}
              containerStyle={[
                styles.avatar,
                { backgroundColor: driverTheme.colors.primary.main },
              ]}
              titleStyle={styles.avatarTitle}
            />
            <Text style={styles.profileName}>{userData?.name || ''}</Text>
            <Text style={styles.profileEmail}>{userData?.email || ''}</Text>
          </View>
        </TypedCard>

        {/* Preferences Section */}
        <TypedCard containerStyle={styles.sectionCard}>
          <Text style={styles.sectionTitle}>PREFERENCES</Text>
          <View style={styles.listContainer}>
            {settingsItems.map(renderSettingsItem)}
          </View>
        </TypedCard>

        {/* General Section */}
        <TypedCard containerStyle={styles.sectionCard}>
          <Text style={styles.sectionTitle}>GENERAL</Text>
          <View style={styles.listContainer}>
            {generalItems.map(renderSettingsItem)}
          </View>
        </TypedCard>

        {/* Logout Section */}
        <TypedCard containerStyle={styles.sectionCard}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogoutClick}
            activeOpacity={0.7}
          >
            <Icon name="exit-to-app" type="material" color={driverTheme.colors.error.main} size={24} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </TypedCard>
      </ScrollView>

      {/* Logout Dialog */}
      {logoutDialogOpen && (
        <View style={styles.dialogOverlay}>
          <TypedCard containerStyle={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Logout</Text>
            <Text style={styles.dialogMessage}>
              Are you sure you want to logout? You&apos;ll need to sign in again to access your account.
            </Text>
            <View style={styles.dialogButtons}>
              <Button
                title="Cancel"
                onPress={handleLogoutCancel}
                buttonStyle={[styles.dialogButton, { backgroundColor: driverTheme.colors.grey[200] }]}
                titleStyle={[styles.dialogButtonText, { color: driverTheme.colors.grey[600] }]}
              />
              <Button
                title="Logout"
                onPress={handleLogoutConfirm}
                buttonStyle={[styles.dialogButton, { backgroundColor: driverTheme.colors.error.main }]}
                titleStyle={styles.dialogButtonText}
              />
            </View>
          </TypedCard>
        </View>
      )}
    </DriverLayout>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  profileCard: {
    borderRadius: 0,
    margin: 0,
    marginBottom: driverTheme.spacing.sm,
  },
  profileContent: {
    alignItems: 'center',
    paddingVertical: driverTheme.spacing.lg,
  },
  avatar: {
    marginBottom: driverTheme.spacing.md,
  },
  avatarTitle: {
    fontSize: 32,
    color: driverTheme.colors.primary.contrastText,
  },
  profileName: {
    fontSize: driverTheme.typography.h6.fontSize,
    fontWeight: '600',
    color: driverTheme.colors.text.primary,
    marginBottom: driverTheme.spacing.xs,
  },
  profileEmail: {
    fontSize: driverTheme.typography.body2.fontSize,
    color: driverTheme.colors.text.secondary,
  },
  sectionCard: {
    borderRadius: 0,
    margin: 0,
    marginBottom: driverTheme.spacing.sm,
    padding: 0,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: driverTheme.colors.text.secondary,
    paddingHorizontal: driverTheme.spacing.md,
    paddingTop: driverTheme.spacing.md,
    paddingBottom: driverTheme.spacing.sm,
    textTransform: 'uppercase',
  },
  listContainer: {
    paddingVertical: driverTheme.spacing.xs,
  },
  listItem: {
    paddingVertical: driverTheme.spacing.md,
    paddingHorizontal: driverTheme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: driverTheme.colors.divider,
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listItemIcon: {
    marginRight: driverTheme.spacing.md,
    width: 40,
  },
  listItemText: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: driverTheme.typography.body1.fontSize,
    color: driverTheme.colors.text.primary,
    fontWeight: '500',
  },
  listItemSubtitle: {
    fontSize: driverTheme.typography.body2.fontSize,
    color: driverTheme.colors.text.secondary,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: driverTheme.spacing.md,
    paddingHorizontal: driverTheme.spacing.md,
  },
  logoutText: {
    fontSize: driverTheme.typography.body1.fontSize,
    color: driverTheme.colors.error.main,
    fontWeight: '500',
    marginLeft: driverTheme.spacing.md,
  },
  dialogOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  dialogCard: {
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: driverTheme.spacing.md,
  },
  dialogMessage: {
    fontSize: 14,
    color: driverTheme.colors.text.secondary,
    marginBottom: driverTheme.spacing.lg,
  },
  dialogButtons: {
    flexDirection: 'row',
    gap: driverTheme.spacing.sm,
  },
  dialogButton: {
    flex: 1,
    borderRadius: 8,
  },
  dialogButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default Others;
