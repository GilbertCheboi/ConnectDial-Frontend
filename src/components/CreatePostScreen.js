/**
 * CreatePostScreen.js – Updated to support video posts with streaming
 * Features:
 * • Multi-content type support (text, image, video)
 * • Video upload button
 * • Processing state handling
 * • League/team selection
 * • Hashtag suggestions
 */

import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../store/authStore';
import { ThemeContext } from '../store/themeStore';
import api from '../api/client';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CreatePostScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);

  // ── Content ────────────────────────────────────────────────────
  const [content, setContent] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoStatus, setVideoStatus] = useState(null);

  // ── Metadata ───────────────────────────────────────────────────
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [leagues, setLeagues] = useState([]);
  const [teams, setTeams] = useState([]);

  // ── UI State ───────────────────────────────────────────────────
  const [isPosting, setIsPosting] = useState(false);
  const [isLoadingLeagues, setIsLoadingLeagues] = useState(true);
  const [showLeagueDropdown, setShowLeagueDropdown] = useState(false);
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);

  // ── Check if returning from video upload ──────────────────────
  useEffect(() => {
    if (route.params?.postId && route.params?.isVideo) {
      setSelectedVideo({
        id: route.params.postId,
        status: route.params.videoStatus,
      });
      setVideoStatus(route.params.videoStatus);
    }
  }, [route.params]);

  // ── Load leagues on mount ────────────────────────────────────
  useEffect(() => {
    loadLeagues();
  }, []);

  const loadLeagues = async () => {
    try {
      setIsLoadingLeagues(true);
      const response = await api.get('/api/leagues/');
      setLeagues(response.data || []);
    } catch (err) {
      Alert.alert('Error', 'Failed to load leagues');
    } finally {
      setIsLoadingLeagues(false);
    }
  };

  // ── Load teams for selected league ───────────────────────────
  const loadTeamsForLeague = async (leagueId) => {
    try {
      const response = await api.get(`/api/leagues/${leagueId}/teams/`);
      setTeams(response.data || []);
      setSelectedTeam(null);
    } catch (err) {
      console.error('Failed to load teams:', err);
      setTeams([]);
    }
  };

  // ── Handle league selection ──────────────────────────────────
  const handleLeagueSelect = (league) => {
    setSelectedLeague(league);
    setShowLeagueDropdown(false);
    loadTeamsForLeague(league.id);
  };

  // ── Pick image ───────────────────────────────────────────────
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0]);
        setSelectedVideo(null);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  // ── Navigate to video upload ─────────────────────────────────
  const handleUploadVideo = () => {
    if (!selectedLeague) {
      Alert.alert('Required', 'Please select a league first');
      return;
    }

    navigation.navigate('VideoUpload', {
      leagueId: selectedLeague.id,
      isShort: false,
    });
  };

  // ── Create post ──────────────────────────────────────────────
  const handlePost = async () => {
    if (!content.trim() && !selectedImage && !selectedVideo) {
      Alert.alert('Error', 'Post needs content, image, or video');
      return;
    }

    if (!selectedLeague) {
      Alert.alert('Required', 'Please select a league');
      return;
    }

    try {
      setIsPosting(true);

      const postData = {
        content: content.trim(),
        league_id: selectedLeague.id,
        team_id: selectedTeam?.id || null,
      };

      // If returning from video upload, just update the post
      if (selectedVideo?.id && videoStatus === 'processing') {
        // Update existing post with caption
        await api.patch(`/api/posts/${selectedVideo.id}/`, postData);
      } else if (selectedImage) {
        // Image post
        const formData = new FormData();
        formData.append('content', content.trim());
        formData.append('post_type', 'image');
        formData.append('league_id', selectedLeague.id);
        formData.append('team_id', selectedTeam?.id || '');
        formData.append('media_file', {
          uri: selectedImage.uri,
          name: `image_${Date.now()}.jpg`,
          type: 'image/jpeg',
        });

        await api.post('/api/posts/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        // Text post
        await api.post('/api/posts/', postData);
      }

      Alert.alert('Success', 'Post created!');
      navigation.goBack();
      setContent('');
      setSelectedImage(null);
      setSelectedVideo(null);
    } catch (err) {
      console.error('Post creation error:', err);
      Alert.alert('Error', err.response?.data?.detail || 'Failed to create post');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons
            name="close"
            size={24}
            color={theme.colors.text}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Create Post
        </Text>
        <TouchableOpacity
          onPress={handlePost}
          disabled={isPosting || (!content.trim() && !selectedImage && !selectedVideo)}
        >
          <MaterialCommunityIcons
            name="check"
            size={24}
            color={isPosting ? theme.colors.subText : theme.colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Author Info */}
      <View style={styles.authorSection}>
        <Image
          source={{ uri: user?.profile_pic }}
          style={styles.authorAvatar}
        />
        <View>
          <Text style={[styles.authorName, { color: theme.colors.text }]}>
            {user?.display_name || user?.username}
          </Text>
          <Text style={[styles.authorHandle, { color: theme.colors.subText }]}>
            @{user?.username}
          </Text>
        </View>
      </View>

      {/* Content Input */}
      <TextInput
        style={[
          styles.contentInput,
          {
            color: theme.colors.text,
            borderColor: theme.colors.border,
          },
        ]}
        placeholder="What's on your mind?"
        placeholderTextColor={theme.colors.subText}
        multiline
        maxLength={2000}
        value={content}
        onChangeText={setContent}
      />

      {/* Character Count */}
      <Text style={[styles.charCount, { color: theme.colors.subText }]}>
        {content.length} / 2000
      </Text>

      {/* Media Preview */}
      {selectedImage && (
        <View style={styles.mediaPreviewContainer}>
          <Image
            source={{ uri: selectedImage.uri }}
            style={styles.mediaPreview}
          />
          <TouchableOpacity
            style={styles.removeMediaButton}
            onPress={() => setSelectedImage(null)}
          >
            <MaterialCommunityIcons
              name="close-circle"
              size={28}
              color={theme.colors.notificationBadge}
            />
          </TouchableOpacity>
        </View>
      )}

      {selectedVideo && (
        <View style={styles.videoPreviewContainer}>
          <View style={styles.videoPreviewContent}>
            <MaterialCommunityIcons
              name="video"
              size={40}
              color={theme.colors.primary}
            />
            <Text style={[styles.videoPreviewText, { color: theme.colors.text }]}>
              Video selected
            </Text>
            <Text style={[styles.videoPreviewSubtext, { color: theme.colors.subText }]}>
              Status: {videoStatus || 'pending'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.removeMediaButton}
            onPress={() => setSelectedVideo(null)}
          >
            <MaterialCommunityIcons
              name="close-circle"
              size={28}
              color={theme.colors.notificationBadge}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Media Selection Buttons */}
      <View style={styles.mediaButtonsContainer}>
        <TouchableOpacity
          style={[
            styles.mediaButton,
            { backgroundColor: theme.colors.primary + '20' },
          ]}
          onPress={pickImage}
          disabled={!!selectedVideo}
        >
          <MaterialCommunityIcons
            name="image-outline"
            size={20}
            color={theme.colors.primary}
          />
          <Text style={[styles.mediaButtonText, { color: theme.colors.primary }]}>
            Image
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.mediaButton,
            { backgroundColor: theme.colors.primary + '20' },
          ]}
          onPress={handleUploadVideo}
          disabled={!!selectedImage}
        >
          <MaterialCommunityIcons
            name="video-outline"
            size={20}
            color={theme.colors.primary}
          />
          <Text style={[styles.mediaButtonText, { color: theme.colors.primary }]}>
            Video
          </Text>
        </TouchableOpacity>
      </View>

      {/* League Selection */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          League
        </Text>

        {isLoadingLeagues ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : (
          <TouchableOpacity
            style={[
              styles.dropdownButton,
              { borderColor: theme.colors.border },
            ]}
            onPress={() => setShowLeagueDropdown(!showLeagueDropdown)}
          >
            <Text
              style={[
                styles.dropdownButtonText,
                {
                  color: selectedLeague ? theme.colors.text : theme.colors.subText,
                },
              ]}
            >
              {selectedLeague ? selectedLeague.name : 'Select league'}
            </Text>
            <MaterialCommunityIcons
              name={showLeagueDropdown ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={theme.colors.subText}
            />
          </TouchableOpacity>
        )}

        {showLeagueDropdown && (
          <View style={[styles.dropdown, { backgroundColor: theme.colors.surface }]}>
            {leagues.map((league) => (
              <TouchableOpacity
                key={league.id}
                style={[
                  styles.dropdownItem,
                  selectedLeague?.id === league.id && styles.dropdownItemActive,
                ]}
                onPress={() => handleLeagueSelect(league)}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    {
                      color:
                        selectedLeague?.id === league.id
                          ? theme.colors.primary
                          : theme.colors.text,
                    },
                  ]}
                >
                  {league.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Team Selection */}
      {selectedLeague && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Team (Optional)
          </Text>

          <TouchableOpacity
            style={[
              styles.dropdownButton,
              { borderColor: theme.colors.border },
            ]}
            onPress={() => setShowTeamDropdown(!showTeamDropdown)}
          >
            <Text
              style={[
                styles.dropdownButtonText,
                {
                  color: selectedTeam ? theme.colors.text : theme.colors.subText,
                },
              ]}
            >
              {selectedTeam ? selectedTeam.name : 'Select team'}
            </Text>
            <MaterialCommunityIcons
              name={showTeamDropdown ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={theme.colors.subText}
            />
          </TouchableOpacity>

          {showTeamDropdown && (
            <View style={[styles.dropdown, { backgroundColor: theme.colors.surface }]}>
              {teams.map((team) => (
                <TouchableOpacity
                  key={team.id}
                  style={[
                    styles.dropdownItem,
                    selectedTeam?.id === team.id && styles.dropdownItemActive,
                  ]}
                  onPress={() => {
                    setSelectedTeam(team);
                    setShowTeamDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      {
                        color:
                          selectedTeam?.id === team.id
                            ? theme.colors.primary
                            : theme.colors.text,
                      },
                    ]}
                  >
                    {team.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Post Button */}
      <TouchableOpacity
        style={[
          styles.postButton,
          {
            backgroundColor: theme.colors.primary,
            opacity: isPosting ? 0.6 : 1,
          },
        ]}
        onPress={handlePost}
        disabled={isPosting}
      >
        {isPosting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.postButtonText}>Post</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  authorName: {
    fontWeight: '600',
    fontSize: 14,
  },
  authorHandle: {
    fontSize: 12,
    marginTop: 2,
  },
  contentInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 100,
    fontSize: 16,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginBottom: 16,
  },
  mediaPreviewContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    height: 200,
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  videoPreviewContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    height: 150,
    backgroundColor: 'rgba(30, 144, 255, 0.1)',
  },
  videoPreviewContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPreviewText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  videoPreviewSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  removeMediaButton: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  mediaButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  mediaButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  mediaButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownButtonText: {
    fontSize: 14,
  },
  dropdown: {
    borderRadius: 8,
    marginTop: 8,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(30, 144, 255, 0.1)',
  },
  dropdownItemText: {
    fontSize: 14,
  },
  postButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  postButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default CreatePostScreen;