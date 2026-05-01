/**
 * src/screens/auth/ForgotPasswordScreen.js
 * 3-step forgot-password flow:
 *   Step 1 — enter email/username → OTP sent
 *   Step 2 — enter 6-digit OTP   → reset token issued
 *   Step 3 — enter new password  → done, navigate to Login
 */

import React, { useState } from 'react';
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
import { requestPasswordReset, verifyResetOTP, resetPassword } from '../../api/auth';

export default function ForgotPasswordScreen({ navigation }) {
  const [step,            setStep]            = useState(1);
  const [identifier,      setIdentifier]      = useState('');
  const [otp,             setOtp]             = useState('');
  const [resetToken,      setResetToken]      = useState('');
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading,         setLoading]         = useState(false);

  // ── Step 1: Request OTP ────────────────────────────────────────────────
  // FIX 1: Pass identifier directly — requestPasswordReset now sends { email }
  // to match ForgotPasswordView which only reads request.data.get("email").
  const handleRequestOTP = async () => {
    if (!identifier.trim()) {
      Alert.alert('Required', 'Please enter your email or username.');
      return;
    }
    setLoading(true);
    try {
      await requestPasswordReset(identifier.trim());
      // Always move to step 2 — backend never reveals if account exists
      setStep(2);
    } catch {
      // Even on network error show the same message to prevent enumeration
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP ────────────────────────────────────────────────
  // FIX 2 + 3: verifyResetOTP now sends purpose:'password_reset' so the
  // backend queries OTPCode with the correct purpose and returns a reset_token.
  // The returned token is stored and passed directly to resetPassword in step 3.
  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      const token = await verifyResetOTP(identifier.trim(), otp);
      setResetToken(token);
      setStep(3);
    } catch (err) {
      Alert.alert('Invalid Code', 'The code is incorrect or has expired. Please try again.');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Set New Password ──────────────────────────────────────────
  // FIX 3: resetPassword now takes (resetToken, newPassword) and sends
  // { reset_token, new_password } — matching the updated ResetPasswordView
  // which no longer accepts email + otp, only the scoped JWT.
  const handleResetPassword = async () => {
    if (newPassword.length < 8) {
      Alert.alert('Weak Password', 'Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(resetToken, newPassword);
      Alert.alert('Success', 'Your password has been reset. Please log in.', [
        { text: 'Login', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to reset password. Please start again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Step indicator ────────────────────────────────────────────────────
  const stepTitles    = ['Find Account', 'Enter Code', 'New Password'];
  const stepSubtitles = [
    'Enter your email or username to receive a reset code.',
    `Enter the 6-digit code sent to your email.\nIt expires in 10 minutes.`,
    'Choose a strong new password.',
  ];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <TouchableOpacity
          onPress={() => step > 1 ? setStep(step - 1) : navigation.goBack()}
          style={styles.back}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {/* Progress dots */}
        <View style={styles.progressContainer}>
          {[1, 2, 3].map((s) => (
            <View key={s} style={[styles.dot, s <= step && styles.dotActive]} />
          ))}
        </View>

        <View style={styles.headerContainer}>
          <Text style={styles.title}>{stepTitles[step - 1]}</Text>
          <Text style={styles.subtitle}>{stepSubtitles[step - 1]}</Text>
        </View>

        {/* ── Step 1 ── */}
        {step === 1 && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Email or Username"
              placeholderTextColor="#666"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
            <TouchableOpacity
              style={[styles.button, loading && { opacity: 0.7 }]}
              onPress={handleRequestOTP}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.buttonText}>Send Code</Text>
              }
            </TouchableOpacity>
          </>
        )}

        {/* ── Step 2 ── */}
        {step === 2 && (
          <>
            <TextInput
              style={[styles.input, styles.otpInput]}
              placeholder="000000"
              placeholderTextColor="#444"
              value={otp}
              onChangeText={(v) => setOtp(v.replace(/[^0-9]/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              textAlign="center"
              autoFocus
            />
            <TouchableOpacity
              style={[styles.button, (loading || otp.length !== 6) && { opacity: 0.6 }]}
              onPress={handleVerifyOTP}
              disabled={loading || otp.length !== 6}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.buttonText}>Verify Code</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity onPress={handleRequestOTP} style={styles.resendContainer}>
              <Text style={styles.resendText}>Resend code</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Step 3 ── */}
        {step === 3 && (
          <>
            <TextInput
              style={styles.input}
              placeholder="New Password (min 8 characters)"
              placeholderTextColor="#666"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm New Password"
              placeholderTextColor="#666"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            <TouchableOpacity
              style={[styles.button, loading && { opacity: 0.7 }]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.buttonText}>Reset Password</Text>
              }
            </TouchableOpacity>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: '#121212' },
  inner:             { flex: 1, padding: 24, justifyContent: 'center' },
  back:              { position: 'absolute', top: 20, left: 24 },
  backText:          { color: '#007AFF', fontSize: 16 },
  progressContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 36, gap: 8 },
  dot:               { width: 8, height: 8, borderRadius: 4, backgroundColor: '#333' },
  dotActive:         { backgroundColor: '#007AFF', width: 24 },
  headerContainer:   { marginBottom: 32 },
  title:             { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 10 },
  subtitle:          { fontSize: 15, color: '#aaa', lineHeight: 22 },
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
  otpInput:         { fontSize: 32, fontWeight: 'bold', letterSpacing: 12 },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText:       { color: '#fff', fontSize: 18, fontWeight: '600' },
  resendContainer:  { marginTop: 20, alignItems: 'center' },
  resendText:       { color: '#007AFF', fontSize: 14 },
});