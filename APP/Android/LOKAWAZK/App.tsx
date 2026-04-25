import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './src/Firebase/FirebaseConfig';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/Context/Themecontext';
import { useTensorflowModel } from 'react-native-fast-tflite';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [fontsLoading, setFontsLoading] = useState(true);

  useEffect(() => {
    // 1. Auth Logic
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      setAuthLoading(false);
    });

    // 2. Font Loading Logic
    async function loadFonts() {
      try {
        await Font.loadAsync(Ionicons.font);
      } catch (e) {
        console.warn(e);
      } finally {
        setFontsLoading(false);
      }
    }
    loadFonts();

    return unsubscribe;
  }, []);

  // Pre-load the model at the root
  const potholeModel = useTensorflowModel(require('./assets/model/pothole.tflite'));

  // Wait for both Auth check and Fonts to finish loading
  if (authLoading || fontsLoading) return null;

  return (
    <ThemeProvider>
       <SafeAreaProvider>
         <AppNavigator />
       </SafeAreaProvider>
    </ThemeProvider>
  );
}