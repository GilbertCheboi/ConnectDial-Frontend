/**
 * src/screens/auth/RegisterScreen.js
 */

import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { registerUser } from '../../api/auth';
import { AuthContext } from '../../store/authStore';

export default function RegisterScreen({ navigation }) {
  const { login } = useContext(AuthContext);

  const [form, setForm] = useState({
    username:        '',
    email:           '',
    password:        '',
    confirmPassword: '',
  });

  const [showPassword,        setShowPassword]        = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading,             setLoading]             = useState(false);

  const handleRegister = async () => {
    // ── Validation ──────────────────────────────────────────────
    if (
      !form.username.trim() ||
      !form.email.trim()    ||
      !form.password        ||
      !form.confirmPassword
    ) {
      Alert.alert('Required Fields', 'Please fill in all fields.');
      return;
    }

    if (form.password.length < 8) {
      Alert.alert('Weak Password', 'Password must be at least 8 characters.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }

    // ── API Call ─────────────────────────────────────────────────
    setLoading(true);
    try {
      const data = await registerUser({
        username:  form.username.trim(),
        email:     form.email.trim().toLowerCase(),
        password1: form.password,
        password2: form.confirmPassword,
      });

      // registerUser already saves authToken + user_data to AsyncStorage
      // Now update global auth state so AppNavigator redirects automatically
      if (data?.token) {
        await login({ key: data.token, user: data });
      } else {
        // Token not returned — navigate to login manually
        Alert.alert('Account Created!', 'You can now log in.', [
          { text: 'Login', onPress: () => navigation.navigate('Login') },
        ]);
      }
    } catch (error) {
      const serverErrors = error?.response?.data;
      let message = 'Registration failed. Please check your details.';

      if (serverErrors) {
        const firstKey = Object.keys(serverErrors)[0];
        const firstVal = serverErrors[firstKey];
        message = `${firstKey}: ${Array.isArray(firstVal) ? firstVal[0] : firstVal}`;
      }

      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  // ── Eye Icon ─────────────────────────────────────────────────────
  const EyeIcon = ({ visible, onPress }) => (
    <TouchableOpacity onPress={onPress} style={styles.eyeBtn}>
      <Text style={styles.eyeText}>{visible ? '🙈' : '👁️'}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join the ConnectDial community</Text>
          </View>

          <View style={styles.formContainer}>
            {/* Username */}
            <Text style={styles.label}>Username</Text>
            <TextInput
              placeholder="Enter username"
              placeholderTextColor="#666"
              autoCapitalize="none"
              autoCorrect={false}
              value={form.username}
              onChangeText={(v) => setForm({ ...form, username: v })}
              style={styles.input}
            />

            {/* Email */}
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              placeholder="email@example.com"
              placeholderTextColor="#666"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={form.email}
              onChangeText={(v) => setForm({ ...form, email: v })}
              style={styles.input}
            />

            {/* Password */}
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputRow}>
              <TextInput
                placeholder="Minimum 8 characters"
                placeholderTextColor="#666"
                secureTextEntry={!showPassword}
                value={form.password}
                onChangeText={(v) => setForm({ ...form, password: v })}
                style={styles.inputFlex}
              />
              <EyeIcon
                visible={showPassword}
                onPress={() => setShowPassword(prev => !prev)}
              />
            </View>

            {/* Confirm Password */}
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.inputRow}>
              <TextInput
                placeholder="Re-enter your password"
                placeholderTextColor="#666"
                secureTextEntry={!showConfirmPassword}
                value={form.confirmPassword}
                onChangeText={(v) => setForm({ ...form, confirmPassword: v })}
                style={styles.inputFlex}
              />
              <EyeIcon
                visible={showConfirmPassword}
                onPress={() => setShowConfirmPassword(prev => !prev)}
              />
            </View>

            {/* Live password match indicator */}
            {form.confirmPassword.length > 0 && (
              <Text
                style={[
                  styles.matchText,
                  form.password === form.confirmPassword
                    ? styles.matchOk
                    : styles.matchErr,
                ]}
              >
                {form.password === form.confirmPassword
                  ? '✓ Passwords match'
                  : '✗ Passwords do not match'}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.7 }]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Register</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={styles.linkContainer}
          >
            <Text style={styles.linkText}>
              Already have an account?{' '}
              <Text style={styles.linkHighlight}>Login</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#121212' },
  scrollContainer: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  headerContainer: { marginBottom: 40 },
  title:           { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle:        { fontSize: 16, color: '#aaa' },
  formContainer:   { marginBottom: 20 },
  label:           { color: '#ccc', fontSize: 14, marginBottom: 8, marginLeft: 4, fontWeight: '500' },

  // Plain inputs (username, email)
  input: {
    backgroundColor: '#1e1e1e',
    color:           '#fff',
    borderRadius:    12,
    padding:         16,
    marginBottom:    20,
    fontSize:        16,
    borderWidth:     1,
    borderColor:     '#333',
  },

  // Password row (input + eye icon)
  inputRow: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: '#1e1e1e',
    borderRadius:    12,
    borderWidth:     1,
    borderColor:     '#333',
    marginBottom:    20,
    paddingRight:    12,
  },
  inputFlex: {
    flex:      1,
    color:     '#fff',
    padding:   16,
    fontSize:  16,
  },
  eyeBtn:  { padding: 4 },
  eyeText: { fontSize: 18 },

  // Password match indicator
  matchText: { fontSize: 13, marginTop: -14, marginBottom: 16, marginLeft: 4 },
  matchOk:   { color: '#4CAF50' },
  matchErr:  { color: '#FF5252' },

  button: {
    backgroundColor: '#007AFF',
    borderRadius:    12,
    padding:         18,
    alignItems:      'center',
    marginTop:       10,
    elevation:       5,
    shadowColor:     '#007AFF',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.3,
    shadowRadius:    5,
  },
  buttonText:    { color: '#fff', fontSize: 18, fontWeight: '600' },
  linkContainer: { marginTop: 30, alignItems: 'center' },
  linkText:      { color: '#aaa', fontSize: 14 },
  linkHighlight: { color: '#007AFF', fontWeight: 'bold' },
});