import React, { useContext } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { AuthContext } from '../store/authStore';
import api from '../api/client';

const CommentItem = ({
  comment,
  postAuthorId,
  onDeleteSuccess,
  onEditPress,
  navigation,
}) => {
  const { user } = useContext(AuthContext);
  const author = comment.author_details;

  // 🚀 RESTORED: Team Info from supporting_info
  const support = comment.supporting_info;

  const isCommentOwner = user?.id === author?.id;
  const isPostAuthor = author?.id === postAuthorId;
  const isLikedByAuthor = comment.liked_by_author || false;

  const handleLongPress = () => {
    if (!isCommentOwner) return;
    Alert.alert('Comment Options', 'Select an action', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Edit', onPress: () => onEditPress(comment) },
      { text: 'Delete', style: 'destructive', onPress: confirmDelete },
    ]);
  };

  const confirmDelete = async () => {
    try {
      // 🚀 Use the direct /comments/ path we fixed in the router
      await api.delete(`api/posts/comments/${comment.id}/`);
      onDeleteSuccess(comment.id);
    } catch (err) {
      Alert.alert('Error', 'Could not delete comment.');
    }
  };

  const renderContent = content => {
    const parts = content.split(/(@\w+)/g);
    return (
      <Text style={styles.commentBody}>
        {parts.map((part, index) => {
          if (part.startsWith('@')) {
            return (
              <Text
                key={index}
                style={styles.mentionText}
                onPress={() => console.log('Navigate to profile:', part)}
              >
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

            {/* 🚀 RESTORED: Team Badge */}
            {support?.team_name && (
              <View style={styles.teamBadge}>
                <Text style={styles.teamBadgeText}>{support.team_name}</Text>
              </View>
            )}

            {isPostAuthor && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>Author</Text>
              </View>
            )}
          </View>

          {renderContent(comment.content)}

          <View style={styles.bottomRow}>
            <View style={styles.commentActions}>
              <TouchableOpacity style={styles.miniAction}>
                <MaterialCommunityIcons
                  name="heart-outline"
                  size={14}
                  color="#94A3B8"
                />
                <Text style={styles.actionText}>
                  {comment.likes_count || 0}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.miniAction, { marginLeft: 20 }]}>
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

const styles = StyleSheet.create({
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
    backgroundColor: '#1A2A3D',
  },
  commentContent: { flex: 1, marginLeft: 12 },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  commentUser: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  commentBody: { color: '#F1F5F9', fontSize: 14, lineHeight: 20 },
  mentionText: { color: '#1E90FF', fontWeight: 'bold' },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  commentActions: { flexDirection: 'row' },
  actionText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  miniAction: { flexDirection: 'row', alignItems: 'center' },

  // 🚀 RESTORED: Team Badge Style
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

  tag: {
    backgroundColor: '#1E90FF30',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  tagText: { color: '#1E90FF', fontSize: 9, fontWeight: 'bold' },

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
});

export default CommentItem;
