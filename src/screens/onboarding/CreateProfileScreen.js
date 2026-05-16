import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import api from '../../api/client';
import { AuthContext } from '../../store/authStore';
import { ThemeContext } from '../../store/themeStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function CreateProfileScreen({ navigation }) {
  const { setIsNew } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext) || {
    theme: {
      colors: {
        background: '#0D1F2D',
        surface: '#1A2A3D',
        text: '#F8FAFC',
        subText: '#94A3B8',
        primary: '#1E90FF',
        secondary: '#64748B',
        inputBackground: '#1A2A3D',
      },
    },
  };

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [bannerImage, setBannerImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = type => {
    const options = { mediaType: 'photo', quality: 0.8 };
    launchImageLibrary(options, response => {
      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert('Error', response.errorMessage);
        return;
      }
      const source = response.assets[0];
      if (type === 'profile') setProfileImage(source);
      else setBannerImage(source);
    });
  };

  const handleProfileSubmit = async () => {
    if (!displayName.trim()) {
      return Alert.alert('Error', 'Display name is required');
    }
    if (displayName.trim().length > 50) {
      return Alert.alert('Error', 'Display name must be under 50 characters');
    }

    setLoading(true);
    const formData = new FormData();

    formData.append('display_name', displayName.trim());

    // ✅ Only send bio if not empty
    if (bio.trim()) {
      formData.append('bio', bio.trim());
    }

    if (profileImage) {
      formData.append('profile_image', {
        // ✅ Always strip file:// — safe on both platforms
        uri: profileImage.uri.replace('file://', ''),
        type: profileImage.type || 'image/jpeg',
        name: profileImage.fileName || 'profile.jpg',
      });
    }

    if (bannerImage) {
      formData.append('banner_image', {
        uri: bannerImage.uri.replace('file://', ''),
        type: bannerImage.type || 'image/jpeg',
        name: bannerImage.fileName || 'banner.jpg',
      });
    }

    try {
      const response = await api.post('auth/update/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.status === 200 || response.status === 201) {
        await AsyncStorage.setItem('is_new_user', JSON.stringify(false));
        setIsNew(false);
      }
    } catch (error) {
      console.error('Update Error:', error.response?.data || error.message);

      let errorMsg = 'Something went wrong';
      if (error.code === 'ECONNABORTED') {
        errorMsg = 'Request timed out. Check your connection.';
      } else if (error.response) {
        errorMsg =
          error.response.data?.detail ||
          error.response.data?.message ||
          `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMsg = 'No response from server. Check your connection.';
      }

      Alert.alert('Upload Failed', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.header, { color: theme.colors.text }]}>Finalize Your Profile</Text>

      {/* Banner */}
      <TouchableOpacity onPress={() => pickImage('banner')} style={[styles.bannerBtn, { backgroundColor: theme.colors.surface }]}>
        {bannerImage ? (
          <Image source={{ uri: bannerImage.uri }} style={styles.banner} />
        ) : (
          <Text style={[styles.imageText, { color: theme.colors.text }]}>+ Add Banner Photo</Text>
        )}
      </TouchableOpacity>

      {/* Profile Photo */}
      <TouchableOpacity onPress={() => pickImage('profile')} style={styles.profileBtn}>
        {profileImage ? (
          <Image source={{ uri: profileImage.uri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primary }]}>
            <Text style={[styles.imageText, { color: theme.colors.buttonText }]}>Photo</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.form}>
        <Text style={[styles.label, { color: theme.colors.primary }]}>Display Name</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.inputBackground, color: theme.colors.text }]}
          placeholder="e.g. John Doe"
          placeholderTextColor={theme.colors.subText}
          value={displayName}
          onChangeText={setDisplayName}
          maxLength={50}
        />

        <Text style={[styles.label, { color: theme.colors.primary }]}>Bio</Text>
        <TextInput
          style={[styles.input, styles.bioInput, { backgroundColor: theme.colors.inputBackground, color: theme.colors.text }]}
          placeholder="Tell the community about yourself..."
          placeholderTextColor={theme.colors.subText}
          value={bio}
          onChangeText={setBio}
          multiline
          maxLength={300}
        />

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: theme.colors.primary }, loading && { backgroundColor: theme.colors.secondary }]}
          onPress={handleProfileSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.buttonText} />
          ) : (
            <Text style={[styles.btnText, { color: theme.colors.buttonText }]}>Finish & Enter App</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:         { paddingBottom: 40, minHeight: '100%' },
  header:            { fontSize: 24, fontWeight: 'bold', marginVertical: 30, textAlign: 'center' },
  bannerBtn:         { width: '100%', height: 160, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  banner:            { width: '100%', height: 160, resizeMode: 'cover' },
  profileBtn:        { alignSelf: 'center', marginTop: -50, marginBottom: 20 },
  avatar:            { width: 110, height: 110, borderRadius: 55, borderWidth: 4 },
  avatarPlaceholder: { width: 110, height: 110, borderRadius: 55, justifyContent: 'center', alignItems: 'center', borderWidth: 4 },
  imageText:         { fontSize: 13, fontWeight: '600' },
  form:              { paddingHorizontal: 20 },
  label:             { fontSize: 14, fontWeight: 'bold', marginBottom: 8, marginLeft: 4 },
  input:             { padding: 15, borderRadius: 12, marginBottom: 20, fontSize: 16 },
  bioInput:          { height: 100, textAlignVertical: 'top' },
  submitBtn:         { padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 10, elevation: 3 },
  submitBtnDisabled: { },
  btnText:           { fontWeight: 'bold', fontSize: 18 },
});