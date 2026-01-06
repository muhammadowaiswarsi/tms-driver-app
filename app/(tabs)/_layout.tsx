import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="loads"
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' }, // Hide default tabs, we use custom BottomNavigation
      }}>
      <Tabs.Screen
        name="index"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="loads"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      {/* <Tabs.Screen
        name="clock-in"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="pay"
        options={{
          href: null, // Hide from tab bar
        }}
      /> */}
      <Tabs.Screen
        name="messages"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="others"
        options={{
          href: null, // Hide from tab bar
        }}
      />
    </Tabs>
  );
}
