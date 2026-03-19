import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../api/client';

export default function CreatePostScreen({ route, navigation }) {
  const [content, setContent] = useState('');
  const [selectedLeague, setSelectedLeague] = useState(
    route.params?.leagueId || null,
  );
  const [selectedName, setSelectedName] = useState(
    route.params?.leagueName || '',
  );

  // 1. CHANGE: State is now an array for multiple files
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(false);

  const leagues = [
    { id: 1, name: 'Premier League' },
    { id: 2, name: 'La Liga' },
    { id: 3, name: 'NBA' },
    { id: 4, name: 'Champions League' },
  ];

  const pickMedia = async () => {
    const options = {
      mediaType: 'mixed',
      selectionLimit: 0, // 0 allows unlimited selection (or set to 4, 10, etc.)
      quality: 0.8,
    };

    const result = await launchImageLibrary(options);

    if (result.didCancel) return;
    if (result.assets) {
      // Append new selections to any existing ones
      setMediaList([...mediaList, ...result.assets]);
    }
  };

  const removeMedia = index => {
    const newList = [...mediaList];
    newList.splice(index, 1);
    setMediaList(newList);
  };

  const handlePost = async () => {
    if (!content.trim() && mediaList.length === 0) return;
    setLoading(true);

    const formData = new FormData();
    formData.append('content', content);
    formData.append('league', selectedLeague);

    // Determine post type based on first file (or your backend logic)
    const hasVideo = mediaList.some(m => m.type?.includes('video'));
    formData.append('post_type', hasVideo ? 'video' : 'image');

    // 2. CHANGE: Append all files to the FormData
    mediaList.forEach((media, index) => {
      formData.append('files', {
        uri:
          Platform.OS === 'android'
            ? media.uri
            : media.uri.replace('file://', ''),
        type: media.type,
        name: media.fileName || `file_${index}.jpg`,
      });
    });

    try {
      await api.post('api/posts/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('Success', 'Post created!');
      setMediaList([]);
      setContent('');
      navigation.navigate('Home');
    } catch (err) {
      console.log('Upload Error:', err.response?.data);
      Alert.alert('Error', 'Could not upload post.');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedLeague) {
    return (
      <View style={styles.container}>
        <Text style={styles.headerText}>Where would you like to post?</Text>
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
        <Text style={styles.postingTo}>
          Posting to: <Text style={styles.leagueHighlight}>{selectedName}</Text>
        </Text>
        <TouchableOpacity onPress={() => setSelectedLeague(null)}>
          <Text style={styles.changeBtn}>Change</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        placeholder="What's on your mind?"
        placeholderTextColor="#94A3B8"
        multiline
        value={content}
        onChangeText={setContent}
      />

      {/* 3. CHANGE: Horizontal preview list for multiple images */}
      {mediaList.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.mediaRow}
        >
          {mediaList.map((item, index) => (
            <View key={index} style={styles.previewWrapper}>
              <Image source={{ uri: item.uri }} style={styles.thumbnail} />
              <TouchableOpacity
                style={styles.removeBadge}
                onPress={() => removeMedia(index)}
              >
                <Ionicons name="close-circle" size={24} color="#FF4B4B" />
              </TouchableOpacity>
              {item.type?.includes('video') && (
                <View style={styles.playIcon}>
                  <Ionicons name="play" size={15} color="#fff" />
                </View>
              )}
            </View>
          ))}
          <TouchableOpacity style={styles.addMoreBtn} onPress={pickMedia}>
            <Ionicons name="add" size={30} color="#1E90FF" />
          </TouchableOpacity>
        </ScrollView>
      )}

      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.toolBtn} onPress={pickMedia}>
          <Ionicons name="images-outline" size={28} color="#1E90FF" />
          <Text style={styles.toolText}>Add Photos/Videos</Text>
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
        <Text style={styles.postButtonText}>
          {loading ? 'Uploading...' : 'Post'}
        </Text>
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
  },
  postingTo: { color: '#94A3B8' },
  leagueHighlight: { color: '#1E90FF', fontWeight: 'bold' },
  changeBtn: { color: '#1E90FF' },
  input: {
    color: '#fff',
    fontSize: 18,
    minHeight: 120,
    textAlignVertical: 'top',
  },

  // Media Styling
  mediaRow: { marginVertical: 15, flexDirection: 'row' },
  previewWrapper: { position: 'relative', marginRight: 12 },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 10,
    backgroundColor: '#162A3B',
  },
  removeBadge: { position: 'absolute', top: -10, right: -10 },
  playIcon: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    padding: 2,
  },
  addMoreBtn: {
    width: 100,
    height: 100,
    borderRadius: 10,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#1E90FF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  toolbar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 15,
    marginTop: 10,
  },
  toolBtn: { flexDirection: 'row', alignItems: 'center' },
  toolText: { color: '#1E90FF', marginLeft: 8, fontWeight: '600' },
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
