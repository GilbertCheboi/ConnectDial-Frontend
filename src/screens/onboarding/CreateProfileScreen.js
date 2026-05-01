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
  Platform,
  ScrollView,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import api from '../../api/client';
import { AuthContext } from '../../store/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function CreateProfileScreen({ navigation }) {
  // --- 1. HOOKS ---
  const { authData, setIsNew } = useContext(AuthContext);

  // --- 2. STATE ---
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [bannerImage, setBannerImage] = useState(null);
  const [loading, setLoading] = useState(false);

  // --- 3. IMAGE PICKING LOGIC ---
  const pickImage = type => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
    };

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

  // --- 4. SUBMIT LOGIC ---
  const handleProfileSubmit = async () => {
    if (!displayName.trim()) {
      return Alert.alert('Error', 'Display name is required');
    }

    setLoading(true);
    const formData = new FormData();

    formData.append('display_name', displayName);
    formData.append('bio', bio);

    if (profileImage) {
      formData.append('profile_image', {
        uri:
          Platform.OS === 'android'
            ? profileImage.uri
            : profileImage.uri.replace('file://', ''),
        type: profileImage.type || 'image/jpeg',
        name: profileImage.fileName || 'profile.jpg',
      });
    }

    if (bannerImage) {
      formData.append('banner_image', {
        uri:
          Platform.OS === 'android'
            ? bannerImage.uri
            : bannerImage.uri.replace('file://', ''),
        type: bannerImage.type || 'image/jpeg',
        name: bannerImage.fileName || 'banner.jpg',
      });
    }

    try {
      const token = authData?.token;

      const response = await api.post('auth/update/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Token ${token}`,
        },
      });

      if (response.status === 200 || response.status === 201) {
        // 1. Save to Disk FIRST
        await AsyncStorage.setItem('is_new_user', JSON.stringify(false));

        // 2. Update Global State SECOND
        setIsNew(false);

        // 3. Navigate LAST
        // navigation.reset({
        //   index: 0,
        //   routes: [{ name: 'MainTabs' }], // Match your AppNavigator name
        // });
      }
    } catch (error) {
      console.error('Update Error:', error.response?.data || error.message);
      const errorMsg =
        error.response?.data?.detail || error.message || 'Something went wrong';
      Alert.alert('Upload Failed', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.header}>Finalize Your Profile</Text>

      {/* Banner Section */}
      <TouchableOpacity
        onPress={() => pickImage('banner')}
        style={styles.bannerBtn}
      >
        {bannerImage ? (
          <Image source={{ uri: bannerImage.uri }} style={styles.banner} />
        ) : (
          <Text style={styles.imageText}>+ Add Banner Photo</Text>
        )}
      </TouchableOpacity>

      {/* Profile Photo Section */}
      <TouchableOpacity
        onPress={() => pickImage('profile')}
        style={styles.profileBtn}
      >
        {profileImage ? (
          <Image source={{ uri: profileImage.uri }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.imageText}>Photo</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.form}>
        <Text style={styles.label}>Display Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. John Doe"
          placeholderTextColor="#666"
          value={displayName}
          onChangeText={setDisplayName}
        />

        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.bioInput]}
          placeholder="Tell the community about yourself..."
          placeholderTextColor="#666"
          value={bio}
          onChangeText={setBio}
          multiline
        />

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleProfileSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Finish & Enter App</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
    backgroundColor: '#0D1F2D',
    minHeight: '100%',
  },
  header: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
    marginVertical: 30,
    textAlign: 'center',
  },
  bannerBtn: {
    width: '100%',
    height: 160,
    backgroundColor: '#1A2A3D',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  banner: { width: '100%', height: 160, resizeMode: 'cover' },
  profileBtn: { alignSelf: 'center', marginTop: -50, marginBottom: 20 },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: '#0D1F2D',
  },
  avatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#1E90FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#0D1F2D',
  },
  imageText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  form: { paddingHorizontal: 20 },
  label: {
    color: '#1E90FF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#1A2A3D',
    color: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  bioInput: { height: 100, textAlignVertical: 'top' },
  submitBtn: {
    backgroundColor: '#1E90FF',
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 10,
    elevation: 3,
  },
  submitBtnDisabled: {
    backgroundColor: '#555',
  },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
});
