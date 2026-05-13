import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import api from '../api/client';
import { ThemeContext } from '../store/themeStore';
import CommentItem from '../components/CommentItem';

export default function CommentsScreen({ route }) {
  const { postId } = route.params;
  const [comments, setComments] = useState([]);
  const [postAuthorId, setPostAuthorId] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { theme } = useContext(ThemeContext);

  useEffect(() => {
    fetchComments();
  }, [postId]);

  /**
   * Fetch comments — handles both:
   *   • Cursor-paginated: { next, previous, results: [] }
   *   • Plain array: []
   */
  const fetchComments = async () => {
    setLoading(true);
    try {
      const response = await api.get(`api/posts/${postId}/comments/`);
      const { data } = response;

      if (Array.isArray(data)) {
        // Plain array response
        setComments(data);
        setNextCursor(null);
        if (data.length > 0) setPostAuthorId(data[0].post_author_id);
      } else {
        // Paginated response { results, next, previous }
        const results = data.results || [];
        setComments(results);
        setNextCursor(data.next || null);
        if (results.length > 0) setPostAuthorId(results[0].post_author_id);
      }
    } catch (err) {
      console.log('fetchComments error:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load next page when user scrolls to the bottom
   */
  const fetchMoreComments = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const response = await api.get(nextCursor); // nextCursor is a full URL
      const { data } = response;

      if (Array.isArray(data)) {
        setComments(prev => [...prev, ...data]);
        setNextCursor(null);
      } else {
        const results = data.results || [];
        setComments(prev => [...prev, ...results]);
        setNextCursor(data.next || null);
      }
    } catch (err) {
      console.log('fetchMoreComments error:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSendOrUpdate = async () => {
    if (!newComment.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (editingComment) {
        // Edit existing comment
        const response = await api.patch(`api/comments/${editingComment.id}/`, {
          content: newComment,
        });
        setComments(prev =>
          prev.map(c => (c.id === editingComment.id ? response.data : c)),
        );
        setEditingComment(null);
      } else {
        // Add new comment
        const response = await api.post(`api/posts/${postId}/comments/`, {
          content: newComment,
          post: postId,
        });
        // response.data is a single comment object — prepend it safely
        setComments(prev => [response.data, ...(Array.isArray(prev) ? prev : [])]);
        if (route.params?.onCommentAdded) route.params.onCommentAdded();
      }
      setNewComment('');
    } catch (err) {
      console.log('handleSendOrUpdate error:', err);
      Alert.alert('Error', 'Action failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelEdit = () => {
    setEditingComment(null);
    setNewComment('');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <CommentItem
              comment={item}
              postAuthorId={postAuthorId}
              onDeleteSuccess={id =>
                setComments(p => p.filter(c => c.id !== id))
              }
              onEditPress={c => {
                setEditingComment(c);
                setNewComment(c.content);
              }}
            />
          )}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: theme.colors.subText }]}>
              No comments yet. Be the first!
            </Text>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                size="small"
                color={theme.colors.primary}
                style={{ marginVertical: 12 }}
              />
            ) : null
          }
          onEndReached={fetchMoreComments}
          onEndReachedThreshold={0.4}
        />
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {/* Edit mode banner */}
        {editingComment && (
          <View style={[styles.editBanner, { backgroundColor: theme.colors.surface }]}>
            <Text style={{ color: theme.colors.subText, flex: 1 }}>
              Editing comment...
            </Text>
            <TouchableOpacity onPress={cancelEdit}>
              <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View
          style={[
            styles.inputRow,
            {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.border,
            },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              {
                color: theme.colors.text,
                backgroundColor: theme.colors.inputBackground,
              },
            ]}
            placeholder="Write a comment..."
            placeholderTextColor={theme.colors.subText}
            value={newComment}
            onChangeText={setNewComment}
            multiline
          />
          <TouchableOpacity
            onPress={handleSendOrUpdate}
            disabled={!newComment.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Text
                style={[
                  styles.send,
                  {
                    color: newComment.trim()
                      ? theme.colors.primary
                      : theme.colors.subText,
                  },
                ]}
              >
                {editingComment ? 'Save' : 'Post'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, paddingTop: 40 },
  centered:   { flex: 1, justifyContent: 'center', alignItems: 'center' },
  inputRow: {
    flexDirection:  'row',
    padding:        12,
    alignItems:     'center',
    borderTopWidth: 1,
  },
  input: {
    flex:             1,
    borderRadius:     20,
    paddingHorizontal: 15,
    paddingVertical:  8,
    marginRight:      10,
  },
  send:      { fontWeight: 'bold', fontSize: 16 },
  empty:     { textAlign: 'center', marginTop: 40 },
  editBanner: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal: 16,
    paddingVertical:  8,
    borderTopWidth:   1,
    borderTopColor:   '#eee',
  },
});