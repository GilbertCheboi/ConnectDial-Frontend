import React, { useEffect, useState, useContext, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api, { BASE_URL } from '../api/client';
import { ThemeContext } from '../store/themeStore';

export default function EditPostScreen({ route, navigation }) {
  const { theme } = useContext(ThemeContext) || {};

  const {
    postId,
    onSave,
    refreshFeed,
  } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [content, setContent] = useState('');
  const [media, setMedia] = useState(null);
  const [post, setPost] = useState(null);

  const colors = theme?.colors || {
    background: '#0A1624',
    card: '#112634',
    text: '#F8FAFC',
    subText: '#94A3B8',
    primary: '#1E90FF',
    border: '#1E293B',
  };

  // ─── FETCH POST ─────────────────────────────────────────────
  const fetchPost = useCallback(async () => {
    try {
      setLoading(true);

      const res = await api.get(`api/posts/${postId}/`);
      const data = res.data;

      setPost(data);
      setContent(data.content || '');

      // handle media preview
      if (data.media_files?.length > 0) {
        setMedia(data.media_files[0]);
      } else if (data.media_file) {
        setMedia(data.media_file);
      }

    } catch (err) {
      console.log(err);
      Alert.alert('Error', 'Failed to load post');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  // ─── SAVE (PATCH) ───────────────────────────────────────────
  const handleSave = async () => {
    if (!content.trim()) {
      Alert.alert('Empty', 'Post cannot be empty');
      return;
    }

    try {
      setSaving(true);

      const res = await api.patch(`api/posts/${postId}/`, {
        content,
      });

      if (onSave) onSave(res.data);
      if (refreshFeed) refreshFeed();

      Alert.alert('Success', 'Post updated');

      navigation.goBack();

    } catch (err) {
      console.log(err.response?.data || err);
      Alert.alert('Error', 'Failed to update post');
    } finally {
      setSaving(false);
    }
  };

  // ─── LOADING STATE ──────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Edit Post
        </Text>
      </View>

      {/* Content Input */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <TextInput
          value={content}
          onChangeText={setContent}
          multiline
          placeholder="Edit your post..."
          placeholderTextColor={colors.subText}
          style={[styles.input, { color: colors.text }]}
        />
      </View>

      {/* Media Preview */}
      {media && (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.subText }]}>
            Media Preview
          </Text>

          <Image
            source={{
              uri: typeof media === 'string'
                ? `${BASE_URL}${media}`
                : media.uri,
            }}
            style={styles.media}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Save Button */}
      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: colors.primary },
          saving && { opacity: 0.7 },
        ]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="checkmark" size={18} color="#fff" />
            <Text style={styles.buttonText}>Update Post</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── STYLES (MATCH YOUR APP DESIGN SYSTEM) ─────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  header: {
    marginBottom: 15,
  },

  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },

  card: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 15,
  },

  input: {
    fontSize: 16,
    minHeight: 140,
    textAlignVertical: 'top',
    lineHeight: 22,
  },

  label: {
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '600',
  },

  media: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    backgroundColor: '#000',
  },

  button: {
    marginTop: 10,
    padding: 14,
    borderRadius: 30,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },

  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});