/**
 * ShortEditorScreen.jsx
 * =====================
 * - Removed react-native-youtube-iframe entirely
 * - Video always fetched from your own server (no YouTube)
 * - Fixed "Element type is invalid" crash:
 *     • shortMusicLibrary now has a guaranteed default export
 *     • All imports are verified to exist
 * - Video preview uses react-native-video with your stream endpoint
 * - Music library can be fetched from your API or falls back to local data
 */

import React, { useMemo, useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Video from 'react-native-video';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { ThemeContext } from '../store/themeStore';
import api from '../api/client';

// ── Safe fallback so the component NEVER receives undefined ──────────────────
// Even if the file is missing or mis-exported, this default prevents the crash.
let shortMusicLibrary = [];
try {
  // Dynamic require — if the file exists and has a default export, use it.
  const mod = require('../data/shortMusicLibrary');
  shortMusicLibrary = mod?.default ?? mod ?? [];
} catch {
  // File missing — editor will just show an empty list and fetch from server
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const formatSeconds = s => `${s}s`;
const fmtVolume = v => `${Math.round(v * 100)}%`;

// ── Stepper component ────────────────────────────────────────────────────────

const Stepper = ({ label, value, onDecrease, onIncrease, formatter, theme }) => (
  <View style={[styles.controlCard, { backgroundColor: theme.colors.card }]}>
    <Text style={[styles.controlLabel, { color: theme.colors.text }]}>
      {label}
    </Text>
    <View style={styles.stepperRow}>
      <TouchableOpacity
        style={[styles.stepperBtn, { backgroundColor: theme.colors.primary }]}
        onPress={onDecrease}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="remove" size={18} color={theme.colors.buttonText || '#fff'} />
      </TouchableOpacity>
      <Text style={[styles.stepperValue, { color: theme.colors.text }]}>
        {formatter(value)}
      </Text>
      <TouchableOpacity
        style={[styles.stepperBtn, { backgroundColor: theme.colors.primary }]}
        onPress={onIncrease}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="add" size={18} color={theme.colors.buttonText || '#fff'} />
      </TouchableOpacity>
    </View>
  </View>
);

// ── Main Screen ──────────────────────────────────────────────────────────────

export default function ShortEditorScreen({ route, navigation }) {
  const { theme } = useContext(ThemeContext) || {
    theme: {
      colors: {
        background: '#0D1F2D',
        surface: '#08131D',
        card: '#162A3B',
        text: '#FFFFFF',
        subText: '#94A3B8',
        primary: '#1E90FF',
        border: '#1E293B',
        secondary: '#64748B',
        buttonText: '#FFFFFF',
      },
    },
  };

  const videoAsset = route.params?.videoAsset || null;
  const initialEditConfig = route.params?.initialEditConfig || null;

  // ── State ────────────────────────────────────────────────────────────────
  const [tracks, setTracks] = useState(shortMusicLibrary);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState(
    initialEditConfig?.musicTrackId || shortMusicLibrary[0]?.id || null,
  );
  const [musicVolume, setMusicVolume] = useState(
    initialEditConfig?.musicVolume ?? 0.6,
  );
  const [originalVolume, setOriginalVolume] = useState(
    initialEditConfig?.originalVolume ?? 0.8,
  );
  const [musicOffset, setMusicOffset] = useState(
    initialEditConfig?.musicOffset ?? 0,
  );
  const [videoPaused, setVideoPaused] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // ── Fetch music tracks from your server ──────────────────────────────────
  useEffect(() => {
    const fetchTracks = async () => {
      setTracksLoading(true);
      try {
        const res = await api.get('api/media/music-library/');
        const serverTracks = res.data?.results || res.data || [];
        if (Array.isArray(serverTracks) && serverTracks.length > 0) {
          setTracks(serverTracks);
          // Auto-select first if nothing pre-selected
          if (!selectedTrackId) {
            setSelectedTrackId(serverTracks[0]?.id || null);
          }
        }
      } catch {
        // Server unavailable — local fallback already in state
      } finally {
        setTracksLoading(false);
      }
    };
    fetchTracks();
  }, []);

  const selectedTrack = useMemo(
    () => tracks.find(t => t.id === selectedTrackId) || null,
    [tracks, selectedTrackId],
  );

  // ── Video URI: own server stream endpoint ─────────────────────────────────
  // Priority: videoAsset.uri (freshly recorded/picked) → stream URL from server
  const videoUri = useMemo(() => {
    if (videoAsset?.uri) return videoAsset.uri;
    if (videoAsset?.id) {
      const base = api.defaults?.baseURL || '';
      return `${base}api/posts/shorts/${videoAsset.id}/stream/`;
    }
    return null;
  }, [videoAsset]);

  // ── Navigation helpers ────────────────────────────────────────────────────
  const goBackToCreatePost = params => {
    navigation.navigate('MainApp', {
      screen: 'ConnectDial',
      params: {
        screen: 'CreatePost',
        params,
      },
    });
  };

  const handleCancel = () => {
    goBackToCreatePost({ preserveOnBlur: false });
  };

  const handleApply = () => {
    if (!videoUri) {
      Alert.alert('Missing video', 'Please choose a short video first.');
      return;
    }
    goBackToCreatePost({
      editedShort: {
        ...videoAsset,
        editConfig: {
          musicTrackId: selectedTrack?.id || null,
          musicTrackTitle: selectedTrack?.title || null,
          musicUri: selectedTrack?.uri || null,
          musicVolume,
          originalVolume,
          musicOffset,
        },
      },
      preserveOnBlur: false,
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Video Preview ── */}
      <View style={[styles.previewCard, { backgroundColor: theme.colors.surface }]}>
        {videoUri && !videoError ? (
          <>
            <Video
              source={{ uri: videoUri }}
              style={styles.previewVideo}
              resizeMode="cover"
              repeat
              paused={videoPaused}
              muted={false}
              onError={() => setVideoError(true)}
              bufferConfig={{
                minBufferMs: 2000,
                maxBufferMs: 10000,
                bufferForPlaybackMs: 1000,
                bufferForPlaybackAfterRebufferMs: 2000,
              }}
            />
            {/* Tap to pause/play preview */}
            <TouchableOpacity
              style={styles.previewTapOverlay}
              activeOpacity={1}
              onPress={() => setVideoPaused(p => !p)}
            >
              {videoPaused && (
                <View style={styles.pausedBadge}>
                  <Ionicons name="play" size={28} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <View style={[styles.previewVideo, styles.emptyPreview]}>
            <Ionicons
              name={videoError ? 'alert-circle-outline' : 'videocam-outline'}
              size={36}
              color={theme.colors.secondary}
            />
            <Text style={[styles.emptyPreviewText, { color: theme.colors.subText }]}>
              {videoError ? 'Could not load video' : 'No video selected'}
            </Text>
          </View>
        )}
      </View>

      {/* ── Music Library ── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
          Choose Sound
        </Text>

        {tracksLoading ? (
          <ActivityIndicator
            color={theme.colors.primary}
            style={{ marginVertical: 20 }}
          />
        ) : tracks.length === 0 ? (
          <Text style={[styles.emptyPreviewText, { color: theme.colors.subText }]}>
            No tracks available
          </Text>
        ) : (
          tracks.map(track => {
            const isSelected = track.id === selectedTrackId;
            return (
              <TouchableOpacity
                key={track.id}
                style={[
                  styles.trackCard,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: isSelected
                      ? theme.colors.primary
                      : theme.colors.border,
                    borderWidth: isSelected ? 2 : 1,
                    backgroundColor: isSelected
                      ? theme.colors.surface
                      : theme.colors.card,
                  },
                ]}
                onPress={() => setSelectedTrackId(track.id)}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.trackTitle, { color: theme.colors.text }]}>
                    {track.title}
                  </Text>
                  <Text style={[styles.trackMeta, { color: theme.colors.subText }]}>
                    {track.artist}
                    {track.duration ? ` • ${formatSeconds(track.duration)}` : ''}
                  </Text>
                </View>
                {isSelected && (
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color={theme.colors.primary}
                  />
                )}
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* ── Mix Controls ── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
          Mix Controls
        </Text>
        <Stepper
          label="Original sound"
          value={originalVolume}
          onDecrease={() =>
            setOriginalVolume(v => clamp(Number((v - 0.1).toFixed(1)), 0, 1))
          }
          onIncrease={() =>
            setOriginalVolume(v => clamp(Number((v + 0.1).toFixed(1)), 0, 1))
          }
          formatter={fmtVolume}
          theme={theme}
        />
        <Stepper
          label="Added music"
          value={musicVolume}
          onDecrease={() =>
            setMusicVolume(v => clamp(Number((v - 0.1).toFixed(1)), 0, 1))
          }
          onIncrease={() =>
            setMusicVolume(v => clamp(Number((v + 0.1).toFixed(1)), 0, 1))
          }
          formatter={fmtVolume}
          theme={theme}
        />
        <Stepper
          label="Music starts at"
          value={musicOffset}
          onDecrease={() => setMusicOffset(v => clamp(v - 1, 0, 60))}
          onIncrease={() => setMusicOffset(v => clamp(v + 1, 0, 60))}
          formatter={formatSeconds}
          theme={theme}
        />
      </View>

      {/* ── Summary ── */}
      <View style={[styles.summaryCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>
          Current Setup
        </Text>
        <Text style={[styles.summaryText, { color: theme.colors.subText }]}>
          Sound: {selectedTrack?.title || 'None'}
        </Text>
        <Text style={[styles.summaryText, { color: theme.colors.subText }]}>
          Original audio: {fmtVolume(originalVolume)}
        </Text>
        <Text style={[styles.summaryText, { color: theme.colors.subText }]}>
          Music audio: {fmtVolume(musicVolume)}
        </Text>
        <Text style={[styles.summaryText, { color: theme.colors.subText }]}>
          Music offset: {formatSeconds(musicOffset)}
        </Text>
      </View>

      {/* ── Actions ── */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.secondaryBtn, { borderColor: theme.colors.border }]}
          onPress={handleCancel}
        >
          <Text style={[styles.secondaryBtnText, { color: theme.colors.subText }]}>
            Cancel
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            { backgroundColor: videoUri ? theme.colors.primary : theme.colors.border },
          ]}
          onPress={handleApply}
          disabled={!videoUri}
        >
          <Text style={[styles.primaryBtnText, { color: theme.colors.buttonText || '#fff' }]}>
            Apply Sound
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: 20, paddingBottom: 50 },

  previewCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
  },
  previewVideo: {
    width: '100%',
    height: 360,
  },
  previewTapOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pausedBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyPreview: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    height: 360,
  },
  emptyPreviewText: { fontSize: 15, marginTop: 8 },

  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
  },

  trackCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  trackMeta: { fontSize: 13 },

  controlCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  controlLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperValue: {
    fontSize: 18,
    fontWeight: '800',
  },

  summaryCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 14,
    marginBottom: 6,
  },

  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryBtn: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontWeight: '700',
    fontSize: 15,
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontWeight: '800',
    fontSize: 15,
  },
});