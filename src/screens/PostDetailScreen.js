import React, { useState, useEffect, useCallback } from 'react';
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

export default function PostDetailScreen() {
  const route = useRoute();

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
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1E90FF" />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: '#fff' }}>Post not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
                color="#64748B"
              />
              <Text style={styles.emptyText}>No comments yet.</Text>
              <Text style={styles.emptySubtext}>Be the first to comment.</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 120 }}
        />

        <View style={styles.footer}>
          <TextInput
            style={styles.input}
            value={newComment}
            onChangeText={setNewComment}
            placeholder="Write a comment..."
            placeholderTextColor="#94A3B8"
            multiline
          />

          <TouchableOpacity
            onPress={submitComment}
            disabled={isSubmitting}
            style={[
              styles.sendBtn,
              { opacity: isSubmitting || !newComment.trim() ? 0.5 : 1 },
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <MaterialCommunityIcons name="send" size={22} color="#fff" />
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
    backgroundColor: '#0D1F2D',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0D1F2D',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySubtext: {
    color: '#94A3B8',
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
    backgroundColor: '#112634',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  input: {
    flex: 1,
    backgroundColor: '#0D1F2D',
    color: '#fff',
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
    backgroundColor: '#1E90FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});