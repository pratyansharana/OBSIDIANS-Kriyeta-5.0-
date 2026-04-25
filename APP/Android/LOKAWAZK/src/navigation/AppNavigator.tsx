import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../Firebase/FirebaseConfig'; // Ensure persistence is set in this file
import { useAppTheme } from '../Context/Themecontext';

// Screens
import LoginScreen from '../screens/Login';
import HomeScreen from '../screens/Home';
import DashcamScreen from '../screens/Dashcam';
import ProfileScreen from '../screens/Profile';
import SignUpScreen from '../screens/SignUp';
import MyDetections from '../screens/Mydetections';
import ManualReportScreen from '../screens/ManualReportingScreen';
import ReportDetailScreen from '../screens/ReportDetailScreen';

// --- Types ---
export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  MainTabs: undefined;
  Dashcam: undefined;
  Mydetections: undefined;
  ManualReport: undefined;
  ReportDetail: { reportId: string }; // Example param
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// --- Bottom Tab Navigator ---
const TabNavigator = () => {
  const { theme } = useAppTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          height: 65,
          paddingBottom: 10,
          paddingTop: 10,
          borderTopWidth: 1,
          elevation: 0,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.5,
        },
        // Using Standard Emoji/Unicode as "Normal" Icons
        tabBarIcon: ({ focused }) => {
          let iconSymbol = '';

          if (route.name === 'Home') {
            iconSymbol = '\u2302'; // Or use Unicode like '\u2302'
          } else if (route.name === 'Profile') {
            iconSymbol = '\uD83D\uDC64'; // Or use Unicode like '\uD83D\uDC64'
          }

          return (
            <Text
              style={{
                fontSize: 20, // Adjusted for visibility
                color: focused ? theme.primary : theme.textSecondary,
                opacity: focused ? 1 : 0.6,
              }}
            >
              {iconSymbol}
            </Text>
          );
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'HOME' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'PROFILE' }}
      />
    </Tab.Navigator>
  );
};

// --- Main App Navigator ---
const AppNavigator = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const { theme } = useAppTheme();

  useEffect(() => {
    // Firebase automatically handles persistence if configured in FirebaseConfig
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (isInitializing) setIsInitializing(false);
    });
    
    return () => unsubscribe();
  }, [isInitializing]);

  if (isInitializing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ marginTop: 10, color: theme.textSecondary }}>Loading Session...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          // Auth Stack
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
          </>
        ) : (
          // Authenticated Stack
          <>
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen name="Dashcam" component={DashcamScreen} />
            <Stack.Screen name="Mydetections" component={MyDetections} />
            <Stack.Screen name="ManualReport" component={ManualReportScreen} />
            <Stack.Screen name="ReportDetail" component={ReportDetailScreen as any} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AppNavigator;