import React, { useState, useEffect, useCallback } from 'react';
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

export default function CreatePostScreen({ route, navigation }) {
  const isFocused = useIsFocused();

  // Extract initial params
  const {
    editMode = false,
    postData = null,
    leagueId = null,
    leagueName = '',
    onEditSuccess,
    postType: initialType = null,
  } = route.params || {};

  // --- 1. STATE ---
  const [content, setContent] = useState('');
  const [selectedLeague, setSelectedLeague] = useState(leagueId);
  const [selectedName, setSelectedName] = useState(leagueName);
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [postType, setPostType] = useState(initialType);

  // --- 2. HELPERS ---

  // Memoized reset function to prevent infinite loops in useEffect
  const resetForm = useCallback(() => {
    setContent('');
    setMediaList([]);
    setLoading(false);

    // Reset selection logic based on whether they were passed as props
    if (!leagueId) {
      setSelectedLeague(null);
      setSelectedName('');
    }
    if (!initialType) {
      setPostType(null);
    }
  }, [leagueId, initialType]);

  // --- 3. EFFECTS ---

  // Handle Edit Mode Setup - only runs when entering edit mode
  useEffect(() => {
    if (editMode && postData) {
      setContent(postData.content || '');
      setSelectedLeague(postData.league || leagueId);
      setSelectedName(postData.league_name || leagueName);
      setPostType(postData.is_short ? 'short' : 'standard');

      if (postData.media_file) {
        setMediaList([{ uri: postData.media_file, isExisting: true }]);
      }
      navigation.setOptions({ title: 'Edit Post' });
    }
  }, [editMode, postData]);

  // Clean up state and params when navigating AWAY
  useEffect(() => {
    if (!isFocused) {
      resetForm();

      // Only clear params if they exist to prevent infinite update loop
      if (route.params?.editMode || route.params?.postData) {
        navigation.setParams({
          editMode: false,
          postData: null,
          postType: null,
          leagueId: null,
          leagueName: null,
        });
      }
    }
  }, [isFocused, resetForm]);

  const leagues = [
    { id: 1, name: 'Premier League' },
    { id: 2, name: 'La Liga' },
    { id: 3, name: 'NBA' },
    { id: 4, name: 'Champions League' },
  ];

  const pickMedia = async () => {
    const options = {
      mediaType: postType === 'short' ? 'video' : 'mixed',
      selectionLimit: 1,
      quality: 0.8,
    };

    const result = await launchImageLibrary(options);
    if (result.didCancel) return;
    if (result.assets) {
      setMediaList(result.assets);
    }
  };

  const handlePost = async () => {
    if (!content.trim() && mediaList.length === 0) return;
    if (postType === 'short' && mediaList.length === 0) {
      Alert.alert('Required', 'Please select a video for your Short.');
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('content', content);
    formData.append('league', selectedLeague || '');
    formData.append('is_short', postType === 'short');

    const newMedia = mediaList.filter(m => !m.isExisting);
    if (newMedia.length > 0) {
      newMedia.forEach((media, index) => {
        formData.append('media_file', {
          uri:
            Platform.OS === 'android'
              ? media.uri
              : media.uri.replace('file://', ''),
          type:
            media.type || (postType === 'short' ? 'video/mp4' : 'image/jpeg'),
          name:
            media.fileName ||
            `upload_${index}.${postType === 'short' ? 'mp4' : 'jpg'}`,
        });
      });
    }

    try {
      let response;
      if (editMode) {
        response = await api.patch(`api/posts/${postData.id}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (onEditSuccess) onEditSuccess(response.data);
      } else {
        response = await api.post('api/posts/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      // Success logic
      setLoading(false); // Stop spinner immediately after response
      Alert.alert('Success', editMode ? 'Updated!' : 'Shared!', [
        {
          text: 'OK',
          onPress: () => {
            resetForm();
            navigation.goBack();
          },
        },
      ]);
    } catch (err) {
      setLoading(false);
      Alert.alert('Error', 'Could not save post.');
      console.error(err);
    }
  };

  // --- 4. CONDITIONAL RENDERING ---

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
          data={leagues}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.leagueItem}
              onPress={() => {
                setSelectedLeague(item.id);
                setSelectedName(item.name);
              }}
            >
              <Text style={styles.leagueText}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.postingTo}>
            {postType === 'short' ? '🎥 Short' : '📝 Post'} in{' '}
            <Text style={styles.leagueHighlight}>{selectedName}</Text>
          </Text>
        </View>
        {!editMode && (
          <TouchableOpacity onPress={() => setSelectedLeague(null)}>
            <Text style={styles.changeBtn}>Change</Text>
          </TouchableOpacity>
        )}
      </View>

      <TextInput
        style={styles.input}
        placeholder={
          postType === 'short'
            ? 'Add a caption for your highlight...'
            : "What's on your mind?"
        }
        placeholderTextColor="#94A3B8"
        multiline
        value={content}
        onChangeText={setContent}
      />

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
            {mediaList.length > 0
              ? 'Replace'
              : postType === 'short'
              ? 'Select Video'
              : 'Add Photo/Video'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[
          styles.postButton,
          !content.trim() && mediaList.length === 0 && styles.disabledBtn,
        ]}
        onPress={handlePost}
        disabled={loading || (!content.trim() && mediaList.length === 0)}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.postButtonText}>
            {editMode ? 'Update' : 'Post'}
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
    backgroundColor: '#162A3B',
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
  },
  leagueText: { color: '#fff', fontSize: 16 },
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
    minHeight: 120,
    textAlignVertical: 'top',
  },
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
});
