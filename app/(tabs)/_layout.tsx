import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Tabs } from 'expo-router';
import { Pressable } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

// icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

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
  }}
      >
      <Tabs.Screen
        name="index"
        options={{
          headerTitle: 'Find your court',
          headerTitleStyle: {
            fontSize: 24,
            fontWeight: 'bold',
          },
          tabBarLabel: 'Map',
          tabBarIcon: ({ color }) => <TabBarIcon name="code" color={color} />,
          headerRight: () => (
            <Link href="/modal" asChild>
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
          tabBarLabel: 'Contribute',
          tabBarIcon: ({ color }) => <TabBarIcon name="code" color={color} />,
        }}
      />
      <Tabs.Screen
        name="three"
        options={{
          headerTitle: 'Your Profile',
          tabBarLabel: 'You',
          tabBarIcon: ({ color }) => <TabBarIcon name="code" color={color} />,
        }}
      />
    </Tabs>
  );
}
