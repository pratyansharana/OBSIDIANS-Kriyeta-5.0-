import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { auth } from '../Firebase/FirebaseConfig';
import { createUserWithEmailAndPassword, sendEmailVerification, signOut } from 'firebase/auth';

const SignUpScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

const handleSignUp = async () => {
  if (password !== confirmPassword) {
    Alert.alert('Error', 'Passwords do not match');
    return;
  }

  setLoading(true);
  try {
    // 1. Create the user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // 2. Send verification email
    await sendEmailVerification(userCredential.user);
    
    // 3. Immediately sign out so the App.tsx listener doesn't redirect them to Home
    await signOut(auth);

    Alert.alert(
      'Verification Required',
      'A verification link has been sent to your email. Please verify your account before logging in.',
      [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
    );
  } catch (error: any) {
    Alert.alert('Registration Failed', error.message);
  } finally {
    setLoading(false);
  }
};

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>CREATE ACCOUNT</Text>
      <Text style={styles.subtitle}>Register as a LokAwaz Operator</Text>

      <TextInput
        style={styles.input}
        placeholder="Email Address"
        placeholderTextColor="#666"
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#666"
        onChangeText={setPassword}
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        placeholderTextColor="#666"
        onChangeText={setConfirmPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleSignUp} disabled={loading}>
        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>REGISTER OPERATOR</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.footer}>
        <Text style={styles.footerText}>Already have an account? <Text style={styles.link}>Login</Text></Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', padding: 25 },
  logo: { fontSize: 28, fontWeight: 'bold', color: '#FFF', textAlign: 'center' },
  subtitle: { color: '#FF3B30', textAlign: 'center', marginBottom: 40, letterSpacing: 1, fontSize: 12 },
  input: { backgroundColor: '#1A1A1A', color: '#FFF', padding: 15, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#333' },
  button: { backgroundColor: '#FF3B30', padding: 18, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#FFF', fontWeight: 'bold', letterSpacing: 1 },
  footer: { marginTop: 30, alignItems: 'center' },
  footerText: { color: '#888' },
  link: { color: '#FF3B30', fontWeight: 'bold' }
});

export default SignUpScreen;