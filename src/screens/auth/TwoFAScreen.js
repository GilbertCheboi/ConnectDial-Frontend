/**
 * src/screens/auth/TwoFAScreen.js
 * Step 2 of login when 2FA is enabled.
 * Receives { pendingToken } via route.params from LoginScreen.
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { verifyTwoFA, resendTwoFACode } from '../../api/auth';
import { useAuth } from '../../store/authStore';

export default function TwoFAScreen({ route, navigation }) {
  const { pendingToken } = route.params;
  const { login }        = useAuth();

  const [otp,       setOtp]       = useState('');
  const [loading,   setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const inputRef = useRef(null);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      const result = await verifyTwoFA(pendingToken, otp);
      await login({ twoFARequired: false, user: result.user });
    } catch (err) {
      const msg = err?.response?.data?.error || 'Invalid or expired code.';
      Alert.alert('Verification Failed', msg);
      setOtp('');
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await resendTwoFACode(pendingToken);
      Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
    } catch (err) {
      Alert.alert('Error', 'Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.headerContainer}>
          <Text style={styles.title}>Verification</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to your email.{'\n'}It expires in 5 minutes.
          </Text>
        </View>

        <TextInput
          ref={inputRef}
          style={styles.otpInput}
          value={otp}
          onChangeText={(v) => setOtp(v.replace(/[^0-9]/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="000000"
          placeholderTextColor="#444"
          textAlign="center"
          autoFocus
        />

        <TouchableOpacity
          style={[styles.button, (loading || otp.length !== 6) && { opacity: 0.6 }]}
          onPress={handleVerify}
          disabled={loading || otp.length !== 6}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verify</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleResend}
          disabled={resending}
          style={styles.resendContainer}
        >
          {resending ? (
            <ActivityIndicator color="#007AFF" size="small" />
          ) : (
            <Text style={styles.resendText}>Didn't receive a code? <Text style={styles.resendHighlight}>Resend</Text></Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#121212' },
  inner:           { flex: 1, padding: 24, justifyContent: 'center' },
  back:            { position: 'absolute', top: 20, left: 24 },
  backText:        { color: '#007AFF', fontSize: 16 },
  headerContainer: { marginBottom: 40 },
  title:           { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  subtitle:        { fontSize: 15, color: '#aaa', lineHeight: 22 },
  otpInput: {
    backgroundColor: '#1e1e1e',
    color: '#fff',
    borderRadius: 12,
    padding: 20,
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 12,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 28,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  buttonText:       { color: '#fff', fontSize: 18, fontWeight: '600' },
  resendContainer:  { marginTop: 24, alignItems: 'center' },
  resendText:       { color: '#aaa', fontSize: 14 },
  resendHighlight:  { color: '#007AFF', fontWeight: 'bold' },
});