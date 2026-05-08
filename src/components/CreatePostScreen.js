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
  ActivityIndicator,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
// ✅ BASE_URL imported from client — no hardcoded IPs anywhere
import api, { BASE_URL } from '../api/client';
import { useIsFocused } from '@react-navigation/native';
import { AuthContext } from '../store/authStore';
import { ThemeContext } from '../store/themeStore';
// Support both v2 (named export) and v3 (deprecated) of react-native-controlled-mentions
// Falls back to a plain TextInput wrapper if MentionInput is undefined (v3+)
import RNCMentions from 'react-native-controlled-mentions';
const MentionInput = RNCMentions?.MentionInput || RNCMentions?.default || null;

const LEAGUE_MAP = {
  1:  { name: 'Premier League',    logo: require('../screens/assets/epl.png') },
  2:  { name: 'NBA',               logo: require('../screens/assets/NBA.jpeg') },
  3:  { name: 'NFL',               logo: require('../screens/assets/NFL.png') },
  4:  { name: 'F1',                logo: require('../screens/assets/F1.png') },
  5:  { name: 'Champions League',  logo: require('../screens/assets/Champions_League.png') },
  6:  { name: 'MLB',               logo: require('../screens/assets/MLB.png') },
  7:  { name: 'NHL',               logo: require('../screens/assets/NHL-logo.jpg') },
  8:  { name: 'La Liga',           logo: require('../screens/assets/laliga.png') },
  9:  { name: 'Serie A',           logo: require('../screens/assets/Serie_A.png') },
  10: { name: 'Bundesliga',        logo: require('../screens/assets/bundesliga.jpg') },
  11: { name: 'Ligue 1',           logo: require('../screens/assets/Ligue1_logo.png') },
  12: { name: 'Afcon',             logo: require('../screens/assets/Afcon.png') },
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
};

// ✅ Extracted as standalone component — fixes Rules of Hooks violation
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

export default function CreatePostScreen({ route, navigation }) {
  const isFocused = useIsFocused();
  const { user } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext) || { theme: DEFAULT_THEME };

  // ✅ All route params destructured ONCE at the top — no stale closure bug
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
        const response = await api.get('auth/update/');
        const data = response.data.data || response.data;
        setProfile(data);
      } catch (err) {
        console.error('Create Post Profile Fetch Error:', err);
      }
    };
    if (isFocused) fetchLatestProfile();
  }, [isFocused]);

  const userLeagues = useMemo(() => {
    const sourceData = profile || user;
    if (!sourceData?.fan_preferences || !Array.isArray(sourceData.fan_preferences)) {
      return [];
    }
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
      if (postData.media_file) {
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
    if (!isFocused && !preserveOnBlur) {
      resetForm();
    }
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
      formatAsMp4: true,
    };
    const result = await launchImageLibrary(options);
    if (result.didCancel) return;
    if (result.assets?.length) {
      const [asset] = result.assets;
      if (postType === 'short' && asset.fileSize && asset.fileSize > 50 * 1024 * 1024) {
        Alert.alert('Video too large', 'Please choose a video under 50MB.');
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
    if (!keyword) { setSuggestions([]); return; }
    try {
      setMentionLoading(true);
      const response = await api.get(`auth/users/?search=${keyword}`);
      const formattedUsers = response.data.map(u => ({
        id: u.id.toString(),
        display: u.username,
      }));
      setSuggestions(formattedUsers);
    } catch (err) {
      console.error('Mention search error:', err);
    } finally {
      setMentionLoading(false);
    }
  }, []);

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
      formData.append('league', (selectedLeague || parentPost.league || '').toString());
    } else {
      formData.append('league', selectedLeague ? selectedLeague.toString() : '');
    }

    const newMedia = mediaList.filter(m => !m.isExisting);
    if (newMedia.length > 0) {
      newMedia.forEach((media, index) => {
        // ✅ strip file:// safely on both platforms
        const fileUri = media.uri.replace('file://', '');
        formData.append('media_file', {
          uri: fileUri,
          type: media.type || (postType === 'short' ? 'video/mp4' : 'image/jpeg'),
          name: media.fileName || `upload_${Date.now()}_${index}.${postType === 'short' ? 'mp4' : 'jpg'}`,
        });
      });
    }

    try {
      const config = {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: progressEvent => {
          const total = progressEvent.total || progressEvent.loaded || 0;
          if (!total) return;
          // ✅ Cap at 95 while uploading, success handler sets 100
          const percent = Math.min(
            Math.round((progressEvent.loaded * 100) / total),
            95,
          );
          setUploadProgress(percent);
        },
      };

      let response;
      if (editMode) {
        response = await api.patch(`api/posts/${postData.id}/`, formData, config);
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
      console.log('❌ FULL BACKEND ERROR:', JSON.stringify(err.response?.data, null, 2));
      Alert.alert('Error', 'Could not save post. Check console for details.');
    }
  };

  const themedStyles = styles(theme);

  // --- POST TYPE SELECTION ---
  if (!postType && !editMode) {
    return (
      <View style={[themedStyles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[themedStyles.headerText, { color: theme.colors.text }]}>
          What are you sharing?
        </Text>
        <TouchableOpacity
          style={[themedStyles.typeItem, { borderColor: theme.colors.primary }]}
          onPress={() => setPostType('standard')}
        >
          <Ionicons name="document-text-outline" size={30} color={theme.colors.primary} />
          <View style={themedStyles.typeTextContainer}>
            <Text style={[themedStyles.typeTitle, { color: theme.colors.text }]}>
              Standard Post
            </Text>
            <Text style={[themedStyles.typeDesc, { color: theme.colors.subText }]}>
              Text, images, or standard videos
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[themedStyles.typeItem, { borderColor: theme.colors.notificationBadge }]}
          onPress={() => setPostType('short')}
        >
          <Ionicons name="videocam-outline" size={30} color={theme.colors.notificationBadge} />
          <View style={themedStyles.typeTextContainer}>
            <Text style={[themedStyles.typeTitle, { color: theme.colors.notificationBadge }]}>
              Short Video
            </Text>
            <Text style={[themedStyles.typeDesc, { color: theme.colors.subText }]}>
              Full-screen vertical sports highlights
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  // --- LEAGUE SELECTION ---
  if (!selectedLeague && !editMode) {
    return (
      <View style={[themedStyles.container, { backgroundColor: theme.colors.background }]}>
        <TouchableOpacity onPress={() => setPostType(null)} style={{ marginBottom: 10 }}>
          <Text style={[themedStyles.changeBtn, { color: theme.colors.primary }]}>
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
                { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
              ]}
              onPress={() => {
                setSelectedLeague(item.id);
                setSelectedName(item.name);
              }}
            >
              <View style={themedStyles.leagueRow}>
                {item.logo && (
                  <Image source={item.logo} style={themedStyles.leagueLogo} resizeMode="contain" />
                )}
                <Text style={[themedStyles.leagueText, { color: theme.colors.text }]}>
                  {item.name}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.secondary} />
            </TouchableOpacity>
          )}
        />
      </View>
    );
  }

  // --- MAIN EDITOR ---
  return (
    <ScrollView
      style={themedStyles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View style={themedStyles.headerRow}>
        <Text style={themedStyles.postingTo}>
          {quoteMode ? '🔄 Quoting' : postType === 'short' ? '🎥 Short' : '📝 Post'}{' '}
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
          multiline={true}
          numberOfLines={4}
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
          multiline={true}
          numberOfLines={4}
          blurOnSubmit={false}
          style={themedStyles.input}
        />
      )}

      {/* Quote Preview */}
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

      {/* Media Preview */}
      {mediaList.length > 0 && (
        <View style={themedStyles.mediaRow}>
          {mediaList.map((item, index) => (
            <View key={index} style={themedStyles.previewWrapper}>
              {/* ✅ Video vs image thumbnail */}
              {item.type?.includes('video') ? (
                <View
                  style={[
                    themedStyles.thumbnail,
                    { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
                  ]}
                >
                  <Ionicons name="play-circle" size={40} color="#fff" />
                </View>
              ) : (
                <Image
                  source={{
                    // ✅ Use BASE_URL instead of hardcoded IP
                    uri: item.isExisting
                      ? (item.uri.startsWith('http') ? item.uri : `${BASE_URL}${item.uri}`)
                      : item.uri,
                  }}
                  style={themedStyles.thumbnail}
                />
              )}
              <TouchableOpacity
                style={themedStyles.removeBadge}
                onPress={() => setMediaList([])}
              >
                <Ionicons name="close-circle" size={24} color={theme.colors.notificationBadge} />
              </TouchableOpacity>
            </View>
          ))}
          {postType === 'short' && mediaList[0]?.editConfig?.musicTrackTitle && (
            <Text style={[themedStyles.shortEditSummary, { color: theme.colors.primary }]}>
              Sound: {mediaList[0].editConfig.musicTrackTitle}
            </Text>
          )}
        </View>
      )}

      {/* Toolbar */}
      <View style={themedStyles.toolbar}>
        <TouchableOpacity style={themedStyles.toolBtn} onPress={pickMedia}>
          <Ionicons
            name={postType === 'short' ? 'videocam' : 'images'}
            size={28}
            color={postType === 'short' ? theme.colors.notificationBadge : theme.colors.primary}
          />
          <Text
            style={[
              themedStyles.toolText,
              { color: postType === 'short' ? theme.colors.notificationBadge : theme.colors.primary },
            ]}
          >
            {mediaList.length > 0 ? 'Replace' : 'Add Media'}
          </Text>
        </TouchableOpacity>

        {postType === 'short' && mediaList.length > 0 && (
          <TouchableOpacity
            style={themedStyles.toolBtn}
            onPress={() => openShortEditor(mediaList[0])}
          >
            <Ionicons name="musical-notes" size={24} color="#F59E0B" />
            <Text style={[themedStyles.toolText, { color: '#F59E0B' }]}>Edit Sound</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Post Button */}
      <TouchableOpacity
        style={[
          themedStyles.postButton,
          !content.trim() && mediaList.length === 0 && !quoteMode && themedStyles.disabledBtn,
        ]}
        onPress={handlePost}
        disabled={loading}
      >
        {loading ? (
          <View style={themedStyles.loadingContent}>
            <ActivityIndicator color={theme.colors.buttonText} />
            <Text style={themedStyles.postButtonText}>
              {uploadProgress > 0 ? `Uploading ${uploadProgress}%` : 'Uploading...'}
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
    container:          { flex: 1, backgroundColor: theme.colors.background, padding: 20 },
    headerText:         { color: theme.colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 20, marginTop: 40 },
    typeItem:           { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.card, padding: 20, borderRadius: 15, marginBottom: 15, borderWidth: 1 },
    typeTextContainer:  { marginLeft: 15 },
    typeTitle:          { fontSize: 18, fontWeight: 'bold' },
    typeDesc:           { fontSize: 12, marginTop: 2 },
    leagueItem:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1 },
    leagueRow:          { flexDirection: 'row', alignItems: 'center' },
    leagueLogo:         { width: 30, height: 30, marginRight: 15, borderRadius: 5 },
    leagueText:         { fontSize: 16, fontWeight: '500' },
    headerRow:          { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center' },
    postingTo:          { color: theme.colors.subText },
    leagueHighlight:    { color: theme.colors.primary, fontWeight: 'bold' },
    changeBtn:          { color: theme.colors.primary, fontWeight: 'bold' },
    input:              { color: theme.colors.text, fontSize: 18, minHeight: 150, textAlignVertical: 'top', paddingHorizontal: 12, paddingTop: 15, paddingBottom: 20, lineHeight: 24 },
    quotePreviewBox:    { backgroundColor: theme.colors.card, padding: 15, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: theme.colors.primary, marginVertical: 10 },
    quotePreviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
    quotePreviewUser:   { color: theme.colors.primary, fontWeight: 'bold', marginLeft: 8, fontSize: 13 },
    quotePreviewText:   { color: theme.colors.text, fontSize: 14, lineHeight: 20 },
    mediaRow:           { marginVertical: 15 },
    previewWrapper:     { position: 'relative', width: 100 },
    shortEditSummary:   { fontSize: 13, fontWeight: '700', marginTop: 12 },
    thumbnail:          { width: 100, height: 100, borderRadius: 10, backgroundColor: theme.colors.card },
    removeBadge:        { position: 'absolute', top: -10, right: -10, zIndex: 1 },
    toolbar:            { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 15, marginTop: 10, gap: 16 },
    toolBtn:            { flexDirection: 'row', alignItems: 'center' },
    toolText:           { marginLeft: 8, fontWeight: '600' },
    postButton:         { backgroundColor: theme.colors.primary, padding: 15, borderRadius: 30, alignItems: 'center', marginTop: 30 },
    disabledBtn:        { backgroundColor: theme.colors.secondary },
    loadingContent:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
    postButtonText:     { color: theme.colors.buttonText, fontWeight: 'bold', fontSize: 16 },
    suggestionContainer:{ backgroundColor: theme.colors.card, borderRadius: 10, maxHeight: 200, borderWidth: 1, borderColor: theme.colors.primary, marginTop: 5, position: 'absolute', top: 100, width: '100%', zIndex: 1000 },
    suggestionItem:     { padding: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    suggestionText:     { color: theme.colors.text, fontWeight: '600' },
  });