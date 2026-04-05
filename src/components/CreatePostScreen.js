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

  const {
    editMode = false,
    postData = null,
    leagueId = null,
    leagueName = '',
    onEditSuccess,
    postType: initialType = null,
    quoteMode = false, // 🚀 Added
    parentPost = null, // 🚀 Added
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
    if (
      !sourceData?.fan_preferences ||
      !Array.isArray(sourceData.fan_preferences)
    )
      return [];
    const uniqueLeagues = [];
    const seenIds = new Set();
    sourceData.fan_preferences.forEach(pref => {
      const id = pref.league;
      if (id && !seenIds.has(id)) {
        seenIds.add(id);
        const details = LEAGUE_MAP[id] || { name: `League ${id}`, logo: null };
        uniqueLeagues.push({ id, ...details });
      }
    });
    return uniqueLeagues.sort((a, b) => a.id - b.id);
  }, [profile, user]);

  // 1. Enhanced Reset Logic
  const resetForm = useCallback(() => {
    setContent('');
    setMediaList([]);
    setLoading(false);
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
      resetForm();
    }
  }, [isFocused, resetForm]);
  const pickMedia = async () => {
    const options = {
      mediaType: postType === 'short' ? 'video' : 'mixed',
      selectionLimit: 1,
      quality: 0.8,
    };
    const result = await launchImageLibrary(options);
    if (result.didCancel) return;
    if (result.assets) setMediaList(result.assets);
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
      <View style={styles.container}>
        <Text style={styles.headerText}>What are you sharing?</Text>
        <TouchableOpacity
          style={styles.typeItem}
          onPress={() => setPostType('standard')}
        >
          <Ionicons name="document-text-outline" size={30} color="#1E90FF" />
          <View style={styles.typeTextContainer}>
            <Text style={styles.typeTitle}>Standard Post</Text>
            <Text style={styles.typeDesc}>
              Text, images, or standard videos
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeItem, { borderColor: '#FF4B4B' }]}
          onPress={() => setPostType('short')}
        >
          <Ionicons name="videocam-outline" size={30} color="#FF4B4B" />
          <View style={styles.typeTextContainer}>
            <Text style={[styles.typeTitle, { color: '#FF4B4B' }]}>
              Short Video
            </Text>
            <Text style={styles.typeDesc}>
              Full-screen vertical sports highlights
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  if (!selectedLeague && !editMode) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          onPress={() => setPostType(null)}
          style={{ marginBottom: 10 }}
        >
          <Text style={styles.changeBtn}>← Back to post type</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>Which league is this for?</Text>
        <FlatList
          data={userLeagues}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.leagueItem}
              onPress={() => {
                setSelectedLeague(item.id);
                setSelectedName(item.name);
              }}
            >
              <View style={styles.leagueRow}>
                {item.logo && (
                  <Image
                    source={item.logo}
                    style={styles.leagueLogo}
                    resizeMode="contain"
                  />
                )}
                <Text style={styles.leagueText}>{item.name}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#475569" />
            </TouchableOpacity>
          )}
        />
      </View>
    );
  }

  // --- MAIN EDITOR ---
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View style={styles.headerRow}>
        <Text style={styles.postingTo}>
          {quoteMode
            ? '🔄 Quoting'
            : postType === 'short'
            ? '🎥 Short'
            : '📝 Post'}{' '}
          in <Text style={styles.leagueHighlight}>{selectedName}</Text>
        </Text>
        {!editMode && !quoteMode && (
          <TouchableOpacity onPress={() => setSelectedLeague(null)}>
            <Text style={styles.changeBtn}>Change</Text>
          </TouchableOpacity>
        )}
      </View>

      <MentionInput
        value={content}
        onChange={setContent}
        placeholder={quoteMode ? 'Add a comment...' : "What's on your mind?"}
        placeholderTextColor="#94A3B8"
        multiline
        style={styles.input} // Uses your existing styles
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
                <View style={styles.suggestionContainer}>
                  {mentionLoading && (
                    <ActivityIndicator size="small" color="#1E90FF" />
                  )}
                  <FlatList
                    data={suggestions}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        onPress={() => onSuggestionPress(item)}
                        style={styles.suggestionItem}
                      >
                        <Text style={styles.suggestionText}>
                          @{item.display}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              );
            },
            textStyle: { color: '#1E90FF', fontWeight: 'bold' }, // Highlight color in editor
          },
          {
            trigger: '#', // For hashtags, we just color them (backend handles the rest)
            textStyle: { color: '#28a745', fontWeight: 'bold' },
          },
        ]}
      />

      {/* 🚀 QUOTE PREVIEW UI */}
      {quoteMode && parentPost && (
        <View style={styles.quotePreviewBox}>
          <View style={styles.quotePreviewHeader}>
            <Ionicons name="repeat" size={14} color="#1E90FF" />
            <Text style={styles.quotePreviewUser}>
              {parentPost.author_details?.display_name}
            </Text>
          </View>
          <Text style={styles.quotePreviewText} numberOfLines={3}>
            {parentPost.content}
          </Text>
        </View>
      )}

      {mediaList.length > 0 && (
        <View style={styles.mediaRow}>
          {mediaList.map((item, index) => (
            <View key={index} style={styles.previewWrapper}>
              <Image
                source={{
                  uri:
                    item.isExisting && !item.uri.startsWith('http')
                      ? `http://192.168.100.107:8000${item.uri}`
                      : item.uri,
                }}
                style={styles.thumbnail}
              />
              <TouchableOpacity
                style={styles.removeBadge}
                onPress={() => setMediaList([])}
              >
                <Ionicons name="close-circle" size={24} color="#FF4B4B" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.toolBtn} onPress={pickMedia}>
          <Ionicons
            name={postType === 'short' ? 'videocam' : 'images'}
            size={28}
            color={postType === 'short' ? '#FF4B4B' : '#1E90FF'}
          />
          <Text
            style={[
              styles.toolText,
              { color: postType === 'short' ? '#FF4B4B' : '#1E90FF' },
            ]}
          >
            {mediaList.length > 0 ? 'Replace' : 'Add Media'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[
          styles.postButton,
          !content.trim() &&
            mediaList.length === 0 &&
            !quoteMode &&
            styles.disabledBtn,
        ]}
        onPress={handlePost}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.postButtonText}>
            {editMode ? 'Update' : quoteMode ? 'Post Quote' : 'Post'}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1F2D', padding: 20 },
  headerText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 40,
  },
  typeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#162A3B',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#1E90FF',
  },
  typeTextContainer: { marginLeft: 15 },
  typeTitle: { color: '#1E90FF', fontSize: 18, fontWeight: 'bold' },
  typeDesc: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  leagueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#162A3B',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  leagueRow: { flexDirection: 'row', alignItems: 'center' },
  leagueLogo: { width: 30, height: 30, marginRight: 15, borderRadius: 5 },
  leagueText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    alignItems: 'center',
  },
  postingTo: { color: '#94A3B8' },
  leagueHighlight: { color: '#1E90FF', fontWeight: 'bold' },
  changeBtn: { color: '#1E90FF', fontWeight: 'bold' },
  input: {
    color: '#fff',
    fontSize: 18,
    minHeight: 100,
    textAlignVertical: 'top',
  },

  // 🚀 QUOTE PREVIEW STYLES
  quotePreviewBox: {
    backgroundColor: '#162A3B',
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#1E90FF',
    marginVertical: 10,
  },
  quotePreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  quotePreviewUser: {
    color: '#1E90FF',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 13,
  },
  quotePreviewText: { color: '#CBD5E1', fontSize: 14, lineHeight: 20 },

  mediaRow: { marginVertical: 15 },
  previewWrapper: { position: 'relative', width: 100 },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 10,
    backgroundColor: '#162A3B',
  },
  removeBadge: { position: 'absolute', top: -10, right: -10, zIndex: 1 },
  toolbar: {
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 15,
    marginTop: 10,
  },
  toolBtn: { flexDirection: 'row', alignItems: 'center' },
  toolText: { marginLeft: 8, fontWeight: '600' },
  postButton: {
    backgroundColor: '#1E90FF',
    padding: 15,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 30,
  },
  disabledBtn: { backgroundColor: '#1e90ff55' },
  postButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  suggestionContainer: {
    backgroundColor: '#162A3B',
    borderRadius: 10,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#1E90FF',
    marginTop: 5,
    position: 'absolute', // Ensures it floats over other elements
    top: 100, // Adjust based on your layout
    width: '100%',
    zIndex: 1000,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#0D1F2D',
  },
  suggestionText: {
    color: '#fff',
    fontWeight: '600',
  },
});
