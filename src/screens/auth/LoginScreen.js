/**
 * src/screens/auth/LoginScreen.js
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { loginUser, googleLogin, configureGoogleSignin } from '../../api/auth';
import { useAuth } from '../../store/authStore';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    configureGoogleSignin();
  }, []);

  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      Alert.alert('Required', 'Please enter your username/email and password.');
      return;
    }

    setLoading(true);
    try {
      const result = await loginUser(identifier.trim(), password);

      if (result.twoFARequired) {
        navigation.navigate('TwoFA', { pendingToken: result.pendingToken });
        return;
      }

      await login(result);
      // No manual navigation needed — AppNavigator will handle it
    } catch (err) {
      const msg = err?.response?.data?.error
        || err?.response?.data?.detail
        || 'Invalid username or password.';
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await googleLogin();
      console.log("🔑 Google Result keys:", Object.keys(result));

      await login(result);
      // AppNavigator will automatically redirect
    } catch (err) {
      console.error("Google Login Error:", err);
      Alert.alert('Google Login Failed', err?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Welcome</Text>
          <Text style={styles.subtitle}>Log in to continue your journey</Text>
        </View>

        <View style={styles.formContainer}>
          <TextInput
            placeholder="Username or Email"
            placeholderTextColor="#666"
            value={identifier}
            onChangeText={setIdentifier}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
          <TextInput
            placeholder="Password"
            placeholderTextColor="#666"
            value={password}
            secureTextEntry
            onChangeText={setPassword}
            style={styles.input}
          />
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate('ForgotPassword')}
          style={styles.forgotContainer}
        >
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.7 }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
        </TouchableOpacity>

        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={[styles.googleButton, loading && { opacity: 0.7 }]}
          onPress={handleGoogleLogin}
          disabled={loading}
        >
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Register')}
          style={styles.linkContainer}
        >
          <Text style={styles.linkText}>
            Don't have an account?{' '}
            <Text style={styles.linkHighlight}>Register</Text>
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  inner: { flex: 1, padding: 24, justifyContent: 'center' },
  headerContainer: { marginBottom: 40 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#aaa' },
  formContainer: { marginBottom: 8 },
  input: {
    backgroundColor: '#1e1e1e',
    color: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  forgotContainer: { alignItems: 'flex-end', marginBottom: 20 },
  forgotText: { color: '#007AFF', fontSize: 14 },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 30 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#333' },
  dividerText: { color: '#666', marginHorizontal: 10, fontSize: 12, fontWeight: 'bold' },
  googleButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: { color: '#000', fontSize: 16, fontWeight: '600' },
  linkContainer: { marginTop: 30, alignItems: 'center' },
  linkText: { color: '#aaa', fontSize: 14 },
  linkHighlight: { color: '#007AFF', fontWeight: 'bold' },
});