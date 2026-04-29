/**
 * src/api/auth.js
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import client from './client'; // ✅ fixed path — same folder

// ─── Configure Google Sign-In ────────────────────────────────────────────────
export const configureGoogleSignin = () => {
  GoogleSignin.configure({
    webClientId: '849401797302-h2a3b2jhvru6fthok0rbb9b66mamhcce.apps.googleusercontent.com', // ✅ correct
    offlineAccess: true,
  });
};

// ─── Save JWT session to AsyncStorage ───────────────────────────────────────
export const saveSession = async ({ access, refresh, user }) => {
  await AsyncStorage.multiSet([
    ['access',  access],
    ['refresh', refresh],
    ['user',    JSON.stringify(user)],
  ]);
  return user;
};

// ─── Extract a readable error message ───────────────────────────────────────
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
// EMAIL / PASSWORD LOGIN
// ════════════════════════════════════════════════════════════════════════════

export const loginUser = async (identifier, password) => {
  const { data } = await client.post('auth/login/', {
    username: identifier,
    password,
  });

  if (data.two_fa_required) {
    return { twoFARequired: true, pendingToken: data.pending_token };
  }

  const user = await saveSession(data);
  return { twoFARequired: false, user };
};

// ════════════════════════════════════════════════════════════════════════════
// GOOGLE SIGN-IN
// ════════════════════════════════════════════════════════════════════════════

export const googleLogin = async () => {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // Optional: clear previous session for a fresh login
    await GoogleSignin.signOut();

    const userInfo = await GoogleSignin.signIn();

    // Modern response handling
    let idToken = null;

    if (userInfo?.type === 'success') {
      idToken = userInfo.data?.idToken;
    } else {
      throw new Error('Google sign-in was cancelled or failed');
    }

    if (!idToken) {
      throw new Error('Google sign-in did not return an ID token.');
    }

    const { data } = await client.post('auth/social/google/', { 
      id_token: idToken 
    });

    console.log('✅ FULL BACKEND RESPONSE:', JSON.stringify(data));

    const user = await saveSession(data);
    return { 
      user, 
      isNewUser: data.is_new_user ?? false 
    };
  } catch (error) {
    // Handle specific Google errors if needed
    console.error('Google login error:', error);
    throw error;
  }
};

// ════════════════════════════════════════════════════════════════════════════
// TWO-FACTOR AUTH
// ════════════════════════════════════════════════════════════════════════════

export const verifyTwoFA = async (pendingToken, otp) => {
  const { data } = await client.post('auth/2fa/verify/', {
    pending_token: pendingToken,
    otp,
  });
  const user = await saveSession(data);
  return { user };
};

export const resendTwoFACode = async (pendingToken) => {
  const { data } = await client.post('auth/2fa/resend/', {
    pending_token: pendingToken,
  });
  return data.message;
};

export const setTwoFAEnabled = async (enable) => {
  const { data } = await client.post('auth/2fa/toggle/', { enable });
  return data.two_fa_enabled;
};

export const getTwoFAStatus = async () => {
  const { data } = await client.get('auth/2fa/status/');
  return data.two_fa_enabled;
};

// ════════════════════════════════════════════════════════════════════════════
// FORGOT PASSWORD
// ════════════════════════════════════════════════════════════════════════════

export const requestPasswordReset = async (identifier) => {
  await client.post('auth/forgot-password/request/', { identifier });
};

export const verifyResetOTP = async (identifier, otp) => {
  const { data } = await client.post('auth/forgot-password/verify/', {
    identifier,
    otp,
  });
  return data.reset_token;
};

export const resetPassword = async (resetToken, newPassword) => {
  await client.post('auth/forgot-password/reset/', {
    reset_token:  resetToken,
    new_password: newPassword,
  });
};

// ════════════════════════════════════════════════════════════════════════════
// REGISTER
// ════════════════════════════════════════════════════════════════════════════

export const registerUser = async ({ username, email, password1, password2 }) => {
  const { data } = await client.post('auth/register/', {
    username,
    email,
    password1,
    password2,
  });
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
  await AsyncStorage.setItem('user', JSON.stringify(data.user));
  return data.user;
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