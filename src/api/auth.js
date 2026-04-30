/**
 * src/api/auth.js
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import client from './client';

// ─── Configure Google Sign-In ────────────────────────────────────────────────
export const configureGoogleSignin = () => {
  GoogleSignin.configure({
    webClientId: '849401797302-h2a3b2jhvru6fthok0rbb9b66mamhcce.apps.googleusercontent.com',
    offlineAccess: true,
  });
};

// ─── Save JWT session to AsyncStorage ────────────────────────────────────────
export const saveSession = async ({ access, refresh, user }) => {
  await AsyncStorage.multiSet([
    ['access',  access],
    ['refresh', refresh],
    ['user',    JSON.stringify(user)],
  ]);
  return user;
};

// ─── Extract a readable error message ────────────────────────────────────────
export const getErrorMessage = (error) => {
  const data = error?.response?.data;
  if (!data) return error?.message || 'Something went wrong. Please try again.';
  return (
    data.error ||
    data.detail ||
    data.non_field_errors?.[0] ||
    Object.values(data).flat().join(' ') ||
    'Something went wrong.'
  );
};

// ════════════════════════════════════════════════════════════════════════════
// EMAIL / PASSWORD LOGIN  (2-step: credentials → OTP → JWT)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Step 1 — Send credentials.
 * Returns { pendingToken, message } on success.
 * The backend emails a 6-digit OTP to the user.
 */
export const loginUser = async (identifier, password) => {
  try {
    console.log(`📤 Attempting login with: ${identifier}`);

    const res = await client.post('auth/login/', {
      email: identifier.trim(),   // Backend expects 'email' key
      password: password,
    });

    console.log("✅ Login successful");
    return res.data;

  } catch (error) {
    console.error("❌ Login error:", error.response?.data);
    throw error;
  }
};
/**
 * Step 2 — Verify OTP.
 * Returns { access, refresh, user } on success.
 */
export const verifyLoginOTP = async (pendingToken, otp) => {
  const { data } = await client.post('auth/login/verify/', {
    pending_token: pendingToken,
    otp,
  });
  return {
    access:  data.access,
    refresh: data.refresh,
    user:    data.user,
  };
};

/**
 * Resend login OTP.
 */
export const resendLoginOTP = async (pendingToken) => {
  const { data } = await client.post('auth/login/resend/', {
    pending_token: pendingToken,
  });
  return data.message;
};

// ════════════════════════════════════════════════════════════════════════════
// GOOGLE SIGN-IN
// ════════════════════════════════════════════════════════════════════════════

export const googleLogin = async () => {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  await GoogleSignin.signOut(); // clear previous session

  const userInfo = await GoogleSignin.signIn();

  let idToken = null;
  if (userInfo?.type === 'success') {
    idToken = userInfo.data?.idToken;
  } else {
    throw new Error('Google sign-in was cancelled or failed.');
  }

  if (!idToken) {
    throw new Error('Google sign-in did not return an ID token.');
  }

  const { data } = await client.post('auth/social/google/', { id_token: idToken });

  await saveSession(data);

  return {
    access:    data.access,
    refresh:   data.refresh,
    user:      data.user,
    isNewUser: data.is_new_user ?? false,
  };
};

// ════════════════════════════════════════════════════════════════════════════
// FORGOT PASSWORD
// ════════════════════════════════════════════════════════════════════════════

export const requestPasswordReset = async (identifier) => {
  await client.post('auth/forgot-password/request/', { identifier });
};

export const verifyResetOTP = async (identifier, otp) => {
  const { data } = await client.post('auth/forgot-password/verify/', { identifier, otp });
  return data.reset_token;
};

export const resetPassword = async (resetToken, newPassword) => {
  await client.post('auth/forgot-password/reset/', {
    reset_token:      resetToken,
    new_password:     newPassword,
    confirm_password: newPassword,
  });
};

// ════════════════════════════════════════════════════════════════════════════
// REGISTER
// ════════════════════════════════════════════════════════════════════════════

export const registerUser = async ({ username, email, password1, password2 }) => {
  const { data } = await client.post('auth/register/', { username, email, password1, password2 });
  return data;
};

// ════════════════════════════════════════════════════════════════════════════
// ONBOARDING
// ════════════════════════════════════════════════════════════════════════════

export const completeOnboarding = async (accountType, fanPreferences = []) => {
  const { data } = await client.post('auth/onboarding/', {
    account_type:    accountType,
    fan_preferences: fanPreferences,
  });
  await AsyncStorage.setItem('user', JSON.stringify(data));
  return data;
};

// ════════════════════════════════════════════════════════════════════════════
// PROFILE
// ════════════════════════════════════════════════════════════════════════════

export const getProfile = async (userId = null) => {
  const params = userId ? { user_id: userId } : {};
  const { data } = await client.get('auth/update/', { params });
  return data;
};

export const updateProfile = async (fields) => {
  const form = new FormData();
  if (fields.displayName  !== undefined) form.append('display_name', fields.displayName);
  if (fields.bio          !== undefined) form.append('bio',          fields.bio);
  if (fields.fcmToken     !== undefined) form.append('fcm_token',    fields.fcmToken);
  if (fields.profileImage !== undefined) {
    form.append('profile_image', {
      uri:  fields.profileImage.uri,
      name: fields.profileImage.fileName || 'profile.jpg',
      type: fields.profileImage.type     || 'image/jpeg',
    });
  }
  if (fields.bannerImage !== undefined) {
    form.append('banner_image', {
      uri:  fields.bannerImage.uri,
      name: fields.bannerImage.fileName || 'banner.jpg',
      type: fields.bannerImage.type     || 'image/jpeg',
    });
  }
  const { data } = await client.patch('auth/update/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
};

export const searchUsers = async (query) => {
  const { data } = await client.get('auth/search/', { params: { search: query } });
  return data;
};

// ════════════════════════════════════════════════════════════════════════════
// FOLLOW / UNFOLLOW
// ════════════════════════════════════════════════════════════════════════════

export const toggleFollow = async (userId) => {
  const { data } = await client.post(`auth/users/${userId}/toggle-follow/`);
  return data;
};

// ════════════════════════════════════════════════════════════════════════════
// LOGOUT
// ════════════════════════════════════════════════════════════════════════════

export const logoutUser = async () => {
  try {
    const refresh = await AsyncStorage.getItem('refresh');
    await client.post('auth/logout-custom/', { refresh });
  } catch {
    // Network error — still clear local session
  } finally {
    await AsyncStorage.multiRemove(['access', 'refresh', 'user']);
    try { await GoogleSignin.signOut(); } catch { /* not signed in via Google */ }
  }
};