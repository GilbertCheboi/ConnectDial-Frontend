import React, {
  useState,
  useEffect,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api, { BASE_URL } from '../api/client';
import { useIsFocused } from '@react-navigation/native';
import { AuthContext } from '../store/authStore';
import { ThemeContext } from '../store/themeStore';
import RNCMentions from 'react-native-controlled-mentions';
const MentionInput = RNCMentions?.MentionInput || RNCMentions?.default || null;

const MAX_IMAGES = 5;

const LEAGUE_MAP = {
  1: { name: 'Premier League', logo: require('../screens/assets/epl.png') },
  2: { name: 'NBA', logo: require('../screens/assets/NBA.jpeg') },
  3: { name: 'NFL', logo: require('../screens/assets/NFL.png') },
  4: { name: 'F1', logo: require('../screens/assets/F1.png') },
  5: {
    name: 'Champions League',
    logo: require('../screens/assets/Champions_League.png'),
  },
  6: { name: 'MLB', logo: require('../screens/assets/MLB.png') },
  7: { name: 'NHL', logo: require('../screens/assets/NHL-logo.jpg') },
  8: { name: 'La Liga', logo: require('../screens/assets/laliga.png') },
  9: { name: 'Serie A', logo: require('../screens/assets/Serie_A.png') },
  10: { name: 'Bundesliga', logo: require('../screens/assets/bundesliga.jpg') },
  11: { name: 'Ligue 1', logo: require('../screens/assets/Ligue1_logo.png') },
  12: { name: 'Afcon', logo: require('../screens/assets/Afcon.png') },
};

const DEFAULT_THEME = {
  colors: {
    background: '#0A1624',
    surface: '#0D1F2D',
    card: '#112634',
    text: '#F8FAFC',
    subText: '#94A3B8',
    border: '#1E293B',
    primary: '#1E90FF',
    secondary: '#64748B',
    icon: '#1E90FF',
    button: '#1E90FF',
    buttonText: '#FFFFFF',
    inputBackground: '#112634',
    overlay: 'rgba(255,255,255,0.05)',
    drawerBackground: '#0D1F2D',
    drawerText: '#F8FAFC',
    drawerIcon: '#1E90FF',
    tabBar: '#0D1F2D',
    tabBarInactive: '#64748B',
    header: '#0D1F2D',
    headerTint: '#F8FAFC',
    notificationBadge: '#FF4B4B',
    sheetBackground: '#0D1F2D',
  },
};

// ─── Mention suggestion list ───────────────────────────────────────────────
const SuggestionList = ({
  keyword,
  onSuggestionPress,
  fetchUserSuggestions,
  suggestions,
  mentionLoading,
  theme,
  themedStyles,
}) => {
  useEffect(() => {
    fetchUserSuggestions(keyword);
  }, [keyword]);
  if (keyword == null || suggestions.length === 0) return null;
  return (
    <View style={themedStyles.suggestionContainer}>
      {mentionLoading && (
        <ActivityIndicator size="small" color={theme.colors.primary} />
      )}
      <FlatList
        data={suggestions}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => onSuggestionPress(item)}
            style={themedStyles.suggestionItem}
          >
            <Text style={themedStyles.suggestionText}>@{item.display}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

// ─── Video thumbnail (static frame — no autoplay) ──────────────────────────
const VideoThumb = ({ uri, style }) => (
  <View
    style={[
      style,
      {
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
      },
    ]}
  >
    {/* Show the first frame as a static image using Image — no Video component = no autoplay */}
    <Image
      source={{ uri }}
      style={[
        StyleSheet.absoluteFill,
        { borderRadius: style?.borderRadius || 10 },
      ]}
      resizeMode="cover"
    />
    {/* Play icon overlay just indicates it's a video */}
    <View style={videoThumbStyles.overlay}>
      <Ionicons name="play-circle" size={36} color="rgba(255,255,255,0.9)" />
    </View>
  </View>
);
const videoThumbStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
  },
});

// ─── Main Screen ───────────────────────────────────────────────────────────
export default function CreatePostScreen({ route, navigation }) {
  const isFocused = useIsFocused();
  const { user } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext) || { theme: DEFAULT_THEME };

  const {
    editMode = false,
    postData = null,
    leagueId = null,
    leagueName = '',
    onEditSuccess,
    postType: initialType = null,
    quoteMode = false,
    parentPost = null,
    editedShort = null,
    preserveOnBlur = false,
  } = route.params || {};

  const [content, setContent] = useState('');
  const [selectedLeague, setSelectedLeague] = useState(leagueId);
  const [selectedName, setSelectedName] = useState(leagueName);
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [postType, setPostType] = useState(initialType);
  const [suggestions, setSuggestions] = useState([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ── Seed state from params ──────────────────────────────────────────────
  useEffect(() => {
    if (quoteMode && parentPost) {
      setPostType('standard');
      setSelectedLeague(parentPost.league);
      setSelectedName(parentPost.league_name || 'Original League');
    }
  }, [quoteMode, parentPost]);

  useEffect(() => {
    const fetchLatestProfile = async () => {
      try {
        const res = await api.get('auth/update/');
        const data = res.data.data || res.data;
        setProfile(data);
      } catch (err) {
        console.error('Profile fetch error:', err);
      }
    };
    if (isFocused) fetchLatestProfile();
  }, [isFocused]);

  const userLeagues = useMemo(() => {
    const src = profile || user;
    if (!src?.fan_preferences || !Array.isArray(src.fan_preferences)) return [];
    const seen = new Set();
    const out = [];
    src.fan_preferences.forEach(pref => {
      const id = pref.league;
      if (id && !seen.has(id)) {
        seen.add(id);
        out.push({
          id,
          ...(LEAGUE_MAP[id] || { name: `League ${id}`, logo: null }),
        });
      }
    });
    return out.sort((a, b) => a.id - b.id);
  }, [profile, user]);

  const resetForm = useCallback(() => {
    setContent('');
    setMediaList([]);
    setLoading(false);
    setUploadProgress(0);
    setSelectedLeague(null);
    setSelectedName('');
    setPostType(null);
    navigation.setParams({
      quoteMode: false,
      parentPost: null,
      editMode: false,
      postData: null,
      initialType: null,
      leagueId: null,
      leagueName: null,
      editedShort: null,
      preserveOnBlur: false,
    });
  }, [navigation]);

  useEffect(() => {
    if (isFocused && editMode && postData) {
      setContent(postData.content || '');
      setSelectedLeague(postData.league || leagueId);
      setSelectedName(postData.league_name || leagueName);
      setPostType(postData.is_short ? 'short' : 'standard');
      if (postData.media_files && Array.isArray(postData.media_files)) {
        setMediaList(
          postData.media_files.map(uri => ({ uri, isExisting: true })),
        );
      } else if (postData.media_file) {
        setMediaList([{ uri: postData.media_file, isExisting: true }]);
      }
      navigation.setOptions({ title: 'Edit Post' });
    }
  }, [isFocused, editMode, postData]);

  useEffect(() => {
    if (isFocused && quoteMode && parentPost) {
      if (parentPost.league && !selectedLeague) {
        setSelectedLeague(parentPost.league);
        setSelectedName(parentPost.supporting_info?.league_name || '');
      }
      navigation.setOptions({ title: 'Quote Post' });
    } else if (isFocused && !editMode) {
      navigation.setOptions({ title: 'Create Post' });
    }
  }, [isFocused, quoteMode, parentPost]);

  useEffect(() => {
    if (!isFocused && !preserveOnBlur) resetForm();
  }, [isFocused, preserveOnBlur]);

  useEffect(() => {
    if (editedShort) {
      setPostType('short');
      setMediaList([editedShort]);
      setTimeout(() => {
        navigation.setParams({ editedShort: null, preserveOnBlur: true });
      }, 100);
    }
  }, [editedShort]);

  // ── Open short editor (preserves blur) ────────────────────────────────
  const openShortEditor = useCallback(
    asset => {
      navigation.setParams({ preserveOnBlur: true });
      navigation.navigate('ShortEditor', {
        videoAsset: asset,
        initialEditConfig: asset.editConfig || null,
      });
    },
    [navigation],
  );

  // ── Pick media ─────────────────────────────────────────────────────────
  const pickMedia = async () => {
    if (postType === 'short') {
      // Shorts: single video — open picker then go to editor (no autoplay here)
      const result = await launchImageLibrary({
        mediaType: 'video',
        selectionLimit: 1,
        videoQuality: 'medium',
        formatAsMp4: true,
      });
      if (result.didCancel || !result.assets?.length) return;
      const [asset] = result.assets;
      if (asset.fileSize && asset.fileSize > 50 * 1024 * 1024) {
        Alert.alert('Video too large', 'Please choose a video under 50MB.');
        return;
      }
      // Show in preview first (static thumb), user taps Edit to go to editor
      setMediaList([asset]);
      return;
    }

    // Standard post: images + videos, up to MAX_IMAGES
    const remaining = MAX_IMAGES - mediaList.filter(m => !m.isExisting).length;
    if (remaining <= 0) {
      Alert.alert('Limit reached', `You can add up to ${MAX_IMAGES} images.`);
      return;
    }
    const result = await launchImageLibrary({
      mediaType: 'mixed',
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (result.didCancel || !result.assets?.length) return;
    setMediaList(prev => [...prev, ...result.assets].slice(0, MAX_IMAGES));
  };

  const removeMedia = useCallback(index => {
    setMediaList(prev => prev.filter((_, i) => i !== index));
  }, []);

  // ── Mention search ─────────────────────────────────────────────────────
  const fetchUserSuggestions = useCallback(async keyword => {
    if (!keyword) {
      setSuggestions([]);
      return;
    }
    try {
      setMentionLoading(true);
      const res = await api.get(`auth/users/?search=${keyword}`);
      setSuggestions(
        res.data.map(u => ({ id: u.id.toString(), display: u.username })),
      );
    } catch (err) {
      console.error('Mention search error:', err);
    } finally {
      setMentionLoading(false);
    }
  }, []);

  // ── Submit post ────────────────────────────────────────────────────────
  const handlePost = async () => {
    const hasContent = content.trim().length > 0;
    const hasMedia = mediaList.length > 0;

    if (!hasContent && !hasMedia && !quoteMode) {
      Alert.alert('Empty Post', 'Please add some text or media.');
      return;
    }
    if (postType === 'short' && !hasMedia) {
      Alert.alert('Required', 'Please select a video for your Short.');
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('content', content.trim());
    formData.append('is_short', String(postType === 'short'));

    if (quoteMode && parentPost) {
      formData.append('parent_post', parentPost.id.toString());
      formData.append(
        'league',
        (selectedLeague || parentPost.league || '').toString(),
      );
    } else {
      formData.append(
        'league',
        selectedLeague ? selectedLeague.toString() : '',
      );
    }

    // ✅ KEY FIX: append each file separately under the same key 'media_files'
    // Django/DRF reads request.FILES.getlist('media_files') — repeated keys, NOT array notation
    const newMedia = mediaList.filter(m => !m.isExisting);
    newMedia.forEach((media, index) => {
      const isVideo =
        media.type?.startsWith('video') || media.uri?.endsWith('.mp4');
      formData.append('media_files', {
        uri: media.uri, // ✅ keep file:// — required by React Native on Android
        type: media.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
        name:
          media.fileName ||
          `upload_${Date.now()}_${index}.${isVideo ? 'mp4' : 'jpg'}`,
      });
    });

    try {
      const config = {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: e => {
          const total = e.total || e.loaded || 0;
          if (!total) return;
          setUploadProgress(Math.min(Math.round((e.loaded * 100) / total), 95));
        },
      };

      let response;
      if (editMode) {
        response = await api.patch(
          `api/posts/${postData.id}/`,
          formData,
          config,
        );
        if (onEditSuccess) onEditSuccess(response.data);
      } else {
        response = await api.post('api/posts/', formData, config);
      }

      setUploadProgress(100);
      setLoading(false);
      Alert.alert('Success', editMode ? 'Updated!' : 'Shared!', [
        {
          text: 'OK',
          onPress: () => {
            if (route.params?.refreshFeed) route.params.refreshFeed();
            navigation.goBack();
          },
        },
      ]);
    } catch (err) {
      setLoading(false);
      setUploadProgress(0);
      console.log(
        '❌ BACKEND ERROR:',
        JSON.stringify(err.response?.data, null, 2),
      );
      console.log('❌ STATUS:', err.response?.status);
      Alert.alert('Error', 'Could not save post. Check console for details.');
    }
  };

  const themedStyles = styles(theme);

  // ── POST TYPE SELECTION ────────────────────────────────────────────────
  if (!postType && !editMode) {
    return (
      <View
        style={[
          themedStyles.container,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <Text style={[themedStyles.headerText, { color: theme.colors.text }]}>
          What are you sharing?
        </Text>
        <TouchableOpacity
          style={[themedStyles.typeItem, { borderColor: theme.colors.primary }]}
          onPress={() => setPostType('standard')}
        >
          <Ionicons
            name="document-text-outline"
            size={30}
            color={theme.colors.primary}
          />
          <View style={themedStyles.typeTextContainer}>
            <Text
              style={[themedStyles.typeTitle, { color: theme.colors.text }]}
            >
              Standard Post
            </Text>
            <Text
              style={[themedStyles.typeDesc, { color: theme.colors.subText }]}
            >
              Text, images, or standard videos
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            themedStyles.typeItem,
            { borderColor: theme.colors.notificationBadge },
          ]}
          onPress={() => setPostType('short')}
        >
          <Ionicons
            name="videocam-outline"
            size={30}
            color={theme.colors.notificationBadge}
          />
          <View style={themedStyles.typeTextContainer}>
            <Text
              style={[
                themedStyles.typeTitle,
                { color: theme.colors.notificationBadge },
              ]}
            >
              Short Video
            </Text>
            <Text
              style={[themedStyles.typeDesc, { color: theme.colors.subText }]}
            >
              Full-screen vertical sports highlights
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  // ── LEAGUE SELECTION ───────────────────────────────────────────────────
  if (!selectedLeague && !editMode) {
    return (
      <View
        style={[
          themedStyles.container,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <TouchableOpacity
          onPress={() => setPostType(null)}
          style={{ marginBottom: 10 }}
        >
          <Text
            style={[themedStyles.changeBtn, { color: theme.colors.primary }]}
          >
            ← Back to post type
          </Text>
        </TouchableOpacity>
        <Text style={[themedStyles.headerText, { color: theme.colors.text }]}>
          Which league is this for?
        </Text>
        <FlatList
          data={userLeagues}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                themedStyles.leagueItem,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => {
                setSelectedLeague(item.id);
                setSelectedName(item.name);
              }}
            >
              <View style={themedStyles.leagueRow}>
                {item.logo && (
                  <Image
                    source={item.logo}
                    style={themedStyles.leagueLogo}
                    resizeMode="contain"
                  />
                )}
                <Text
                  style={[
                    themedStyles.leagueText,
                    { color: theme.colors.text },
                  ]}
                >
                  {item.name}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.colors.secondary}
              />
            </TouchableOpacity>
          )}
        />
      </View>
    );
  }

  // ── MAIN EDITOR ────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={themedStyles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View style={themedStyles.headerRow}>
        <Text style={themedStyles.postingTo}>
          {quoteMode
            ? '🔄 Quoting'
            : postType === 'short'
            ? '🎥 Short'
            : '📝 Post'}{' '}
          in <Text style={themedStyles.leagueHighlight}>{selectedName}</Text>
        </Text>
        {!editMode && !quoteMode && (
          <TouchableOpacity onPress={() => setSelectedLeague(null)}>
            <Text style={themedStyles.changeBtn}>Change</Text>
          </TouchableOpacity>
        )}
      </View>

      {MentionInput ? (
        <MentionInput
          value={content}
          onChange={setContent}
          placeholder={quoteMode ? 'Add a comment...' : "What's on your mind?"}
          placeholderTextColor={theme.colors.subText}
          multiline
          blurOnSubmit={false}
          style={themedStyles.input}
          partTypes={[
            {
              trigger: '@',
              renderSuggestions: ({ keyword, onSuggestionPress }) => (
                <SuggestionList
                  keyword={keyword}
                  onSuggestionPress={onSuggestionPress}
                  fetchUserSuggestions={fetchUserSuggestions}
                  suggestions={suggestions}
                  mentionLoading={mentionLoading}
                  theme={theme}
                  themedStyles={themedStyles}
                />
              ),
              textStyle: { color: theme.colors.primary, fontWeight: 'bold' },
            },
            {
              trigger: '#',
              textStyle: { color: '#28a745', fontWeight: 'bold' },
            },
          ]}
        />
      ) : (
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder={quoteMode ? 'Add a comment...' : "What's on your mind?"}
          placeholderTextColor={theme.colors.subText}
          multiline
          blurOnSubmit={false}
          style={themedStyles.input}
        />
      )}

      {/* Quote preview */}
      {quoteMode && parentPost && (
        <View style={themedStyles.quotePreviewBox}>
          <View style={themedStyles.quotePreviewHeader}>
            <Ionicons name="repeat" size={14} color={theme.colors.primary} />
            <Text style={themedStyles.quotePreviewUser}>
              {parentPost.author_details?.display_name}
            </Text>
          </View>
          <Text style={themedStyles.quotePreviewText} numberOfLines={3}>
            {parentPost.content}
          </Text>
        </View>
      )}

      {/* ✅ Media preview — videos shown as static thumbnail, NO autoplay */}
      {mediaList.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={themedStyles.mediaRow}
          contentContainerStyle={{ gap: 10 }}
        >
          {mediaList.map((item, index) => {
            const isVideo =
              item.type?.startsWith('video') || item.uri?.endsWith('.mp4');
            const uri = item.isExisting
              ? item.uri.startsWith('http')
                ? item.uri
                : `${BASE_URL}${item.uri}`
              : item.uri;

            return (
              <View key={index} style={themedStyles.previewWrapper}>
                {isVideo ? (
                  // ✅ Static thumbnail — no Video component, no autoplay
                  <VideoThumb uri={uri} style={themedStyles.thumbnail} />
                ) : (
                  <Image
                    source={{ uri }}
                    style={themedStyles.thumbnail}
                    resizeMode="cover"
                  />
                )}

                {/* Remove button */}
                <TouchableOpacity
                  style={themedStyles.removeBadge}
                  onPress={() => removeMedia(index)}
                >
                  <Ionicons
                    name="close-circle"
                    size={24}
                    color={theme.colors.notificationBadge}
                  />
                </TouchableOpacity>

                {/* ✅ Short video: show Edit Sound button instead of autoplay */}
                {postType === 'short' && isVideo && (
                  <TouchableOpacity
                    style={[
                      themedStyles.editSoundBtn,
                      { backgroundColor: theme.colors.primary },
                    ]}
                    onPress={() => openShortEditor(item)}
                  >
                    <Ionicons name="musical-notes" size={12} color="#fff" />
                    <Text style={themedStyles.editSoundText}>Edit</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          {/* Add more (standard posts only) */}
          {postType !== 'short' && mediaList.length < MAX_IMAGES && (
            <TouchableOpacity
              style={[
                themedStyles.addMoreBtn,
                { borderColor: theme.colors.primary },
              ]}
              onPress={pickMedia}
            >
              <Ionicons name="add" size={32} color={theme.colors.primary} />
              <Text
                style={[
                  themedStyles.addMoreText,
                  { color: theme.colors.subText },
                ]}
              >
                {mediaList.length}/{MAX_IMAGES}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {postType === 'short' && mediaList[0]?.editConfig?.musicTrackTitle && (
        <Text
          style={[
            themedStyles.shortEditSummary,
            { color: theme.colors.primary },
          ]}
        >
          Sound: {mediaList[0].editConfig.musicTrackTitle}
        </Text>
      )}

      {/* Toolbar */}
      <View style={themedStyles.toolbar}>
        <TouchableOpacity style={themedStyles.toolBtn} onPress={pickMedia}>
          <Ionicons
            name={postType === 'short' ? 'videocam' : 'images'}
            size={28}
            color={
              postType === 'short'
                ? theme.colors.notificationBadge
                : theme.colors.primary
            }
          />
          <Text
            style={[
              themedStyles.toolText,
              {
                color:
                  postType === 'short'
                    ? theme.colors.notificationBadge
                    : theme.colors.primary,
              },
            ]}
          >
            {mediaList.length > 0
              ? postType === 'short'
                ? 'Replace video'
                : `${mediaList.length} file${
                    mediaList.length > 1 ? 's' : ''
                  } · Add more`
              : 'Add Media'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Post button */}
      <TouchableOpacity
        style={[
          themedStyles.postButton,
          !content.trim() &&
            mediaList.length === 0 &&
            !quoteMode &&
            themedStyles.disabledBtn,
        ]}
        onPress={handlePost}
        disabled={loading}
      >
        {loading ? (
          <View style={themedStyles.loadingContent}>
            <ActivityIndicator color={theme.colors.buttonText} />
            <Text style={themedStyles.postButtonText}>
              {uploadProgress > 0
                ? `Uploading ${uploadProgress}%`
                : 'Uploading...'}
            </Text>
          </View>
        ) : (
          <Text style={themedStyles.postButtonText}>
            {editMode ? 'Update' : quoteMode ? 'Post Quote' : 'Post'}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = theme =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: 20,
    },
    headerText: {
      color: theme.colors.text,
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 20,
      marginTop: 40,
    },
    typeItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      padding: 20,
      borderRadius: 15,
      marginBottom: 15,
      borderWidth: 1,
    },
    typeTextContainer: { marginLeft: 15 },
    typeTitle: { fontSize: 18, fontWeight: 'bold' },
    typeDesc: { fontSize: 12, marginTop: 2 },
    leagueItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 15,
      borderRadius: 12,
      marginBottom: 10,
      borderWidth: 1,
    },
    leagueRow: { flexDirection: 'row', alignItems: 'center' },
    leagueLogo: { width: 30, height: 30, marginRight: 15, borderRadius: 5 },
    leagueText: { fontSize: 16, fontWeight: '500' },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 20,
      alignItems: 'center',
    },
    postingTo: { color: theme.colors.subText },
    leagueHighlight: { color: theme.colors.primary, fontWeight: 'bold' },
    changeBtn: { color: theme.colors.primary, fontWeight: 'bold' },
    input: {
      color: theme.colors.text,
      fontSize: 18,
      minHeight: 150,
      textAlignVertical: 'top',
      paddingHorizontal: 12,
      paddingTop: 15,
      paddingBottom: 20,
      lineHeight: 24,
    },
    quotePreviewBox: {
      backgroundColor: theme.colors.card,
      padding: 15,
      borderRadius: 12,
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.primary,
      marginVertical: 10,
    },
    quotePreviewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 5,
    },
    quotePreviewUser: {
      color: theme.colors.primary,
      fontWeight: 'bold',
      marginLeft: 8,
      fontSize: 13,
    },
    quotePreviewText: {
      color: theme.colors.text,
      fontSize: 14,
      lineHeight: 20,
    },
    mediaRow: { marginVertical: 15 },
    previewWrapper: { position: 'relative', width: 100, marginRight: 4 },
    thumbnail: {
      width: 100,
      height: 100,
      borderRadius: 10,
      backgroundColor: theme.colors.card,
    },
    removeBadge: { position: 'absolute', top: -10, right: -10, zIndex: 2 },
    editSoundBtn: {
      position: 'absolute',
      bottom: 4,
      left: 4,
      right: 4,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 6,
      paddingVertical: 3,
      gap: 3,
    },
    editSoundText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    addMoreBtn: {
      width: 100,
      height: 100,
      borderRadius: 10,
      borderWidth: 2,
      borderStyle: 'dashed',
      justifyContent: 'center',
      alignItems: 'center',
    },
    addMoreText: { fontSize: 11, marginTop: 4 },
    shortEditSummary: { fontSize: 13, fontWeight: '700', marginTop: 12 },
    toolbar: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingTop: 15,
      marginTop: 10,
      gap: 16,
    },
    toolBtn: { flexDirection: 'row', alignItems: 'center' },
    toolText: { marginLeft: 8, fontWeight: '600' },
    postButton: {
      backgroundColor: theme.colors.primary,
      padding: 15,
      borderRadius: 30,
      alignItems: 'center',
      marginTop: 30,
    },
    disabledBtn: { backgroundColor: theme.colors.secondary },
    loadingContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    postButtonText: {
      color: theme.colors.buttonText,
      fontWeight: 'bold',
      fontSize: 16,
    },
    suggestionContainer: {
      backgroundColor: theme.colors.card,
      borderRadius: 10,
      maxHeight: 200,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      marginTop: 5,
      position: 'absolute',
      top: 100,
      width: '100%',
      zIndex: 1000,
    },
    suggestionItem: {
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    suggestionText: { color: theme.colors.text, fontWeight: '600' },
  });
