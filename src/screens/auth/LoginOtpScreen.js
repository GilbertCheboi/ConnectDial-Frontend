/**
 * src/screens/auth/LoginOTPScreen.js
 * Step 2 of login — user enters the 6-digit code emailed to them.
 * Backend: POST /auth/otp/verify/  body: { email, otp, purpose: 'login' }
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert,
} from 'react-native';
import { verifyLoginOTP, resendLoginOTP } from '../../api/auth';
import { useAuth } from '../../store/authStore';

export default function LoginOTPScreen({ route, navigation }) {
  // ⚠️  Screens navigating here must pass { email } not { pendingToken }
  const { email } = route.params;
  const { login } = useAuth();

  const [otp,       setOtp]       = useState('');
  const [loading,   setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const inputRef                  = useRef(null);

  const handleVerify = async () => {
    if (otp.trim().length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      // verifyLoginOTP(email, otp) → POST /auth/otp/verify/ { email, otp, purpose: 'login' }
      // returns { key, user } from VerifyOTPView
      const data = await verifyLoginOTP(email, otp.trim());
      await login(data); // data.key is the DRF token
    } catch (err) {
      const detail = err?.response?.data?.detail || 'The code is incorrect or has expired.';
      Alert.alert('Verification Failed', detail);
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      // resendLoginOTP(email) → POST /auth/otp/send/ { email, purpose: 'login' }
      await resendLoginOTP(email);
      Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
      setOtp('');
    } catch (err) {
      const detail = err?.response?.data?.detail || 'Failed to resend code. Please try again.';
      Alert.alert('Error', detail);
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
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.headerContainer}>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit verification code to{'\n'}
            <Text style={styles.emailHighlight}>{email}</Text>
            {'\n'}It expires in 10 minutes.
          </Text>
        </View>

        <TextInput
          ref={inputRef}
          placeholder="000000"
          placeholderTextColor="#555"
          value={otp}
          onChangeText={(val) => setOtp(val.replace(/[^0-9]/g, '').slice(0, 6))}
          style={styles.otpInput}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
        />

        <TouchableOpacity
          style={[styles.button, (loading || otp.length < 6) && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={loading || otp.length < 6}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Verify & Sign In</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.resendContainer}
          onPress={handleResend}
          disabled={resending}
        >
          {resending
            ? <ActivityIndicator color="#007AFF" size="small" />
            : <Text style={styles.resendText}>
                Didn't receive a code?{' '}
                <Text style={styles.resendLink}>Resend</Text>
              </Text>}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#121212' },
  inner:           { flex: 1, padding: 24, justifyContent: 'center' },
  backButton:      { position: 'absolute', top: 20, left: 24 },
  backText:        { color: '#007AFF', fontSize: 16 },
  headerContainer: { marginBottom: 40 },
  title:           { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  subtitle:        { fontSize: 15, color: '#aaa', lineHeight: 24 },
  emailHighlight:  { color: '#fff', fontWeight: '600' },
  otpInput: {
    backgroundColor: '#1e1e1e',
    color:           '#fff',
    borderRadius:    12,
    padding:         20,
    fontSize:        32,
    fontWeight:      'bold',
    textAlign:       'center',
    letterSpacing:   12,
    borderWidth:     1,
    borderColor:     '#333',
    marginBottom:    24,
  },
  button:          { backgroundColor: '#007AFF', borderRadius: 12, padding: 18, alignItems: 'center' },
  buttonDisabled:  { opacity: 0.5 },
  buttonText:      { color: '#fff', fontSize: 18, fontWeight: '600' },
  resendContainer: { marginTop: 24, alignItems: 'center' },
  resendText:      { color: '#aaa', fontSize: 14 },
  resendLink:      { color: '#007AFF', fontWeight: 'bold' },
});