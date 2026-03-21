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
  Image,
} from 'react-native';
import api from '../api/client';
import { AuthContext } from '../store/authStore';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// --- HELPER: TIME FORMATTING ---
const formatTimeAgo = dateString => {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return date.toLocaleDateString();
};

// --- CHILD COMPONENT: COMMENT ITEM ---
const CommentItem = ({ comment, postAuthorId, onDelete, onEdit }) => {
  const { user } = useContext(AuthContext);
  const author = comment.author_details;
  const support = comment.supporting_info; // 🚀 Team info

  const isCommentOwner = user?.id === author?.id;
  const isPostAuthor = author?.id === postAuthorId; // 🚀 Is this the person who made the post?
  const isLikedByAuthor = comment.liked_by_author || false;

  const handleLongPress = () => {
    if (!isCommentOwner) return;
    Alert.alert('Comment Options', 'Choose an action', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Edit', onPress: () => onEdit(comment) },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => onDelete(comment.id),
      },
    ]);
  };

  const renderContent = content => {
    const parts = content.split(/(@\w+)/g);
    return (
      <Text style={styles.commentBody}>
        {parts.map((part, index) => {
          if (part.startsWith('@')) {
            return (
              <Text key={index} style={styles.mentionText}>
                {part}
              </Text>
            );
          }
          return part;
        })}
      </Text>
    );
  };

  return (
    <TouchableOpacity onLongPress={handleLongPress} activeOpacity={0.8}>
      <View style={styles.commentContainer}>
        <Image
          source={{
            uri:
              author?.profile_pic ||
              `https://ui-avatars.com/api/?name=${author?.username || 'U'}`,
          }}
          style={styles.commentAvatar}
        />
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentUser}>{author?.username || 'User'}</Text>

            {/* 🚀 Team Badge */}
            {support?.team_name && (
              <View style={styles.teamBadge}>
                <Text style={styles.teamBadgeText}>{support.team_name}</Text>
              </View>
            )}

            {isPostAuthor && (
              <View style={styles.authorTag}>
                <Text style={styles.authorTagText}>Author</Text>
              </View>
            )}

            <Text style={styles.commentTime}>
              {formatTimeAgo(comment.created_at)}
            </Text>
          </View>

          {renderContent(comment.content)}

          <View style={styles.bottomRow}>
            <View style={styles.commentActions}>
              <TouchableOpacity style={styles.actionItem}>
                <MaterialCommunityIcons
                  name={comment.liked_by_me ? 'heart' : 'heart-outline'}
                  size={14}
                  color={comment.liked_by_me ? '#FF4B4B' : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.actionText,
                    comment.liked_by_me && { color: '#FF4B4B' },
                  ]}
                >
                  {comment.likes_count || 0}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionItem, { marginLeft: 20 }]}>
                <Text style={styles.actionText}>Reply</Text>
              </TouchableOpacity>
            </View>

            {isLikedByAuthor && (
              <View style={styles.authorLikeBadge}>
                <MaterialCommunityIcons
                  name="heart"
                  size={10}
                  color="#FF4B4B"
                />
                <Text style={styles.authorLikeText}>Liked by Author</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// --- MAIN SCREEN ---
export default function CommentsScreen({ route }) {
  const { postId } = route.params;
  const [comments, setComments] = useState([]);
  const [postAuthorId, setPostAuthorId] = useState(null); // 🚀 Store this to pass to children
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingComment, setEditingComment] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    try {
      const response = await api.get(`api/posts/${postId}/comments/`);
      setComments(response.data);
      // Assuming your backend returns the post owner's ID in the first comment or a separate field
      if (response.data.length > 0 && response.data[0].post_author_id) {
        setPostAuthorId(response.data[0].post_author_id);
      }
    } catch (err) {
      console.log('Fetch Error:', err);
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
        });
        setComments([response.data, ...comments]);
        if (route.params?.onCommentAdded) route.params.onCommentAdded();
      }
      setNewComment('');
    } catch (err) {
      Alert.alert('Error', 'Action failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async commentId => {
    try {
      await api.delete(`api/comments/${commentId}/`);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err) {
      Alert.alert('Error', 'Could not delete.');
    }
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1E90FF" />
        </View>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <CommentItem
              comment={item}
              postAuthorId={postAuthorId}
              onDelete={handleDelete}
              onEdit={c => {
                setEditingComment(c);
                setNewComment(c.content);
              }}
            />
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No comments yet.</Text>
          }
        />
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {editingComment && (
          <View style={styles.editIndicator}>
            <Text style={styles.editText}>Editing comment...</Text>
            <TouchableOpacity
              onPress={() => {
                setEditingComment(null);
                setNewComment('');
              }}
            >
              <MaterialCommunityIcons
                name="close-circle"
                size={18}
                color="#FF4B4B"
              />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Write a comment..."
            placeholderTextColor="#94A3B8"
            value={newComment}
            onChangeText={setNewComment}
            multiline
          />
          <TouchableOpacity
            onPress={handleSendOrUpdate}
            disabled={!newComment.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendText}>
                {editingComment ? 'Update' : 'Post'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1F2D' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  commentContainer: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1E293B',
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
  },
  commentContent: { flex: 1, marginLeft: 12 },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  commentUser: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  commentTime: { color: '#64748B', fontSize: 11, marginLeft: 'auto' },
  commentBody: { color: '#F1F5F9', fontSize: 14, lineHeight: 20 },
  mentionText: { color: '#1E90FF', fontWeight: 'bold' },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  commentActions: { flexDirection: 'row' },
  actionItem: { flexDirection: 'row', alignItems: 'center' },
  actionText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },

  // Badges
  teamBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
    borderWidth: 0.5,
    borderColor: '#334155',
  },
  teamBadgeText: { color: '#94A3B8', fontSize: 10, fontWeight: '600' },
  authorTag: {
    backgroundColor: '#1E90FF30',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  authorTagText: { color: '#1E90FF', fontSize: 9, fontWeight: 'bold' },
  authorLikeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF4B4B15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  authorLikeText: {
    color: '#FF4B4B',
    fontSize: 9,
    fontWeight: 'bold',
    marginLeft: 3,
  },

  // Input
  inputRow: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#162A3B',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  input: {
    flex: 1,
    color: '#fff',
    backgroundColor: '#0D1F2D',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
  },
  sendText: { color: '#1E90FF', fontWeight: 'bold', fontSize: 16 },
  editIndicator: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    paddingHorizontal: 15,
    paddingVertical: 6,
    justifyContent: 'space-between',
  },
  editText: { color: '#94A3B8', fontSize: 12, fontStyle: 'italic' },
  emptyText: { color: '#94A3B8', textAlign: 'center', marginTop: 40 },
});
