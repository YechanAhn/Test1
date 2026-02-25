// ============================================
// 앱 네비게이션 구조
// 하단 탭 네비게이션
// ============================================

import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import CalendarScreen from '../screens/CalendarScreen';
import PendingEventsScreen from '../screens/PendingEventsScreen';
import PartnerScreen from '../screens/PartnerScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { useCalendarStore } from '../hooks/useCalendarStore';

const Tab = createBottomTabNavigator();

const AppNavigator: React.FC = () => {
  const pendingEvents = useCalendarStore((state) => state.pendingEvents);
  const pendingCount = pendingEvents.length;

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#4A90D9',
          tabBarInactiveTintColor: '#B2BEC3',
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabBarLabel,
        }}
      >
        <Tab.Screen
          name="Calendar"
          component={CalendarScreen}
          options={{
            tabBarLabel: '캘린더',
            tabBarIcon: ({ color }) => (
              <Text style={[styles.tabIcon, { color }]}>{'[Cal]'}</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Pending"
          component={PendingEventsScreen}
          options={{
            tabBarLabel: '감지됨',
            tabBarIcon: ({ color }) => (
              <Text style={[styles.tabIcon, { color }]}>{'[!]'}</Text>
            ),
            tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
          }}
        />
        <Tab.Screen
          name="Partner"
          component={PartnerScreen}
          options={{
            tabBarLabel: '파트너',
            tabBarIcon: ({ color }) => (
              <Text style={[styles.tabIcon, { color }]}>{'[P]'}</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarLabel: '설정',
            tabBarIcon: ({ color }) => (
              <Text style={[styles.tabIcon, { color }]}>{'[S]'}</Text>
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    height: 60,
    paddingBottom: 6,
    paddingTop: 6,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  tabIcon: {
    fontSize: 16,
    fontWeight: '700',
  },
});

export default AppNavigator;
