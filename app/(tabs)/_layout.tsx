import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Tabs } from 'expo-router';
import { Pressable } from 'react-native';

import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  // Set up the main navigation tabs for the app
  return (
<Tabs
  screenOptions={{
    headerShown: true,
    tabBarActiveTintColor: '#d32f2f',
    tabBarInactiveTintColor: '#8e8e93',
    tabBarStyle: {
      backgroundColor: '#ffffff',
      borderTopWidth: 1,
      borderTopColor: '#e0e0e0',
      paddingBottom: 8,
      paddingTop: 4,
      height: 60,
    },
    tabBarLabelStyle: {
      fontSize: 12,
      fontWeight: '600',
    },
    headerStyle: {
      height: 110,
      backgroundColor: '#fff',
      borderBottomColor: '#e0e0e0',
      borderBottomWidth: 1,
    },
    headerTitleStyle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#333',
    },
  }}
      >
      <Tabs.Screen
        name="main"
        options={{
          headerTitle: 'Find your court',
          tabBarLabel: 'Map',
          tabBarIcon: ({ color }) => <TabBarIcon name="map" color={color} />,
          headerRight: () => (
            <Link href="/(tabs)/three" asChild>
              <Pressable>
                {({ pressed }) => (
                  <FontAwesome
                    name="info-circle"
                    size={25}
                    color={Colors[colorScheme ?? 'light'].text}
                    style={{ marginRight: 15, opacity: pressed ? 0.5 : 1 }}
                  />
                )}
              </Pressable>
            </Link>
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          headerTitle: 'Add your post',
          tabBarLabel: 'Events',
          tabBarIcon: ({ color }) => <TabBarIcon name="plus" color={color} />,
        }}
      />
      <Tabs.Screen
        name="three"
        options={{
          headerTitle: 'Your Profile',
          tabBarLabel: 'You',
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
      />
    </Tabs>
  );
}
