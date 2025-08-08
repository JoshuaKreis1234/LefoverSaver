import React from 'react';
import { Tabs } from 'expo-router';

export default function Layout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="orders" options={{ title: 'Orders' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      {/* Create Offer should not appear as a tab button */}
      <Tabs.Screen name="create-offer" options={{ href: null }} />
      {/* details may also be hidden if you want */}
      <Tabs.Screen name="details" options={{ href: null }} />
    </Tabs>
  );
}
