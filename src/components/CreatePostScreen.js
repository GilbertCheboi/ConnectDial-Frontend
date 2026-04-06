import React, {
  useState,
  useEffect,
  useCallback,
  useContext,
  useMemo,
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
  Platform,
  ActivityIndicator,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../api/client';
import { useIsFocused } from '@react-navigation/native';
import { AuthContext } from '../store/authStore';
import { ThemeContext } from '../store/themeStore';

import { MentionInput } from 'react-native-controlled-mentions';

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

export default function CreatePostScreen({ route, navigation }) {
  const isFocused = useIsFocused();
  const { user } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext) || {
    theme: {
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
        overlay: 'rgba(255, 255, 255, 0.05)',
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
    },
  };

  const {
    editMode = false,
    postData = null,
    leagueId = null,
    leagueName = '',
    onEditSuccess,
    postType: initialType = null,
    quoteMode = false, // 🚀 Added
    parentPost = null, // 🚀 Added
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

  // --- LOGIC: AUTO-FILL LEAGUE FOR QUOTES ---
  useEffect(() => {
    if (quoteMode && parentPost) {
      setPostType('standard'); // Quotes are always standard posts
      setSelectedLeague(parentPost.league);
      setSelectedName(parentPost.league_name || 'Original League');
    }
  }, [quoteMode, parentPost]);

  useEffect(() => {
    const fetchLatestProfile = async () => {
      try {
        const response = await api.get('auth/update/');
        const data = response.data.data || response.data;
        setProfile(data);
      } catch (err) {
        console.error('Create Post Profile Fetch Error:', err);
      }
    };

    if (isFocused) {
      fetchLatestProfile();
    }
  }, [isFocused]);

  const userLeagues = useMemo(() => {
    const sourceData = profile || user;
    console.log('🚀 CreatePost userLeagues sourceData:', sourceData);
    console.log('🚀 CreatePost fan_preferences:', sourceData?.fan_preferences);

    if (
      !sourceData?.fan_preferences ||
      !Array.isArray(sourceData.fan_preferences)
    ) {
      console.log('🚀 No fan_preferences found');
      return [];
    }

    const uniqueLeagues = [];
    const seenIds = new Set();

    sourceData.fan_preferences.forEach(pref => {
      const id = pref.league;
      console.log('🚀 Processing fan_preference:', pref, 'league id:', id);
      if (id && !seenIds.has(id)) {
        seenIds.add(id);
        const details = LEAGUE_MAP[id] || { name: `League ${id}`, logo: null };
        uniqueLeagues.push({ id, ...details });
      }
    });

    console.log('🚀 Final userLeagues:', uniqueLeagues);
    return uniqueLeagues.sort((a, b) => a.id - b.id);
  }, [profile, user]);

  // 1. Enhanced Reset Logic
  const resetForm = useCallback(() => {
    setContent('');
    setMediaList([]);
    setLoading(false);
    setUploadProgress(0);
    setSelectedLeague(null);
    setSelectedName('');
    setPostType(null);

    // 🚀 THE KEY: Manually clear the navigation params
    // This prevents the "Quote" or "Edit" data from persisting
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

  // 2. Handle Edit Mode Setup
  useEffect(() => {
    if (isFocused && editMode && postData) {
      setContent(postData.content || '');
      setSelectedLeague(postData.league || leagueId);
      setSelectedName(postData.league_name || leagueName);
      setPostType(postData.is_short ? 'short' : 'standard');
      if (postData.media_file) {
        setMediaList([{ uri: postData.media_file, isExisting: true }]);
      }
      navigation.setOptions({ title: 'Edit Post' });
    }
  }, [isFocused, editMode, postData]);

  // 3. Handle Quote Mode Setup (Optional but recommended for clarity)
  useEffect(() => {
    if (isFocused && quoteMode && parentPost) {
      // If quoting, you might want to default to the parent's league
      if (parentPost.league && !selectedLeague) {
        setSelectedLeague(parentPost.league);
        setSelectedName(parentPost.supporting_info?.league_name || '');
      }
      navigation.setOptions({ title: 'Quote Post' });
    } else if (isFocused && !editMode) {
      navigation.setOptions({ title: 'Create Post' });
    }
  }, [isFocused, quoteMode, parentPost]);

  // 4. Trigger reset when leaving
  useEffect(() => {
    if (!isFocused) {
      if (!preserveOnBlur) {
        resetForm();
      }
    }
  }, [isFocused, preserveOnBlur, resetForm]);

  useEffect(() => {
    if (editedShort) {
      setPostType('short');
      setMediaList([editedShort]);
      navigation.setParams({
        editedShort: null,
        preserveOnBlur: false,
      });
    }
  }, [editedShort, navigation]);

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

  const pickMedia = async () => {
    const options = {
      mediaType: postType === 'short' ? 'video' : 'mixed',
      selectionLimit: 1,
      quality: 0.8,
      videoQuality: 'medium',
      durationLimit: postType === 'short' ? 90 : undefined,
      formatAsMp4: true,
    };
    const result = await launchImageLibrary(options);
    if (result.didCancel) return;
    if (result.assets?.length) {
      const [asset] = result.assets;

      if (
        postType === 'short' &&
        asset.fileSize &&
        asset.fileSize > 50 * 1024 * 1024
      ) {
        Alert.alert(
          'Video too large',
          'Please choose a shorter or smaller video. Files above 50MB may take a long time to upload.',
        );
        return;
      }

      if (postType === 'short') {
        openShortEditor(asset);
        return;
      }

      setMediaList(result.assets);
    }
  };

  const fetchUserSuggestions = useCallback(async keyword => {
    if (!keyword) {
      setSuggestions([]);
      return;
    }
    try {
      setMentionLoading(true);
      // Adjust endpoint to match your Django User ViewSet search logic
      const response = await api.get(`auth/users/?search=${keyword}`);
      const formattedUsers = response.data.map(u => ({
        id: u.id.toString(),
        display: u.username, // Match what extract_mentions expects (@username)
      }));
      setSuggestions(formattedUsers);
    } catch (err) {
      console.error('Mention search error:', err);
    } finally {
      setMentionLoading(false);
    }
  }, []);

  const handlePost = async () => {
    const { quoteMode, parentPost, editMode, postData, onEditSuccess } =
      route.params || {};

    const hasContent = content.trim().length > 0;
    const hasMedia = mediaList.length > 0;

    // Validation
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

    // 1. Core Fields
    formData.append('content', content.trim());
    formData.append('is_short', String(postType === 'short')); // FormData likes strings for booleans

    // 2. 🚀 QUOTE & LEAGUE LOGIC
    if (quoteMode && parentPost) {
      // Ensure we send the ID as a string/number clearly
      formData.append('parent_post', parentPost.id.toString());

      // Fallback: If no league selected, use the parent post's league
      const leagueToAttach = selectedLeague || parentPost.league || '';
      formData.append('league', leagueToAttach.toString());
    } else {
      formData.append(
        'league',
        selectedLeague ? selectedLeague.toString() : '',
      );
    }

    // 3. Media Processing
    const newMedia = mediaList.filter(m => !m.isExisting);
    if (newMedia.length > 0) {
      newMedia.forEach((media, index) => {
        const fileUri =
          Platform.OS === 'android'
            ? media.uri
            : media.uri.replace('file://', '');

        formData.append('media_file', {
          uri: fileUri,
          // Ensure type fallback is safe
          type:
            media.type || (postType === 'short' ? 'video/mp4' : 'image/jpeg'),
          name:
            media.fileName ||
            `upload_${Date.now()}_${index}.${
              postType === 'short' ? 'mp4' : 'jpg'
            }`,
        });
      });
    }

    try {
      const config = {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: progressEvent => {
          const total = progressEvent.total || progressEvent.loaded || 0;
          if (!total) return;
          const rawPercent = Math.round((progressEvent.loaded * 100) / total);
          const safePercent = Math.max(0, Math.min(rawPercent, 99));
          setUploadProgress(safePercent);
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
            // 🚀 Optional: Trigger a refresh on the previous screen
            if (route.params?.refreshFeed) route.params.refreshFeed();
            navigation.goBack();
          },
        },
      ]);
    } catch (err) {
      setLoading(false);
      setUploadProgress(0);
      // 💡 Pro-tip: Log the actual backend error to see if it's a 400 (Bad Request)
      const backendError = err.response?.data;
      console.log(
        '--- ❌ FULL BACKEND ERROR ---',
        JSON.stringify(backendError, null, 2),
      );

      Alert.alert('Error', 'Could not save post. Check console for details.');
    }
  };
  // --- SELECTION SCREENS ---
  if (!postType && !editMode) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Text style={[styles.headerText, { color: theme.colors.text }]}>
          What are you sharing?
        </Text>
        <TouchableOpacity
          style={[
            styles(theme).typeItem,
            { borderColor: theme.colors.primary },
          ]}
          onPress={() => setPostType('standard')}
        >
          <Ionicons
            name="document-text-outline"
            size={30}
            color={theme.colors.primary}
          />
          <View style={styles(theme).typeTextContainer}>
            <Text
              style={[styles(theme).typeTitle, { color: theme.colors.text }]}
            >
              Standard Post
            </Text>
            <Text
              style={[styles(theme).typeDesc, { color: theme.colors.subText }]}
            >
              Text, images, or standard videos
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles(theme).typeItem,
            { borderColor: theme.colors.notificationBadge },
          ]}
          onPress={() => setPostType('short')}
        >
          <Ionicons
            name="videocam-outline"
            size={30}
            color={theme.colors.notificationBadge}
          />
          <View style={styles(theme).typeTextContainer}>
            <Text
              style={[
                styles(theme).typeTitle,
                { color: theme.colors.notificationBadge },
              ]}
            >
              Short Video
            </Text>
            <Text
              style={[styles(theme).typeDesc, { color: theme.colors.subText }]}
            >
              Full-screen vertical sports highlights
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  if (!selectedLeague && !editMode) {
    return (
      <View
        style={[
          styles(theme).container,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <TouchableOpacity
          onPress={() => setPostType(null)}
          style={{ marginBottom: 10 }}
        >
          <Text
            style={[styles(theme).changeBtn, { color: theme.colors.primary }]}
          >
            ← Back to post type
          </Text>
        </TouchableOpacity>
        <Text style={[styles(theme).headerText, { color: theme.colors.text }]}>
          Which league is this for?
        </Text>
        <FlatList
          data={userLeagues}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles(theme).leagueItem,
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
              <View style={styles(theme).leagueRow}>
                {item.logo && (
                  <Image
                    source={item.logo}
                    style={styles(theme).leagueLogo}
                    resizeMode="contain"
                  />
                )}
                <Text
                  style={[
                    styles(theme).leagueText,
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

  // --- MAIN EDITOR ---
  return (
    <ScrollView
      style={styles(theme).container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View style={styles(theme).headerRow}>
        <Text style={styles(theme).postingTo}>
          {quoteMode
            ? '🔄 Quoting'
            : postType === 'short'
            ? '🎥 Short'
            : '📝 Post'}{' '}
          in <Text style={styles(theme).leagueHighlight}>{selectedName}</Text>
        </Text>
        {!editMode && !quoteMode && (
          <TouchableOpacity onPress={() => setSelectedLeague(null)}>
            <Text style={styles(theme).changeBtn}>Change</Text>
          </TouchableOpacity>
        )}
      </View>

      <MentionInput
        value={content}
        onChange={setContent}
        placeholder={quoteMode ? 'Add a comment...' : "What's on your mind?"}
        placeholderTextColor={theme.colors.subText}
        multiline
        style={styles(theme).input} // Uses your existing styles
        partTypes={[
          {
            trigger: '@',
            renderSuggestions: ({ keyword, onSuggestionPress }) => {
              // Trigger the API fetch whenever the keyword changes
              useEffect(() => {
                fetchUserSuggestions(keyword);
              }, [keyword]);

              if (keyword == null || suggestions.length === 0) return null;

              return (
                <View style={styles(theme).suggestionContainer}>
                  {mentionLoading && (
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.primary}
                    />
                  )}
                  <FlatList
                    data={suggestions}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        onPress={() => onSuggestionPress(item)}
                        style={styles(theme).suggestionItem}
                      >
                        <Text style={styles(theme).suggestionText}>
                          @{item.display}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              );
            },
            textStyle: { color: theme.colors.primary, fontWeight: 'bold' }, // Highlight color in editor
          },
          {
            trigger: '#', // For hashtags, we just color them (backend handles the rest)
            textStyle: { color: '#28a745', fontWeight: 'bold' },
          },
        ]}
      />

      {/* 🚀 QUOTE PREVIEW UI */}
      {quoteMode && parentPost && (
        <View style={styles(theme).quotePreviewBox}>
          <View style={styles(theme).quotePreviewHeader}>
            <Ionicons name="repeat" size={14} color={theme.colors.primary} />
            <Text style={styles(theme).quotePreviewUser}>
              {parentPost.author_details?.display_name}
            </Text>
          </View>
          <Text style={styles(theme).quotePreviewText} numberOfLines={3}>
            {parentPost.content}
          </Text>
        </View>
      )}

      {mediaList.length > 0 && (
        <View style={styles(theme).mediaRow}>
          {mediaList.map((item, index) => (
            <View key={index} style={styles(theme).previewWrapper}>
              <Image
                source={{
                  uri:
                    item.isExisting && !item.uri.startsWith('http')
                      ? `http://192.168.100.107:8000${item.uri}`
                      : item.uri,
                }}
                style={styles(theme).thumbnail}
              />
              <TouchableOpacity
                style={styles(theme).removeBadge}
                onPress={() => setMediaList([])}
              >
                <Ionicons
                  name="close-circle"
                  size={24}
                  color={theme.colors.notificationBadge}
                />
              </TouchableOpacity>
            </View>
          ))}
          {postType === 'short' &&
            mediaList[0]?.editConfig?.musicTrackTitle && (
              <Text
                style={[
                  styles(theme).shortEditSummary,
                  { color: theme.colors.primary },
                ]}
              >
                Sound: {mediaList[0].editConfig.musicTrackTitle}
              </Text>
            )}
        </View>
      )}

      <View style={styles(theme).toolbar}>
        <TouchableOpacity style={styles(theme).toolBtn} onPress={pickMedia}>
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
              styles(theme).toolText,
              {
                color:
                  postType === 'short'
                    ? theme.colors.notificationBadge
                    : theme.colors.primary,
              },
            ]}
          >
            {mediaList.length > 0 ? 'Replace' : 'Add Media'}
          </Text>
        </TouchableOpacity>

        {postType === 'short' && mediaList.length > 0 && (
          <TouchableOpacity
            style={styles(theme).toolBtn}
            onPress={() => openShortEditor(mediaList[0])}
          >
            <Ionicons name="musical-notes" size={24} color="#F59E0B" />
            <Text style={[styles(theme).toolText, { color: '#F59E0B' }]}>
              Edit Sound
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles(theme).postButton,
          !content.trim() &&
            mediaList.length === 0 &&
            !quoteMode &&
            styles(theme).disabledBtn,
        ]}
        onPress={handlePost}
        disabled={loading}
      >
        {loading ? (
          <View style={styles(theme).loadingContent}>
            <ActivityIndicator color={theme.colors.buttonText} />
            <Text style={styles(theme).postButtonText}>
              {uploadProgress > 0
                ? `Uploading ${uploadProgress}%`
                : 'Uploading...'}
            </Text>
          </View>
        ) : (
          <Text style={styles(theme).postButtonText}>
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
      borderColor: theme.colors.primary,
    },
    typeTextContainer: { marginLeft: 15 },
    typeTitle: {
      color: theme.colors.primary,
      fontSize: 18,
      fontWeight: 'bold',
    },
    typeDesc: { color: theme.colors.subText, fontSize: 12, marginTop: 2 },
    leagueItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.card,
      padding: 15,
      borderRadius: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    leagueRow: { flexDirection: 'row', alignItems: 'center' },
    leagueLogo: { width: 30, height: 30, marginRight: 15, borderRadius: 5 },
    leagueText: { color: theme.colors.text, fontSize: 16, fontWeight: '500' },
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
      minHeight: 100,
      textAlignVertical: 'top',
    },

    // 🚀 QUOTE PREVIEW STYLES
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
    previewWrapper: { position: 'relative', width: 100 },
    shortEditSummary: {
      color: '#F59E0B',
      fontSize: 13,
      fontWeight: '700',
      marginTop: 12,
    },
    thumbnail: {
      width: 100,
      height: 100,
      borderRadius: 10,
      backgroundColor: theme.colors.card,
    },
    removeBadge: { position: 'absolute', top: -10, right: -10, zIndex: 1 },
    toolbar: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingTop: 15,
      marginTop: 10,
      gap: 16,
    },
    toolBtn: { flexDirection: 'row', alignItems: 'center' },
    toolText: { marginLeft: 8, fontWeight: '600', color: theme.colors.text },
    postButton: {
      backgroundColor: theme.colors.primary,
      padding: 15,
      borderRadius: 30,
      alignItems: 'center',
      marginTop: 30,
    },
    disabledBtn: { backgroundColor: theme.colors.secondary },
    loadingContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
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
      position: 'absolute', // Ensures it floats over other elements
      top: 100, // Adjust based on your layout
      width: '100%',
      zIndex: 1000,
    },
    suggestionItem: {
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    suggestionText: {
      color: theme.colors.text,
      fontWeight: '600',
    },
  });
