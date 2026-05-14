import React, { useContext, useState } from 'react';
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
import { ThemeContext } from '../store/themeStore';
import api from '../api/client';

const CommentItem = ({
  comment,
  postAuthorId,
  onDeleteSuccess,
  onEditPress,
  onReplyPress,
  refreshComments,
}) => {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);

  const [isLiking, setIsLiking] = useState(false);

  // Backend compatibility
  const author =
    comment?.author_details ||
    comment?.user_details ||
    comment?.author ||
    comment?.user;

  const support = comment?.supporting_info;

  const isCommentOwner = user?.id === author?.id;
  const isPostAuthor = author?.id === postAuthorId;

  const isLikedByMe = comment?.liked_by_me || false;

  const profileImageUri =
    author?.profile_pic ||
    `https://ui-avatars.com/api/?name=${
      author?.username || 'U'
    }&background=162A3B&color=fff`;

  // ─────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────

  const confirmDelete = async () => {
    try {
      await api.delete(`api/posts/comments/${comment.id}/`);
      onDeleteSuccess(comment.id);
    } catch (err) {
      Alert.alert('Error', 'Could not delete comment.');
    }
  };

  // ─────────────────────────────────────────────
  // LIKE / UNLIKE
  // ─────────────────────────────────────────────

  const handleLike = async () => {
    if (isLiking) return;

    setIsLiking(true);

    try {
      if (isLikedByMe) {
        await api.delete(`api/posts/comments/${comment.id}/like/`);
      } else {
        await api.post(`api/posts/comments/${comment.id}/like/`);
      }

      refreshComments?.();
    } catch (err) {
      console.log('Comment like failed', err);
    } finally {
      setIsLiking(false);
    }
  };

  // ─────────────────────────────────────────────
  // LONG PRESS MENU
  // ─────────────────────────────────────────────

  const handleLongPress = () => {
    if (!isCommentOwner) return;

    Alert.alert('Options', 'Select action', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Edit', onPress: () => onEditPress(comment) },
      { text: 'Delete', style: 'destructive', onPress: confirmDelete },
    ]);
  };

  return (
    <TouchableOpacity onLongPress={handleLongPress} activeOpacity={0.95}>
      <View
        style={[
          styles.container,
          { borderBottomColor: theme.colors.border },
        ]}
      >
        {/* Avatar */}
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('Profile', {
              userId: author?.id,
            })
          }
        >
          <Image source={{ uri: profileImageUri }} style={styles.avatar} />
        </TouchableOpacity>

        {/* Content */}
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text
              style={[
                styles.username,
                { color: theme.colors.text },
              ]}
            >
              {author?.display_name ||
                author?.username ||
                'User'}
            </Text>

            {/* Verified badges */}
            {author?.badge_type === 'official' && (
              <MaterialCommunityIcons
                name="check-decagram"
                size={14}
                color="#FFD700"
                style={styles.badge}
              />
            )}

            {author?.badge_type === 'verified' && (
              <MaterialCommunityIcons
                name="check-decagram"
                size={14}
                color="#1DA1F2"
                style={styles.badge}
              />
            )}

            {/* Team/org */}
            {(support?.team_name ||
              ['news', 'organization'].includes(
                author?.account_type
              )) && (
              <View
                style={[
                  styles.teamBadge,
                  {
                    backgroundColor:
                      theme.colors.primary + '20',
                    borderColor: theme.colors.primary,
                  },
                ]}
              >
                {support?.team_name && (
                  <Text
                    style={[
                      styles.teamBadgeText,
                      { color: theme.colors.primary },
                    ]}
                  >
                    {support.team_name}
                  </Text>
                )}

                <Text
                  style={[
                    styles.typeLabel,
                    { color: theme.colors.subText },
                  ]}
                >
                  {author?.account_type === 'news'
                    ? ' • News'
                    : author?.account_type ===
                      'organization'
                    ? ' • Org'
                    : ' • Fan'}
                </Text>
              </View>
            )}

            {/* Post author */}
            {isPostAuthor && (
              <View
                style={[
                  styles.tag,
                  {
                    backgroundColor:
                      theme.colors.primary,
                  },
                ]}
              >
                <Text style={styles.tagText}>
                  Author
                </Text>
              </View>
            )}
          </View>

          {/* Comment body */}
          <Autolink
            text={comment?.content || ''}
            style={[
              styles.body,
              { color: theme.colors.text },
            ]}
            linkStyle={{
              color: theme.colors.primary,
              fontWeight: '600',
            }}
            onPress={url => Linking.openURL(url)}
          />

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.actionRow}>

              {/* LIKE */}
              <TouchableOpacity
                style={styles.action}
                onPress={handleLike}
              >
                <MaterialCommunityIcons
                  name={
                    isLikedByMe
                      ? 'heart'
                      : 'heart-outline'
                  }
                  size={15}
                  color={
                    isLikedByMe
                      ? theme.colors.notificationBadge
                      : theme.colors.subText
                  }
                />

                <Text
                  style={[
                    styles.footerText,
                    {
                      color: theme.colors.subText,
                    },
                  ]}
                >
                  {comment?.likes_count || 0}
                </Text>
              </TouchableOpacity>

              {/* REPLY */}
              <TouchableOpacity
                style={[
                  styles.action,
                  { marginLeft: 20 },
                ]}
                onPress={() => onReplyPress(comment)}
              >
                <Text
                  style={[
                    styles.footerText,
                    {
                      color: theme.colors.subText,
                    },
                  ]}
                >
                  Reply
                </Text>
              </TouchableOpacity>

              {/* REPLIES COUNT */}
              {(comment?.replies_count || 0) > 0 && (
                <View style={{ marginLeft: 20 }}>
                  <Text
                    style={[
                      styles.footerText,
                      {
                        color: theme.colors.primary,
                      },
                    ]}
                  >
                    {comment.replies_count} replies
                  </Text>
                </View>
              )}
            </View>

            {/* liked by author */}
            {comment?.liked_by_author && (
              <View style={styles.authorLikeRow}>
                <MaterialCommunityIcons
                  name="heart"
                  size={10}
                  color={
                    theme.colors.notificationBadge
                  }
                />

                <Text
                  style={[
                    styles.authorLikeText,
                    {
                      color:
                        theme.colors.notificationBadge,
                    },
                  ]}
                >
                  Liked by Author
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 0.5,
  },

  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1E293B',
  },

  content: {
    flex: 1,
    marginLeft: 12,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },

  username: {
    fontWeight: '700',
    fontSize: 14,
  },

  badge: {
    marginLeft: 3,
  },

  body: {
    fontSize: 14,
    lineHeight: 20,
  },

  footer: {
    flexDirection: 'row',
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  action: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  footerText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },

  teamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 8,
    borderWidth: 0.5,
  },

  teamBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  typeLabel: {
    fontSize: 9,
    fontWeight: '600',
    marginLeft: 2,
  },

  tag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 8,
  },

  tagText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FFF',
  },

  authorLikeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  authorLikeText: {
    fontSize: 9,
    fontWeight: 'bold',
    marginLeft: 3,
  },
});

export default CommentItem;