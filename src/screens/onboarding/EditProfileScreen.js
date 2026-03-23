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
  // --- 1. CONTEXT & PARAMS ---
  const { authData, setIsNew } = useContext(AuthContext);

  // Check if we are in onboarding mode or normal edit mode
  const mode = route.params?.mode || 'edit';
  const isOnboarding = mode === 'onboarding';

  // --- 2. STATE ---
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [profileImage, setProfileImage] = useState(null); // Local uri for preview
  const [bannerImage, setBannerImage] = useState(null); // Local uri for preview
  const [currentData, setCurrentData] = useState(null); // Existing data from server
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!isOnboarding);

  // --- 3. FETCH EXISTING DATA (If Editing) ---
  useEffect(() => {
    if (!isOnboarding) {
      const fetchProfile = async () => {
        try {
          const response = await api.get('auth/update/');
          const data = response.data;
          setDisplayName(data.display_name || '');
          setBio(data.bio || '');
          setCurrentData(data);
        } catch (error) {
          console.error('Error fetching profile:', error);
          Alert.alert('Error', 'Could not load profile data.');
        } finally {
          setFetching(false);
        }
      };
      fetchProfile();
    }
  }, [isOnboarding]);

  // --- 4. IMAGE PICKER ---
  const pickImage = type => {
    const options = {
      mediaType: 'photo',
      quality: 0.7,
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

  // --- 5. SUBMIT LOGIC ---
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
      const response = await api.post('auth/update/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.status === 200 || response.status === 201) {
        if (isOnboarding) {
          // Finish onboarding and swap navigator
          await AsyncStorage.setItem('is_new_user', JSON.stringify(false));
          setIsNew(false);
        } else {
          // Just go back to the profile screen
          Alert.alert('Success', 'Profile updated successfully!');
          navigation.goBack();
        }
      }
    } catch (error) {
      console.error('Update Error:', error.response?.data || error.message);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
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
        {/* Header Actions */}
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
            {isOnboarding ? 'Create Profile' : 'Edit Profile'}
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
            <Text style={styles.overlayText}>Change Cover</Text>
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

        {/* Inputs */}
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
              placeholder="Tell the community about yourself..."
              placeholderTextColor="#475569"
              value={bio}
              onChangeText={setBio}
              multiline
            />
          </View>

          {isOnboarding && (
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={() => setIsNew(false)}
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
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  saveText: { color: '#1E90FF', fontSize: 16, fontWeight: 'bold' },
  iconBtn: { padding: 5 },

  bannerContainer: { width: '100%', height: 160, position: 'relative' },
  bannerImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  bannerOverlay: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  overlayText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '600',
  },

  avatarWrapper: { alignItems: 'center', marginTop: -50 },
  avatarBtn: { position: 'relative' },
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
    borderWidth: 2,
    borderColor: '#0D1F2D',
  },

  form: { paddingHorizontal: 25, marginTop: 30 },
  inputGroup: { marginBottom: 25 },
  label: {
    color: '#1E90FF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#162636',
    borderRadius: 12,
    padding: 15,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  bioInput: { height: 100, textAlignVertical: 'top' },
  skipBtn: { marginTop: 10, alignSelf: 'center' },
  skipText: { color: '#64748B', fontSize: 14, fontWeight: '600' },
});
