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

  // ── Optimistic like state so UI responds instantly ──
  const [liked, setLiked] = useState(comment?.liked_by_me || false);
  const [likesCount, setLikesCount] = useState(comment?.likes_count || 0);
  const [isLiking, setIsLiking] = useState(false);

  // ── Optimistic repost state ──
  const [reposted, setReposted] = useState(false);
  const [isReposting, setIsReposting] = useState(false);

  // Backend compatibility — author field may come under several keys
  const author =
    comment?.author_details ||
    comment?.user_details ||
    comment?.author ||
    comment?.user;

  const support = comment?.supporting_info;

  const isCommentOwner = user?.id === author?.id;
  const isPostAuthor = author?.id === postAuthorId;

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
  // LIKE / UNLIKE  (optimistic UI)
  // ─────────────────────────────────────────────

  const handleLike = async () => {
    if (isLiking) return;

    // Optimistic update
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikesCount(prev => wasLiked ? Math.max(0, prev - 1) : prev + 1);
    setIsLiking(true);

    try {
      if (wasLiked) {
        await api.delete(`api/posts/comments/${comment.id}/like/`);
      } else {
        await api.post(`api/posts/comments/${comment.id}/like/`);
      }
      // Optionally sync server count, but optimistic is fine for UX
      refreshComments?.();
    } catch (err) {
      // Revert on failure
      setLiked(wasLiked);
      setLikesCount(prev => wasLiked ? prev + 1 : Math.max(0, prev - 1));
      console.log('Comment like failed', err?.response?.data || err);
    } finally {
      setIsLiking(false);
    }
  };

  // ─────────────────────────────────────────────
  // REPOST / SHARE
  // ─────────────────────────────────────────────

  const handleRepost = async () => {
    if (isReposting || reposted) return;

    setIsReposting(true);
    try {
      await api.post(`api/posts/comments/${comment.id}/repost/`);
      setReposted(true);
    } catch (err) {
      console.log('Comment repost failed', err?.response?.data || err);
      Alert.alert('Error', 'Could not repost comment.');
    } finally {
      setIsReposting(false);
    }
  };

  // ─────────────────────────────────────────────
  // LONG PRESS MENU (owner only)
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
        {/* ── Avatar ── */}
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('Profile', { userId: author?.id })
          }
        >
          <Image source={{ uri: profileImageUri }} style={styles.avatar} />
        </TouchableOpacity>

        {/* ── Content ── */}
        <View style={styles.content}>

          {/* Header row */}
          <View style={styles.header}>
            <Text style={[styles.username, { color: theme.colors.text }]}>
              {author?.display_name || author?.username || 'User'}
            </Text>

            {/* Verified badge */}
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

            {/* Team/org badge */}
            {(support?.team_name ||
              ['news', 'organization'].includes(author?.account_type)) && (
              <View
                style={[
                  styles.teamBadge,
                  {
                    backgroundColor: theme.colors.primary + '20',
                    borderColor: theme.colors.primary,
                  },
                ]}
              >
                {support?.team_name && (
                  <Text style={[styles.teamBadgeText, { color: theme.colors.primary }]}>
                    {support.team_name}
                  </Text>
                )}
                <Text style={[styles.typeLabel, { color: theme.colors.subText }]}>
                  {author?.account_type === 'news'
                    ? ' • News'
                    : author?.account_type === 'organization'
                    ? ' • Org'
                    : ' • Fan'}
                </Text>
              </View>
            )}

            {/* Author badge */}
            {isPostAuthor && (
              <View style={[styles.tag, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.tagText}>Author</Text>
              </View>
            )}
          </View>

          {/* Comment body */}
          <Autolink
            text={comment?.content || ''}
            style={[styles.body, { color: theme.colors.text }]}
            linkStyle={{ color: theme.colors.primary, fontWeight: '600' }}
            onPress={url => Linking.openURL(url)}
          />

          {/* Footer actions */}
          <View style={styles.footer}>
            <View style={styles.actionRow}>

              {/* LIKE */}
              <TouchableOpacity style={styles.action} onPress={handleLike}>
                <MaterialCommunityIcons
                  name={liked ? 'heart' : 'heart-outline'}
                  size={15}
                  color={liked ? theme.colors.notificationBadge : theme.colors.subText}
                />
                <Text style={[styles.footerText, { color: theme.colors.subText }]}>
                  {likesCount}
                </Text>
              </TouchableOpacity>

              {/* REPOST */}
              <TouchableOpacity
                style={[styles.action, { marginLeft: 16 }]}
                onPress={handleRepost}
                disabled={isReposting || reposted}
              >
                <MaterialCommunityIcons
                  name="repeat"
                  size={15}
                  color={
                    reposted
                      ? theme.colors.primary
                      : theme.colors.subText
                  }
                />
                {reposted && (
                  <Text style={[styles.footerText, { color: theme.colors.primary }]}>
                    Reposted
                  </Text>
                )}
              </TouchableOpacity>

              {/* REPLY */}
              <TouchableOpacity
                style={[styles.action, { marginLeft: 16 }]}
                onPress={() => onReplyPress?.(comment)}
              >
                <MaterialCommunityIcons
                  name="reply-outline"
                  size={15}
                  color={theme.colors.subText}
                />
                <Text style={[styles.footerText, { color: theme.colors.subText }]}>
                  Reply
                </Text>
              </TouchableOpacity>

              {/* REPLIES COUNT */}
              {(comment?.replies_count || 0) > 0 && (
                <View style={{ marginLeft: 12 }}>
                  <Text style={[styles.footerText, { color: theme.colors.primary }]}>
                    {comment.replies_count} replies
                  </Text>
                </View>
              )}
            </View>

            {/* Liked by author badge */}
            {comment?.liked_by_author && (
              <View style={styles.authorLikeRow}>
                <MaterialCommunityIcons
                  name="heart"
                  size={10}
                  color={theme.colors.notificationBadge}
                />
                <Text style={[styles.authorLikeText, { color: theme.colors.notificationBadge }]}>
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
  badge: { marginLeft: 3 },
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