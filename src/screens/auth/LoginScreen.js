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

// Handles all DRF error shapes:
// { detail: '...' }              ← TokenObtainPair / AuthenticationFailed
// { non_field_errors: ['...'] }  ← ValidationError
// { error: '...' }               ← our custom views
// { field: ['...'] }             ← field-level errors
const parseError = (err) => {
  const data = err?.response?.data;
  if (!data) return err?.message || 'Something went wrong. Please try again.';
  if (typeof data === 'string') return data;
  return (
    data.detail                    ||
    data.error                     ||
    data.non_field_errors?.[0]     ||
    Object.values(data).flat()[0]  ||
    'Something went wrong.'
  );
};

export default function LoginScreen({ navigation }) {
  const { login }                   = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password,   setPassword]   = useState('');
  const [loading,    setLoading]    = useState(false);

  useEffect(() => { configureGoogleSignin(); }, []);

  // ── Email / password ──────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter your username/email and password.');
      return;
    }
    setLoading(true);
    try {
      const { pendingToken } = await loginUser(identifier.trim(), password);
      navigation.navigate('LoginOTP', { pendingToken });
    } catch (err) {
      Alert.alert('Login failed', parseError(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Google ────────────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await googleLogin();
      await login(result); // authStore + AppNavigator handle redirect
    } catch (err) {
      Alert.alert('Google login failed', err?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        <TextInput
          placeholder="Username or Email"
          placeholderTextColor="#666"
          value={identifier}
          onChangeText={setIdentifier}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          returnKeyType="next"
        />

        <TextInput
          placeholder="Password"
          placeholderTextColor="#666"
          value={password}
          secureTextEntry
          onChangeText={setPassword}
          style={styles.input}
          returnKeyType="done"
          onSubmitEditing={handleLogin}
        />

        <TouchableOpacity
          onPress={() => navigation.navigate('ForgotPassword')}
          style={styles.forgotContainer}
        >
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, loading && styles.disabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Continue</Text>}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerLabel}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={[styles.googleButton, loading && styles.disabled]}
          onPress={handleGoogleLogin}
          disabled={loading}
        >
          <Text style={styles.googleText}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Register')}
          style={styles.registerLink}
        >
          <Text style={styles.registerText}>
            Don't have an account?{' '}
            <Text style={styles.registerHighlight}>Register</Text>
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: '#121212' },
  inner:             { flex: 1, padding: 24, justifyContent: 'center' },
  header:            { marginBottom: 36 },
  title:             { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle:          { fontSize: 16, color: '#aaa' },
  input: {
    backgroundColor: '#1e1e1e',
    color:           '#fff',
    borderRadius:    12,
    padding:         16,
    marginBottom:    14,
    fontSize:        16,
    borderWidth:     1,
    borderColor:     '#333',
  },
  forgotContainer:   { alignItems: 'flex-end', marginBottom: 20 },
  forgotText:        { color: '#007AFF', fontSize: 14 },
  button: {
    backgroundColor: '#007AFF',
    borderRadius:    12,
    padding:         18,
    alignItems:      'center',
  },
  disabled:          { opacity: 0.6 },
  buttonText:        { color: '#fff', fontSize: 17, fontWeight: '600' },
  divider:           { flexDirection: 'row', alignItems: 'center', marginVertical: 28 },
  dividerLine:       { flex: 1, height: 1, backgroundColor: '#2a2a2a' },
  dividerLabel:      { color: '#555', marginHorizontal: 12, fontSize: 12, fontWeight: '700' },
  googleButton: {
    backgroundColor: '#fff',
    borderRadius:    12,
    padding:         16,
    alignItems:      'center',
  },
  googleText:        { color: '#111', fontSize: 16, fontWeight: '600' },
  registerLink:      { marginTop: 28, alignItems: 'center' },
  registerText:      { color: '#aaa', fontSize: 14 },
  registerHighlight: { color: '#007AFF', fontWeight: 'bold' },
});