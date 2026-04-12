import React, { useState, useContext, useEffect } from 'react';
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
  SafeAreaView,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import api from '../../api/client';
import { AuthContext } from '../../store/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function EditProfileScreen({ navigation, route }) {
  const { setIsNew } = useContext(AuthContext);

  // --- 1. MODE & ONBOARDING DATA ---
  const mode = route.params?.mode || 'edit';
  const isOnboarding = mode === 'onboarding';
  const accountType = route.params?.accountType;
  const selectedLeagues = route.params?.selectedLeagues || [];

  // --- 2. STATE ---
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [bannerImage, setBannerImage] = useState(null);
  const [currentData, setCurrentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!isOnboarding);

  // --- 3. FETCH EXISTING DATA ---
  useEffect(() => {
    if (!isOnboarding) {
      const fetchProfile = async () => {
        try {
          const response = await api.get('auth/update/');
          setDisplayName(response.data.display_name || '');
          setBio(response.data.bio || '');
          setCurrentData(response.data);
        } catch (error) {
          console.error('Fetch Error:', error);
        } finally {
          setFetching(false);
        }
      };
      fetchProfile();
    }
  }, [isOnboarding]);

  // 🚀 OPTIMIZED IMAGE PICKER: Compression + Resizing
  const pickImage = type => {
    const options = {
      mediaType: 'photo',
      quality: 0.5, // Reduced from 0.7 to 0.5
      maxWidth: 1000, // Caps width to 1000px
      maxHeight: 1000, // Caps height to 1000px
    };

    launchImageLibrary(options, response => {
      if (response.didCancel || !response.assets) return;
      const source = response.assets[0];

      console.log(
        `📸 Selected ${type} size: ${Math.round(source.fileSize / 1024)} KB`,
      );

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

    try {
      const formData = new FormData();
      formData.append('display_name', displayName);
      formData.append('bio', bio);

      // Handle Profile Image
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

      // Handle Banner Image
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

      console.log('📤 Sending profile update to auth/update/...');

      const response = await api.post('auth/update/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 45000, // 45s is standard for optimized uploads
      });

      if (response.status === 200 || response.status === 201) {
        if (isOnboarding) {
          await AsyncStorage.setItem('is_new_user', 'false');
          setIsNew(false);
        } else {
          Alert.alert('Success', 'Profile updated!');
          navigation.goBack();
        }
      }
    } catch (error) {
      console.error('❌ Submit Error:', error.message);

      if (error.message === 'Network Error') {
        Alert.alert(
          'Upload Failed',
          'The image is still failing to upload. Try saving without an image first, or check your local server logs.',
        );
      } else {
        const msg =
          error.response?.data?.non_field_errors?.[0] ||
          'Check your connection.';
        Alert.alert('Update Failed', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E90FF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0D1F2D' }}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topNav}>
          {!isOnboarding && (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.iconBtn}
            >
              <MaterialCommunityIcons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>
            {isOnboarding ? 'Finish Setup' : 'Edit Profile'}
          </Text>
          <TouchableOpacity onPress={handleProfileSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#1E90FF" />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Banner Section */}
        <TouchableOpacity
          onPress={() => pickImage('banner')}
          activeOpacity={0.9}
          style={styles.bannerContainer}
        >
          <Image
            source={
              bannerImage
                ? { uri: bannerImage.uri }
                : currentData?.banner_image
                ? { uri: currentData.banner_image }
                : null
            }
            style={styles.bannerImage}
            backgroundColor="#1A2A3D"
          />
          <View style={styles.bannerOverlay}>
            <MaterialCommunityIcons name="camera" size={24} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Profile Image Section */}
        <View style={styles.avatarWrapper}>
          <TouchableOpacity
            onPress={() => pickImage('profile')}
            activeOpacity={0.9}
            style={styles.avatarBtn}
          >
            <Image
              source={
                profileImage
                  ? { uri: profileImage.uri }
                  : currentData?.profile_image
                  ? { uri: currentData.profile_image }
                  : null
              }
              style={styles.avatarImage}
              backgroundColor="#1E90FF"
            />
            <View style={styles.cameraBadge}>
              <MaterialCommunityIcons
                name="camera-plus"
                size={16}
                color="#fff"
              />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>DISPLAY NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor="#475569"
              value={displayName}
              onChangeText={setDisplayName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>BIO</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              placeholder="Tell us about yourself..."
              placeholderTextColor="#475569"
              value={bio}
              onChangeText={setBio}
              multiline
            />
          </View>

          {isOnboarding && (
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={async () => {
                await AsyncStorage.setItem('is_new_user', 'false');
                setIsNew(false);
              }}
            >
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0D1F2D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: { paddingBottom: 40 },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  saveText: { color: '#1E90FF', fontSize: 16, fontWeight: 'bold' },
  iconBtn: { padding: 5 },
  bannerContainer: { width: '100%', height: 160, position: 'relative' },
  bannerImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  bannerOverlay: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 20,
  },
  avatarWrapper: { alignItems: 'center', marginTop: -50 },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#0D1F2D',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1E90FF',
    padding: 6,
    borderRadius: 15,
  },
  form: { paddingHorizontal: 25, marginTop: 30 },
  inputGroup: { marginBottom: 25 },
  label: {
    color: '#1E90FF',
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#162636',
    borderRadius: 12,
    padding: 15,
    color: '#fff',
    fontSize: 16,
  },
  bioInput: { height: 100, textAlignVertical: 'top' },
  skipBtn: { marginTop: 10, alignSelf: 'center' },
  skipText: { color: '#64748B', fontWeight: '600' },
});
