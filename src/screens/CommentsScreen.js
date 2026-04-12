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
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import CommentItem from '../components/CommentItem';

export default function CommentsScreen({ route }) {
  const { postId } = route.params;
  const [comments, setComments] = useState([]);
  const [postAuthorId, setPostAuthorId] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingComment, setEditingComment] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { theme } = useContext(ThemeContext);

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    try {
      const response = await api.get(`api/posts/${postId}/comments/`);
      setComments(response.data);
      if (response.data.length > 0)
        setPostAuthorId(response.data[0].post_author_id);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOrUpdate = async () => {
    if (!newComment.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (editingComment) {
        const response = await api.patch(`api/comments/${editingComment.id}/`, {
          content: newComment,
        });
        setComments(prev =>
          prev.map(c => (c.id === editingComment.id ? response.data : c)),
        );
        setEditingComment(null);
      } else {
        const response = await api.post(`api/posts/${postId}/comments/`, {
          content: newComment,
          post: postId,
        });
        setComments(prev => [response.data, ...prev]);
        if (route.params?.onCommentAdded) route.params.onCommentAdded();
      }
      setNewComment('');
    } catch (err) {
      Alert.alert('Error', 'Action failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
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
              No comments yet.
            </Text>
          }
        />
      )}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
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
              <Text style={[styles.send, { color: theme.colors.primary }]}>
                Post
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center' },
  inputRow: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
  },
  send: { fontWeight: 'bold', fontSize: 16 },
  empty: { textAlign: 'center', marginTop: 40 },
});
