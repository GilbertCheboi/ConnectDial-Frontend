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
import { ThemeContext } from '../../store/themeStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function EditProfileScreen({ navigation, route }) {
  const { setIsNew } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext) || {
    theme: {
      colors: {
        background: '#0D1F2D',
        surface: '#162636',
        text: '#F8FAFC',
        subText: '#94A3B8',
        primary: '#1E90FF',
        secondary: '#64748B',
        inputBackground: '#162636',
      },
    },
  };

  // --- 1. MODE & ONBOARDING DATA ---
  const mode = route.params?.mode || 'edit';
  const isOnboarding = mode === 'onboarding';

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
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }] }>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { backgroundColor: theme.colors.background }]}
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
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}> 
            {isOnboarding ? 'Finish Setup' : 'Edit Profile'}
          </Text>
          <TouchableOpacity onPress={handleProfileSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : (
              <Text style={[styles.saveText, { color: theme.colors.primary }]}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Banner Section */}
        <TouchableOpacity
          onPress={() => pickImage('banner')}
          activeOpacity={0.9}
          style={[styles.bannerContainer, { backgroundColor: theme.colors.surface }]}
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
            backgroundColor={theme.colors.surface}
          />
          <View style={[styles.bannerOverlay, { backgroundColor: 'rgba(0,0,0,0.35)' }]}>
            <MaterialCommunityIcons name="camera" size={24} color={theme.colors.buttonText} />
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
              backgroundColor={theme.colors.primary}
            />
            <View style={[styles.cameraBadge, { backgroundColor: theme.colors.primary }]}> 
              <MaterialCommunityIcons
                name="camera-plus"
                size={16}
                color={theme.colors.buttonText}
              />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.primary }]}>DISPLAY NAME</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.inputBackground, color: theme.colors.text }]}
              placeholder="Your name"
              placeholderTextColor={theme.colors.subText}
              value={displayName}
              onChangeText={setDisplayName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.primary }]}>BIO</Text>
            <TextInput
              style={[styles.input, styles.bioInput, { backgroundColor: theme.colors.inputBackground, color: theme.colors.text }]}
              placeholder="Tell us about yourself..."
              placeholderTextColor={theme.colors.subText}
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
              <Text style={[styles.skipText, { color: theme.colors.subText }]}>Skip for now</Text>
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
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  saveText: { fontSize: 16, fontWeight: 'bold' },
  iconBtn: { padding: 5 },
  bannerContainer: { width: '100%', height: 160, position: 'relative' },
  bannerImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  bannerOverlay: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    padding: 8,
    borderRadius: 20,
  },
  avatarWrapper: { alignItems: 'center', marginTop: -50 },
  avatarBtn: { alignItems: 'center', justifyContent: 'center' },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    padding: 6,
    borderRadius: 15,
  },
  form: { paddingHorizontal: 25, marginTop: 30 },
  inputGroup: { marginBottom: 25 },
  label: {
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 10,
  },
  input: {
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
  },
  bioInput: { height: 100, textAlignVertical: 'top' },
  skipBtn: { marginTop: 10, alignSelf: 'center' },
  skipText: { fontWeight: '600' },
});
