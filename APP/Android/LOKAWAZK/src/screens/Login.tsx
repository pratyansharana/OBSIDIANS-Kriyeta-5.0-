import React, { useState } from 'react';
import { 
  StyleSheet, View, Text, TextInput, TouchableOpacity, 
  ActivityIndicator, Alert, SafeAreaView, StatusBar, Dimensions 
} from 'react-native';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../Firebase/FirebaseConfig';
import { useNavigation } from '@react-navigation/native';
import { Theme } from '../themes/themes'; 

const { width } = Dimensions.get('window');

const LoginScreen = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [currentMode, setCurrentMode] = useState<keyof typeof Theme>('dark');
  const activeTheme = Theme[currentMode];

  const toggleTheme = () => {
    if (currentMode === 'dark') setCurrentMode('light');
    else if (currentMode === 'light') setCurrentMode('cyber');
    else setCurrentMode('dark');
  };

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (!userCredential.user.emailVerified) {
        await signOut(auth);
        Alert.alert('Verify Email', 'Check your inbox before logging in.');
        return;
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: activeTheme.background }]}>
      <StatusBar barStyle={activeTheme.status as any} />
      
      {/* HEADER SECTION */}
      <View style={styles.header}>
        <View style={styles.systemStatus}>
          <View style={[styles.statusDot, { backgroundColor: activeTheme.accent }]} />
          <Text style={[styles.systemText, { color: activeTheme.textSecondary }]}>SYSTEM ONLINE</Text>
        </View>
        <TouchableOpacity 
          style={[styles.themeToggle, { borderColor: activeTheme.border }]} 
          onPress={toggleTheme}
        >
          <Text style={styles.emoji}>{currentMode === 'light' ? "☀️" : "🌙"}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* LOGO AREA */}
        <View style={styles.logoContainer}>
          <Text style={[styles.logo, { color: activeTheme.textPrimary }]}>LOKAWAAZ</Text>
          <View style={[styles.underline, { backgroundColor: activeTheme.primary }]} />
          <Text style={[styles.tagline, { color: activeTheme.textSecondary }]}>AI ROAD MONITORING v2.0</Text>
        </View>

        {/* INPUT FIELDS */}
        <View style={styles.form}>
          <TextInput
            style={[styles.input, { 
              backgroundColor: activeTheme.surface, 
              color: activeTheme.textPrimary,
              borderColor: activeTheme.border,
              borderWidth: currentMode === 'cyber' ? 2 : 1
            }]}
            placeholder="emailid@gmail.com"
            placeholderTextColor={activeTheme.textSecondary}
            onChangeText={setEmail}
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, { 
              backgroundColor: activeTheme.surface, 
              color: activeTheme.textPrimary,
              borderColor: activeTheme.border,
              borderWidth: currentMode === 'cyber' ? 2 : 1
            }]}
            placeholder="password"
            placeholderTextColor={activeTheme.textSecondary}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity 
            style={[styles.mainButton, { backgroundColor: activeTheme.primary }]} 
            onPress={handleLogin}
          >
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.mainButtonText}>LOGIN</Text>}
          </TouchableOpacity>

          

          {/* GOOGLE SIGN IN BUTTON (Custom Styled) */}
          
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('SignUp' as never)} style={styles.footer}>
          <Text style={[styles.footerText, { color: activeTheme.textSecondary }]}>
            New User? <Text style={[styles.link, { color: activeTheme.primary }]}>REGISTER HERE</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingTop: 40,
  },
  systemStatus: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
  systemText: { fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  themeToggle: { padding: 8, borderWidth: 1, borderRadius: 10 },
  emoji: { fontSize: 16 },
  content: { flex: 1, paddingHorizontal: 30, justifyContent: 'center' },
  logoContainer: { alignItems: 'center', marginBottom: 50 },
  logo: { fontSize: 42, fontWeight: '900', letterSpacing: 5 },
  underline: { height: 4, width: 60, marginTop: 5, borderRadius: 100 },
  tagline: { fontSize: 10, fontWeight: 'bold', marginTop: 10, letterSpacing: 2 },
  form: { width: '100%' },
  input: { padding: 18, borderRadius: 100, marginBottom: 15, fontSize: 14, fontWeight: '600' },
  mainButton: { padding: 20, borderRadius: 100, alignItems: 'center', marginTop: 10 },
  mainButtonText: { color: '#FFF', fontWeight: '900', letterSpacing: 2 },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 25 },
  line: { flex: 1, height: 1 },
  orText: { marginHorizontal: 15, fontSize: 12, fontWeight: 'bold' },
  googleButton: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 100,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  googleIconBox: {
    backgroundColor: '#4285F4',
    width: 24,
    height: 24,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  googleLetterG: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  googleText: { color: '#757575', fontWeight: '600', fontSize: 16 },
  footer: { marginTop: 40, alignItems: 'center' },
  footerText: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  link: { fontWeight: '900' }
});

export default LoginScreen;