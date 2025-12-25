import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import DriverLayout from '../../src/components/common/DriverLayout';
import { driverTheme } from '../../src/theme/driverTheme';

const Messages: React.FC = () => {
  return (
    <DriverLayout title="Messages" currentTab="messages">
      <View style={styles.container}>
        <Text style={styles.placeholder}>Messages Screen - Coming Soon</Text>
      </View>
    </DriverLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: driverTheme.spacing.lg,
  },
  placeholder: {
    fontSize: 16,
    color: driverTheme.colors.text.secondary,
  },
});

export default Messages;
