import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// 🔥 Firebase & Theme Imports
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../Firebase/FirebaseConfig'; 
import { useAppTheme } from '../Context/Themecontext';

// Screens
import LoginScreen from '../screens/Login';
import HomeScreen from '../screens/Home';
import DashcamScreen from '../screens/Dashcam';
import ProfileScreen from '../screens/Profile';
import ReportScreen from '../screens/Report';
import SignUpScreen from '../screens/SignUp';
import MyDetections from '../screens/Mydetections';
import ManualReportScreen from '../screens/ManualReportingScreen';

// --- Types ---
export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  MainTabs: undefined; // The container for the Bottom Tabs
  Dashcam: undefined;  // Kept here to hide tabs during recording
  Mydetections: undefined;

};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// --- Bottom Tab Navigator Component ---
const TabNavigator = () => {
  const { theme } = useAppTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          height: 65,
          paddingBottom: 10,
          paddingTop: 10,
          borderTopWidth: 1,
          elevation: 0, // Removes shadow on Android
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '900',
          letterSpacing: 0.5,
        },
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ 
          tabBarLabel: 'HUD', 
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>🏠</Text> 
        }} 
      />

      <Tab.Screen
        name="ManualReport"
        component={ManualReportScreen}
        options={{
          tabBarLabel: 'REPORT',
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>📝</Text>
        }}
      />

      <Tab.Screen 
        name="Report" 
        component={ReportScreen} 
        options={{ 
          tabBarLabel: 'LOGS', 
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>📑</Text> 
        }} 
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ 
          tabBarLabel: 'USER', 
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>👤</Text> 
        }} 
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
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          // 🛑 UNAUTHENTICATED STACK
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
          </>
        ) : (
          // ✅ AUTHENTICATED STACK
          <>
            {/* MainTabs contains Home, Nearby, Report, and Profile */}
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            
            {/* Dashcam is OUTSIDE the tabs so it can be full-screen */}
            <Stack.Screen name="Dashcam" component={DashcamScreen} />
            <Stack.Screen name="Mydetections" component={MyDetections} />
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
  }
});

export default AppNavigator;