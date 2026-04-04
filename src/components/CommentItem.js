import React, { useContext } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Autolink from 'react-native-autolink';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../store/authStore';
import api from '../api/client';

const CommentItem = ({
  comment,
  postAuthorId,
  onDeleteSuccess,
  onEditPress,
}) => {
  const { user } = useContext(AuthContext);
  const navigation = useNavigation();

  // 🚀 Data from your new CommentSerializer logic
  const author = comment.author_details;
  const support = comment.supporting_info;

  const isCommentOwner = user?.id === author?.id;
  const isPostAuthor = author?.id === postAuthorId;
  const isLikedByMe = comment.liked_by_me || false;

  // 🚀 Profile Image with Absolute URI from Serializer or UI-Avatars fallback
  const profileImageUri = author?.profile_pic
    ? author.profile_pic
    : `https://ui-avatars.com/api/?name=${author?.username || 'U'}&background=162A3B&color=fff`;

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
      await api.delete(`api/posts/comments/${comment.id}/`);
      onDeleteSuccess(comment.id);
    } catch (err) {
      Alert.alert('Error', 'Could not delete comment.');
    }
  };

  const handleLike = async () => {
    try {
      // Logic for liking a comment goes here
      // await api.post(`api/posts/comments/${comment.id}/like/`);
    } catch (err) {
      console.log('Like error', err);
    }
  };

  return (
    <TouchableOpacity 
      onLongPress={handleLongPress} 
      activeOpacity={0.9}
    >
      <View style={styles.commentContainer}>
        {/* 🚀 Profile Image */}
        <TouchableOpacity onPress={() => navigation.navigate('Profile', { userId: author?.id })}>
          <Image source={{ uri: profileImageUri }} style={styles.commentAvatar} />
        </TouchableOpacity>

        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Profile', { userId: author?.id })}
            >
              <Text style={styles.commentUser}>
                {/* 🚀 Using display_name from Serializer */}
                {author?.display_name || author?.username || 'User'}
              </Text>
            </TouchableOpacity>

            {/* 🚀 Team Badge restored from supporting_info */}
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

          {/* 🚀 Autolink for Mentions and Hashtags */}
          <Autolink
            text={comment.content}
            style={styles.commentBody}
            linkStyle={styles.linkText}
            mention="twitter"
            hashtag="instagram"
            onPress={(url, match) => {
              if (match.getType() === 'mention') {
                const username = match.getAnchorText().replace('@', '');
                navigation.navigate('Profile', { username: username });
              } else if (match.getType() === 'hashtag') {
                const tag = match.getAnchorText();
                navigation.navigate('Search', { query: tag });
              } else {
                Linking.openURL(url);
              }
            }}
          />

          <View style={styles.bottomRow}>
            <View style={styles.commentActions}>
              <TouchableOpacity style={styles.miniAction} onPress={handleLike}>
                <MaterialCommunityIcons
                  name={isLikedByMe ? "heart" : "heart-outline"}
                  size={14}
                  color={isLikedByMe ? "#FF4B4B" : "#94A3B8"}
                />
                <Text style={[styles.actionText, isLikedByMe && { color: '#FF4B4B' }]}>
                  {comment.likes_count || 0}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.miniAction, { marginLeft: 20 }]}>
                <Text style={styles.actionText}>Reply</Text>
              </TouchableOpacity>
            </View>

            {/* 🚀 Notification that the post author liked this comment */}
            {comment.liked_by_author && (
              <View style={styles.authorLikeBadge}>
                <MaterialCommunityIcons name="heart" size={10} color="#FF4B4B" />
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
    borderBottomColor: '#162A3B',
    backgroundColor: '#050B10',
  },
  commentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1A2A3D',
  },
  commentContent: { flex: 1, marginLeft: 12 },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  commentUser: { color: '#fff', fontWeight: '700', fontSize: 14 },
  commentBody: { color: '#CBD5E1', fontSize: 14, lineHeight: 20 },
  linkText: { color: '#1E90FF', fontWeight: '600' },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  commentActions: { flexDirection: 'row', alignItems: 'center' },
  actionText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  miniAction: { flexDirection: 'row', alignItems: 'center' },
  teamBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 8,
    borderWidth: 0.5,
    borderColor: '#334155',
  },
  teamBadgeText: { color: '#94A3B8', fontSize: 10, fontWeight: '600' },
  tag: {
    backgroundColor: 'rgba(30, 144, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 8,
  },
  tagText: { color: '#1E90FF', fontSize: 9, fontWeight: 'bold' },
  authorLikeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 75, 75, 0.1)',
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