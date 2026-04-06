import React, { useMemo, useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import Video from 'react-native-video';
import Ionicons from 'react-native-vector-icons/Ionicons';
import shortMusicLibrary from '../data/shortMusicLibrary';
import { ThemeContext } from '../store/themeStore';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const formatSeconds = seconds => `${seconds}s`;

const Stepper = ({
  label,
  value,
  onDecrease,
  onIncrease,
  formatter,
  theme,
}) => (
  <View style={[styles.controlCard, { backgroundColor: theme.colors.card }]}>
    <Text style={[styles.controlLabel, { color: theme.colors.text }]}>
      {label}
    </Text>
    <View style={styles.stepperRow}>
      <TouchableOpacity
        style={[styles.stepperBtn, { backgroundColor: theme.colors.primary }]}
        onPress={onDecrease}
      >
        <Ionicons name="remove" size={18} color={theme.colors.buttonText} />
      </TouchableOpacity>
      <Text style={[styles.stepperValue, { color: theme.colors.text }]}>
        {formatter(value)}
      </Text>
      <TouchableOpacity
        style={[styles.stepperBtn, { backgroundColor: theme.colors.primary }]}
        onPress={onIncrease}
      >
        <Ionicons name="add" size={18} color={theme.colors.buttonText} />
      </TouchableOpacity>
    </View>
  </View>
);

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
      },
    },
  };
  const videoAsset = route.params?.videoAsset || null;
  const initialEditConfig = route.params?.initialEditConfig || null;

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

  const selectedTrack = useMemo(
    () => shortMusicLibrary.find(track => track.id === selectedTrackId) || null,
    [selectedTrackId],
  );

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
    if (!videoAsset?.uri) {
      Alert.alert('Missing video', 'Please choose a short video first.');
      return;
    }

    goBackToCreatePost({
      editedShort: {
        ...videoAsset,
        editConfig: {
          musicTrackId: selectedTrack?.id || null,
          musicTrackTitle: selectedTrack?.title || null,
          musicVolume,
          originalVolume,
          musicOffset,
        },
      },
      preserveOnBlur: false,
    });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <View
        style={[styles.previewCard, { backgroundColor: theme.colors.surface }]}
      >
        {videoAsset?.uri ? (
          <Video
            source={{ uri: videoAsset.uri }}
            style={styles.previewVideo}
            resizeMode="cover"
            repeat
            muted={false}
            paused={false}
          />
        ) : (
          <View style={[styles.previewVideo, styles.emptyPreview]}>
            <Ionicons
              name="videocam-outline"
              size={36}
              color={theme.colors.secondary}
            />
            <Text
              style={[styles.emptyPreviewText, { color: theme.colors.subText }]}
            >
              No video selected
            </Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
          Choose Sound
        </Text>
        <Text style={[styles.sectionHelp, { color: theme.colors.subText }]}>
          V1 structure: we save the edit configuration now, then wire real audio
          rendering into this flow once the media export dependency is added.
        </Text>
        {shortMusicLibrary.map(track => {
          const isSelected = track.id === selectedTrackId;
          return (
            <TouchableOpacity
              key={track.id}
              style={[
                styles.trackCard,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                },
                isSelected && [
                  styles.trackCardSelected,
                  {
                    borderColor: theme.colors.primary,
                    backgroundColor: theme.colors.surface,
                  },
                ],
              ]}
              onPress={() => setSelectedTrackId(track.id)}
            >
              <View>
                <Text
                  style={[
                    styles.trackTitle,
                    { color: theme.colors.text },
                    isSelected && styles.trackTitleOn,
                  ]}
                >
                  {track.title}
                </Text>
                <Text
                  style={[styles.trackMeta, { color: theme.colors.subText }]}
                >
                  {track.artist} • {formatSeconds(track.duration)}
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
        })}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
          Mix Controls
        </Text>
        <Stepper
          label="Original sound"
          value={originalVolume}
          onDecrease={() =>
            setOriginalVolume(value =>
              clamp(Number((value - 0.1).toFixed(1)), 0, 1),
            )
          }
          onIncrease={() =>
            setOriginalVolume(value =>
              clamp(Number((value + 0.1).toFixed(1)), 0, 1),
            )
          }
          formatter={value => `${Math.round(value * 100)}%`}
          theme={theme}
        />
        <Stepper
          label="Added music"
          value={musicVolume}
          onDecrease={() =>
            setMusicVolume(value =>
              clamp(Number((value - 0.1).toFixed(1)), 0, 1),
            )
          }
          onIncrease={() =>
            setMusicVolume(value =>
              clamp(Number((value + 0.1).toFixed(1)), 0, 1),
            )
          }
          formatter={value => `${Math.round(value * 100)}%`}
          theme={theme}
        />
        <Stepper
          label="Music starts at"
          value={musicOffset}
          onDecrease={() => setMusicOffset(value => clamp(value - 1, 0, 30))}
          onIncrease={() => setMusicOffset(value => clamp(value + 1, 0, 30))}
          formatter={formatSeconds}
          theme={theme}
        />
      </View>

      <View
        style={[styles.summaryCard, { backgroundColor: theme.colors.card }]}
      >
        <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>
          Current Setup
        </Text>
        <Text style={[styles.summaryText, { color: theme.colors.subText }]}>
          Sound: {selectedTrack?.title || 'None'}
        </Text>
        <Text style={[styles.summaryText, { color: theme.colors.subText }]}>
          Original audio: {Math.round(originalVolume * 100)}%
        </Text>
        <Text style={[styles.summaryText, { color: theme.colors.subText }]}>
          Music audio: {Math.round(musicVolume * 100)}%
        </Text>
        <Text style={[styles.summaryText, { color: theme.colors.subText }]}>
          Music offset: {formatSeconds(musicOffset)}
        </Text>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.secondaryBtn, { borderColor: theme.colors.border }]}
          onPress={handleCancel}
        >
          <Text
            style={[styles.secondaryBtnText, { color: theme.colors.subText }]}
          >
            Cancel
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: theme.colors.primary }]}
          onPress={handleApply}
        >
          <Text
            style={[styles.primaryBtnText, { color: theme.colors.buttonText }]}
          >
            Apply Sound
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1F2D' },
  contentContainer: { padding: 20, paddingBottom: 40 },
  previewCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
  },
  previewVideo: {
    width: '100%',
    height: 360,
  },
  emptyPreview: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  emptyPreviewText: { fontSize: 15 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  sectionHelp: {
    lineHeight: 20,
    marginBottom: 14,
  },
  trackCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trackCardSelected: {
    borderWidth: 2,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  trackTitleOn: {},
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
    borderColor: '#334155',
    paddingVertical: 15,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#CBD5E1',
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
