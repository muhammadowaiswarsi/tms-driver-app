import { Tabs } from 'expo-router';
import React from 'react';
import TrackingBootstrap from '../../src/components/common/TrackingBootstrap';

export default function TabLayout() {
  return (
    <>
      <TrackingBootstrap />
      <Tabs
        initialRouteName="loads"
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      >
        <Tabs.Screen name="index" options={{ href: null }} />
        <Tabs.Screen name="loads" options={{ href: null }} />
        <Tabs.Screen name="clock-in" options={{ href: null }} />
        <Tabs.Screen name="pay" options={{ href: null }} />
        <Tabs.Screen name="messages" options={{ href: null }} />
        {/* Temporarily hidden — Others screen is not in the tab bar */}
        <Tabs.Screen name="others" options={{ href: null }} />
      </Tabs>
    </>
  );
}
