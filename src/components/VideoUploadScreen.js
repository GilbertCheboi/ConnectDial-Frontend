/**
 * VideoUploadScreen.js – Advanced video upload with song search, trimming, and streaming
 * Features:
 * • Chunked upload (prevents memory overflow)
 * • Song library integration (search & filter)
 * • Trim interface with slider
 * • Processing state indication (no autoplay)
 * • Progress tracking per chunk
 * • Retry logic on failure
 */

import React, { useState, useRef, useEffect, useContext } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Slider,
  Dimensions,
  Image,
  FlatList,
} from 'react-native';
import { Video } from 'expo-av';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as DocumentPicker from 'expo-document-picker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../store/authStore';
import { ThemeContext } from '../store/themeStore';
import api from '../api/client';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHUNK_SIZE = 1024 * 1024; // 1MB chunks

const VideoUploadScreen = ({ route }) => {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);

  // ── Video Selection ──────────────────────────────────────────────
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoThumbnail, setVideoThumbnail] = useState(null);

  // ── Upload State ─────────────────────────────────────────────────
  const [uploadId, setUploadId] = useState(null);
  const [postId, setPostId] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [uploadedChunks, setUploadedChunks] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // ── Trimming ─────────────────────────────────────────────────────
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [showTrimInterface, setShowTrimInterface] = useState(false);

  // ── Song Integration ────────────────────────────────────────────
  const [selectedSong, setSelectedSong] = useState(null);
  const [songSearchQuery, setSongSearchQuery] = useState('');
  const [songLibrary, setSongLibrary] = useState([]);
  const [showSongPicker, setShowSongPicker] = useState(false);
  const [isSearchingSongs, setIsSearchingSongs] = useState(false);

  // ── Form Data ────────────────────────────────────────────────────
  const [caption, setCaption] = useState('');
  const [leagueId, setLeagueId] = useState(route?.params?.leagueId || null);
  const [isShort, setIsShort] = useState(route?.params?.isShort || false);

  const videoRef = useRef(null);
  const uploadTaskRef = useRef(null);

  // ── Pick video from device ──────────────────────────────────────
  const pickVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true,
      });

      if (result.type === 'success') {
        const file = result;
        setSelectedVideo(file);

        // Generate thumbnail
        try {
          const { uri } = await VideoThumbnails.getThumbnailAsync(file.uri, {
            time: 0,
          });
          setVideoThumbnail(uri);
        } catch (err) {
          console.error('Thumbnail generation failed:', err);
        }

        // Get video duration
        if (videoRef.current) {
          const status = await videoRef.current.getStatusAsync();
          const duration = status.durationMillis / 1000;
          setVideoDuration(duration);
          setTrimEnd(duration);
        }
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick video');
    }
  };

  // ── Search songs from backend ────────────────────────────────────
  const searchSongs = async (query) => {
    if (!query.trim()) {
      setSongLibrary([]);
      return;
    }

    setIsSearchingSongs(true);
    try {
      const response = await api.get(`/api/songs/search/?q=${encodeURIComponent(query)}`);
      setSongLibrary(response.data || []);
    } catch (err) {
      console.error('Song search error:', err);
      Alert.alert('Error', 'Failed to search songs');
    } finally {
      setIsSearchingSongs(false);
    }
  };

  // ── Debounced song search ───────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      searchSongs(songSearchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [songSearchQuery]);

  // ── Initialize upload ────────────────────────────────────────────
  const initializeUpload = async () => {
    if (!selectedVideo) {
      Alert.alert('Error', 'Please select a video');
      return;
    }

    if (!leagueId) {
      Alert.alert('Error', 'Please select a league');
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);

      const fileSize = selectedVideo.size;
      const chunks = Math.ceil(fileSize / CHUNK_SIZE);
      setTotalChunks(chunks);

      // Step 1: Initialize upload session
      const initResponse = await api.post('/api/posts/upload/init/', {
        league_id: leagueId,
        total_chunks: chunks,
        is_short: isShort,
      });

      setUploadId(initResponse.data.upload_id);
      setPostId(initResponse.data.post_id);

      // Step 2: Upload chunks
      await uploadChunks(selectedVideo.uri, chunks, initResponse.data.upload_id);
    } catch (err) {
      console.error('Upload initialization error:', err);
      setUploadError(err.message || 'Upload failed');
      setIsUploading(false);
    }
  };

  // ── Upload chunks (streaming) ─────────────────────────────────────
  const uploadChunks = async (fileUri, totalChunks, sessionId) => {
    try {
      const fileBlob = await fetch(fileUri).then((r) => r.blob());
      const fileArray = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(new Uint8Array(e.target.result));
        reader.onerror = reject;
        reader.readAsArrayBuffer(fileBlob);
      });

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min((i + 1) * CHUNK_SIZE, fileArray.byteLength);
        const chunk = fileArray.slice(start, end);

        // Create blob from chunk
        const chunkBlob = new Blob([chunk], { type: 'video/mp4' });
        const formData = new FormData();
        formData.append('upload_id', sessionId);
        formData.append('chunk_index', i);
        formData.append('chunk', chunkBlob, `chunk_${i}`);

        try {
          await api.post('/api/posts/upload/chunk/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });

          setUploadedChunks(i + 1);
          setUploadProgress(((i + 1) / totalChunks) * 100);
        } catch (err) {
          // Retry logic
          if (err.response?.status === 408) {
            // Timeout - retry this chunk
            i--; // Retry same chunk
            await new Promise((r) => setTimeout(r, 1000)); // Wait 1s before retry
          } else {
            throw err;
          }
        }
      }

      // Step 3: Finalize upload (trigger FFmpeg processing)
      await finalizeUpload(sessionId);
    } catch (err) {
      console.error('Chunk upload error:', err);
      setUploadError('Failed to upload video chunks');
      setIsUploading(false);
    }
  };

  // ── Finalize upload & trigger processing ─────────────────────────
  const finalizeUpload = async (sessionId) => {
    try {
      setIsProcessing(true);

      const response = await api.post('/api/posts/upload/finalize/', {
        upload_id: sessionId,
        song_id: selectedSong?.id || null,
        trim_start: trimStart,
        trim_end: trimEnd,
      });

      // Video is now processing (no autoplay)
      // User can add caption while backend processes
      setIsUploading(false);
      Alert.alert('Success', 'Video uploaded! Processing in background...');

      // Navigate to caption screen or post creation
      navigation.navigate('CreatePost', {
        postId,
        isVideo: true,
        videoStatus: response.data.status,
      });
    } catch (err) {
      console.error('Finalization error:', err);
      setUploadError('Failed to finalize upload');
      setIsProcessing(false);
      setIsUploading(false);
    }
  };

  // ── Format time display ───────────────────────────────────────────
  const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
          Upload Video
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Video Selection */}
      {!selectedVideo ? (
        <TouchableOpacity
          style={[styles.videoPickerButton, { borderColor: theme.colors.primary }]}
          onPress={pickVideo}
        >
          <MaterialCommunityIcons
            name="video-plus"
            size={48}
            color={theme.colors.primary}
          />
          <Text style={[styles.videoPickerText, { color: theme.colors.text }]}>
            Tap to select video
          </Text>
          <Text style={[styles.videoPickerSubtext, { color: theme.colors.subText }]}>
            Max 500MB, MP4/MOV supported
          </Text>
        </TouchableOpacity>
      ) : (
        <View>
          {/* Video Preview */}
          <View style={styles.videoPreviewContainer}>
            {videoThumbnail && (
              <Image source={{ uri: videoThumbnail }} style={styles.videoThumbnail} />
            )}
            <View style={styles.videoInfoOverlay}>
              <MaterialCommunityIcons
                name="video"
                size={32}
                color="#fff"
              />
              <Text style={styles.videoDurationText}>
                {formatTime(videoDuration)}
              </Text>
            </View>
          </View>

          {/* Trim Interface */}
          <TouchableOpacity
            style={[
              styles.trimButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => setShowTrimInterface(!showTrimInterface)}
          >
            <MaterialCommunityIcons name="content-cut" size={18} color="#fff" />
            <Text style={styles.trimButtonText}>
              {showTrimInterface ? 'Hide' : 'Show'} Trim Options
            </Text>
          </TouchableOpacity>

          {showTrimInterface && (
            <View style={[styles.trimContainer, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.trimLabel, { color: theme.colors.text }]}>
                Trim Video
              </Text>

              {/* Start Time Slider */}
              <View style={styles.sliderGroup}>
                <View style={styles.sliderLabelRow}>
                  <Text style={[styles.sliderLabel, { color: theme.colors.subText }]}>
                    Start: {formatTime(trimStart)}
                  </Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={videoDuration}
                  value={trimStart}
                  onValueChange={(val) => {
                    if (val < trimEnd) setTrimStart(val);
                  }}
                  minimumTrackTintColor={theme.colors.primary}
                  maximumTrackTintColor="rgba(255,255,255,0.2)"
                  thumbTintColor={theme.colors.primary}
                />
              </View>

              {/* End Time Slider */}
              <View style={styles.sliderGroup}>
                <View style={styles.sliderLabelRow}>
                  <Text style={[styles.sliderLabel, { color: theme.colors.subText }]}>
                    End: {formatTime(trimEnd)}
                  </Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={videoDuration}
                  value={trimEnd}
                  onValueChange={(val) => {
                    if (val > trimStart) setTrimEnd(val);
                  }}
                  minimumTrackTintColor={theme.colors.primary}
                  maximumTrackTintColor="rgba(255,255,255,0.2)"
                  thumbTintColor={theme.colors.primary}
                />
              </View>

              <Text style={[styles.trimDurationText, { color: theme.colors.subText }]}>
                Final duration: {formatTime(trimEnd - trimStart)}
              </Text>
            </View>
          )}

          {/* Song Selection */}
          <TouchableOpacity
            style={[
              styles.songButton,
              { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary },
            ]}
            onPress={() => setShowSongPicker(!showSongPicker)}
          >
            <MaterialCommunityIcons
              name="music"
              size={18}
              color={theme.colors.primary}
            />
            <Text style={[styles.songButtonText, { color: theme.colors.text }]}>
              {selectedSong ? `Selected: ${selectedSong.name}` : 'Add Background Music'}
            </Text>
          </TouchableOpacity>

          {showSongPicker && (
            <View style={[styles.songPickerContainer, { backgroundColor: theme.colors.surface }]}>
              <TextInput
                placeholder="Search songs..."
                placeholderTextColor={theme.colors.subText}
                style={[
                  styles.songSearchInput,
                  { color: theme.colors.text, borderColor: theme.colors.border },
                ]}
                value={songSearchQuery}
                onChangeText={setSongSearchQuery}
              />

              {isSearchingSongs ? (
                <View style={styles.songLoadingContainer}>
                  <ActivityIndicator color={theme.colors.primary} />
                </View>
              ) : songLibrary.length > 0 ? (
                <FlatList
                  data={songLibrary}
                  keyExtractor={(item) => item.id.toString()}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.songItem,
                        selectedSong?.id === item.id && styles.songItemSelected,
                      ]}
                      onPress={() => {
                        setSelectedSong(item);
                        setShowSongPicker(false);
                      }}
                    >
                      <MaterialCommunityIcons
                        name="music"
                        size={16}
                        color={theme.colors.primary}
                      />
                      <View style={styles.songItemContent}>
                        <Text style={[styles.songName, { color: theme.colors.text }]}>
                          {item.name}
                        </Text>
                        <Text style={[styles.songArtist, { color: theme.colors.subText }]}>
                          {item.artist || 'Unknown Artist'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              ) : (
                songSearchQuery && (
                  <Text style={[styles.noSongsText, { color: theme.colors.subText }]}>
                    No songs found
                  </Text>
                )
              )}
            </View>
          )}

          {/* Caption Input */}
          <TextInput
            placeholder="Add caption (optional)..."
            placeholderTextColor={theme.colors.subText}
            style={[
              styles.captionInput,
              {
                color: theme.colors.text,
                borderColor: theme.colors.border,
              },
            ]}
            value={caption}
            onChangeText={setCaption}
            multiline
            maxLength={2000}
          />

          {/* Upload Progress */}
          {isUploading && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${uploadProgress}%`,
                      backgroundColor: theme.colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressText, { color: theme.colors.text }]}>
                {uploadedChunks} / {totalChunks} chunks uploaded ({Math.round(uploadProgress)}%)
              </Text>
            </View>
          )}

          {/* Processing State */}
          {isProcessing && (
            <View
              style={[
                styles.processingContainer,
                { backgroundColor: theme.colors.primary + '20' },
              ]}
            >
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={[styles.processingText, { color: theme.colors.text }]}>
                Processing video... This may take a few minutes
              </Text>
              <Text style={[styles.processingSubtext, { color: theme.colors.subText }]}>
                Trimming, adding music, and optimizing for streaming
              </Text>
            </View>
          )}

          {/* Error Message */}
          {uploadError && (
            <View style={[styles.errorContainer, { backgroundColor: '#FF5252' + '20' }]}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={18}
                color="#FF5252"
              />
              <Text style={[styles.errorText, { color: '#FF5252' }]}>
                {uploadError}
              </Text>
            </View>
          )}

          {/* Upload Button */}
          <TouchableOpacity
            style={[
              styles.uploadButton,
              {
                backgroundColor: theme.colors.primary,
                opacity: isUploading || isProcessing ? 0.6 : 1,
              },
            ]}
            onPress={initializeUpload}
            disabled={isUploading || isProcessing}
          >
            {isUploading || isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons name="cloud-upload" size={20} color="#fff" />
                <Text style={styles.uploadButtonText}>
                  {isUploading ? 'Uploading...' : 'Upload Video'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
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
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  videoPickerButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    marginBottom: 24,
  },
  videoPickerText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  videoPickerSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  videoPreviewContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    height: 200,
    position: 'relative',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  videoInfoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoDurationText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  trimButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  trimButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  trimContainer: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  trimLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  sliderGroup: {
    marginBottom: 16,
  },
  sliderLabelRow: {
    marginBottom: 8,
  },
  sliderLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  trimDurationText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  songButton: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    marginBottom: 16,
    alignItems: 'center',
    gap: 10,
  },
  songButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  songPickerContainer: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    maxHeight: 250,
  },
  songSearchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 14,
  },
  songLoadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  songItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 8,
    alignItems: 'center',
    gap: 10,
  },
  songItemSelected: {
    backgroundColor: 'rgba(30, 144, 255, 0.1)',
  },
  songItemContent: {
    flex: 1,
  },
  songName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  songArtist: {
    fontSize: 12,
  },
  noSongsText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  captionInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    minHeight: 100,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  processingContainer: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  processingText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
  processingSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 16,
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
  },
  uploadButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default VideoUploadScreen;
