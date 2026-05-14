import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';

import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useRoute } from '@react-navigation/native';

import api from '../api/client';
import PostCard from '../components/PostCard';
import CommentItem from '../components/CommentItem';
import { ThemeContext } from '../store/themeStore';

export default function PostDetailScreen() {
  const route = useRoute();
  const { theme } = useContext(ThemeContext) || {
    theme: {
      colors: {
        background: '#0D1F2D',
        surface: '#0D1F2D',
        card: '#112634',
        text: '#F8FAFC',
        subText: '#94A3B8',
        border: '#1E293B',
        primary: '#1E90FF',
        secondary: '#64748B',
        inputBackground: '#112634',
      },
    },
  };

  const postId = route.params?.postId || route.params?.id;

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPostData = useCallback(async () => {
    if (!postId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      console.log('🔍 Loading post:', postId);

      const postResponse = await api.get(`api/posts/${postId}/`);

      let commentsResponse = null;

      try {
        commentsResponse = await api.get(`api/posts/${postId}/comments/`);
      } catch (err) {
        console.log('⚠️ Comments fetch failed:', err?.response?.data);
      }

      const postData = postResponse?.data || {};

      let commentsData = [];
      if (Array.isArray(commentsResponse?.data)) {
        commentsData = commentsResponse.data;
      } else if (Array.isArray(commentsResponse?.data?.results)) {
        commentsData = commentsResponse.data.results;
      }

      setPost(postData);
      setComments(commentsData);
    } catch (error) {
      console.log('❌ Post detail error:', error?.response?.data || error.message);
      Alert.alert('Error', 'Failed to load post.');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchPostData();
  }, [fetchPostData]);

  const submitComment = async () => {
    const trimmed = newComment.trim();
    if (!trimmed) return;

    try {
      setIsSubmitting(true);

      console.log('▶️ Posting comment to: api/posts/' + postId + '/comments/');

      const response = await api.post(
        `api/posts/${postId}/comments/`,
        { content: trimmed }
      );

      console.log('✅ Comment posted:', response.data);

      setComments(prev => [response.data, ...prev]);
      setPost(prev => ({
        ...prev,
        comments_count: (prev?.comments_count || 0) + 1,
      }));
      setNewComment('');

    } catch (error) {
      const status = error?.response?.status;
      const data   = error?.response?.data;

      console.log('❌ Comment error | status:', status);
      console.log('❌ Comment error | body  :', JSON.stringify(data, null, 2));

      // ── Fallback: old CommentViewSet still active on server (urls.py not yet deployed)
      // It intercepts the route and demands 'post' in the body.
      // Retry with post ID included — this bridges the gap until backend is updated.
      if (status === 400 && data?.post) {
        console.log('🔄 Retrying with post field in body (deploy urls.py fix to resolve permanently)...');
        try {
          const retryResponse = await api.post(
            `api/posts/${postId}/comments/`,
            { content: trimmed, post: postId }
          );
          console.log('✅ Retry succeeded:', retryResponse.data);
          setComments(prev => [retryResponse.data, ...prev]);
          setPost(prev => ({
            ...prev,
            comments_count: (prev?.comments_count || 0) + 1,
          }));
          setNewComment('');
          return;
        } catch (retryError) {
          console.log('❌ Retry also failed:', retryError?.response?.data);
        }
      }

      // ── Show a meaningful error to the user ──────────────────────────
      let userMessage = 'Could not post comment.';
      if (status === 401) {
        userMessage = 'You must be logged in to comment.';
      } else if (status === 403) {
        userMessage = 'You do not have permission to comment on this post.';
      } else if (status === 400) {
        const detail =
          data?.detail ||
          data?.content?.[0] ||
          data?.non_field_errors?.[0] ||
          JSON.stringify(data);
        userMessage = `Validation error: ${detail}`;
      } else if (status >= 500) {
        userMessage = 'Server error. Please try again later.';
      }

      Alert.alert('Error', userMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.text }}>Post not found.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          data={comments}
          keyExtractor={(item, index) => (item?.id || index).toString()}
          ListHeaderComponent={<PostCard post={post} />}
          renderItem={({ item }) => (
            <CommentItem
              comment={item}
              postAuthorId={post?.author_details?.id}
              onDeleteSuccess={(id) => {
                setComments(prev => prev.filter(c => c.id !== id));
                setPost(prev => ({
                  ...prev,
                  comments_count: (prev?.comments_count || 1) - 1,
                }));
              }}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name="comment-outline"
                size={60}
                color={theme.colors.secondary}
              />
              <Text style={[styles.emptyText, { color: theme.colors.text }]}>No comments yet.</Text>
              <Text style={[styles.emptySubtext, { color: theme.colors.subText }]}>Be the first to comment.</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 120 }}
        />

        <View style={[styles.footer, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.inputBackground, color: theme.colors.text }]}
            value={newComment}
            onChangeText={setNewComment}
            placeholder="Write a comment..."
            placeholderTextColor={theme.colors.subText}
            multiline
          />

          <TouchableOpacity
            onPress={submitComment}
            disabled={isSubmitting}
            style={[
              styles.sendBtn,
              { backgroundColor: theme.colors.primary, opacity: isSubmitting || !newComment.trim() ? 0.5 : 1 },
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color={theme.colors.buttonText} />
            ) : (
              <MaterialCommunityIcons name="send" size={22} color={theme.colors.buttonText} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySubtext: {
    marginTop: 6,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 120,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});