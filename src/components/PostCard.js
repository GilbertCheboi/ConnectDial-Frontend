/**
 * PostCard.js – Updated with VideoPlayer integration
 * Features:
 * • Uses new VideoPlayer for all video playback
 * • No autoplay on posts (prevents bandwidth waste)
 * • Streaming-ready video handling
 * • Supports both short-form and standard videos
 */

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
import VideoPlayer from './VideoPlayer';

const PostCard = ({
  post,
  onDeleteSuccess,
  onCommentPress,
  onLikePress,
  onSharePress,
}) => {
  const { user } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const navigation = useNavigation();

  const [isLiked, setIsLiked] = useState(post?.liked_by_me || false);
  const [likesCount, setLikesCount] = useState(post?.likes_count || 0);

  const author = post?.author_details;
  const supportInfo = post?.supporting_info;
  const isPostOwner = user?.id === author?.id;

  const profileImageUri =
    author?.profile_pic ||
    `https://ui-avatars.com/api/?name=${
      author?.username || 'U'
    }&background=162A3B&color=fff`;

  // ── Like Handler ─────────────────────────────────────────────────
  const handleLike = async () => {
    try {
      const response = await api.post(`/api/posts/${post.id}/like/`);
      setIsLiked(response.data.liked);
      setLikesCount(response.data.likes_count);

      if (onLikePress) {
        onLikePress(post.id, response.data.liked);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to like post');
    }
  };

  // ── Share Handler ────────────────────────────────────────────────
  const handleShare = async () => {
    if (onSharePress) {
      onSharePress(post.id);
    } else {
      try {
        await api.post(`/api/posts/${post.id}/share/`, {
          comment: '',
        });
      } catch (err) {
        Alert.alert('Error', 'Failed to share post');
      }
    }
  };

  // ── Delete Handler ───────────────────────────────────────────────
  const handleDelete = async () => {
    Alert.alert('Delete Post', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/posts/${post.id}/`);
            if (onDeleteSuccess) {
              onDeleteSuccess(post.id);
            }
          } catch (err) {
            Alert.alert('Error', 'Failed to delete post');
          }
        },
      },
    ]);
  };

  // ── Menu Handler ─────────────────────────────────────────────────
  const handleMenuPress = () => {
    const options = ['Cancel'];
    const actions = [];

    if (isPostOwner) {
      options.push('Edit', 'Delete');
      actions.push(
        () => navigation.navigate('EditPost', { postId: post.id }),
        handleDelete,
      );
    } else {
      options.push('Report', 'Block User');
      actions.push(
        () => Alert.alert('Reported', 'Thank you for reporting'),
        () => Alert.alert('Blocked', `You blocked @${author.username}`),
      );
    }

    Alert.alert('Options', '', [
      ...options.map((opt, idx) => ({
        text: opt,
        onPress: actions[idx] || null,
        style: idx === 0 || !isPostOwner ? 'cancel' : 'destructive',
      })),
    ]);
  };

  // ── Track video view (3 sec threshold) ────────────────────────────
  const handleVideoViewCount = async postId => {
    try {
      await api.post(`/api/posts/${postId}/view/`);
    } catch (err) {
      console.error('View tracking error:', err);
    }
  };

  // ── Render Video Posts ───────────────────────────────────────────
  if (post.post_type === 'video') {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('Profile', { userId: author?.id })
            }
          >
            <Image source={{ uri: profileImageUri }} style={styles.avatar} />
          </TouchableOpacity>

          <View style={styles.authorInfo}>
            <Text style={[styles.username, { color: theme.colors.text }]}>
              {author?.display_name || author?.username}
            </Text>

            {author?.badge_type && (
              <MaterialCommunityIcons
                name="check-decagram"
                size={12}
                color={author.badge_type === 'official' ? '#FFD700' : '#1DA1F2'}
                style={{ marginLeft: 4 }}
              />
            )}

            {supportInfo && (
              <Text
                style={[styles.supportText, { color: theme.colors.primary }]}
              >
                Supports {supportInfo.team_name}
              </Text>
            )}
          </View>

          <TouchableOpacity onPress={handleMenuPress}>
            <MaterialCommunityIcons
              name="dots-vertical"
              size={20}
              color={theme.colors.subText}
            />
          </TouchableOpacity>
        </View>

        {/* Video Player (no autoplay) */}
        <VideoPlayer
          videoUrl={post.media_url}
          isShort={post.is_short}
          postId={post.id}
          onViewCount={handleVideoViewCount}
          autoPlay={false}
          containerStyle={styles.videoContainer}
        />

        {/* Video Status Badge (if processing) */}
        {post.video_status === 'processing' && (
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: theme.colors.primary + '40' },
            ]}
          >
            <MaterialCommunityIcons
              name="sync"
              size={14}
              color={theme.colors.primary}
            />
            <Text style={[styles.statusText, { color: theme.colors.primary }]}>
              Processing...
            </Text>
          </View>
        )}

        {post.video_status === 'failed' && (
          <View
            style={[styles.statusBadge, { backgroundColor: '#FF5252' + '40' }]}
          >
            <MaterialCommunityIcons
              name="alert-circle"
              size={14}
              color="#FF5252"
            />
            <Text style={[styles.statusText, { color: '#FF5252' }]}>
              Failed to process
            </Text>
          </View>
        )}

        {/* Caption */}
        {post.content && (
          <View style={styles.contentSection}>
            <Autolink
              text={post.content}
              style={[styles.caption, { color: theme.colors.text }]}
              linkStyle={{ color: theme.colors.primary, fontWeight: '600' }}
              onPress={url => Linking.openURL(url)}
            />
          </View>
        )}

        {/* League & Team Info */}
        {(post.league_details || post.team_details) && (
          <View style={styles.leagueTeamInfo}>
            {post.league_details && (
              <View
                style={[
                  styles.leagueBadge,
                  { backgroundColor: theme.colors.primary + '20' },
                ]}
              >
                <Text
                  style={[styles.leagueName, { color: theme.colors.primary }]}
                >
                  {post.league_details.name}
                </Text>
              </View>
            )}

            {post.team_details && (
              <View
                style={[
                  styles.teamBadge,
                  { backgroundColor: theme.colors.primary + '20' },
                ]}
              >
                {post.team_details.logo && (
                  <Image
                    source={{ uri: post.team_details.logo }}
                    style={styles.teamLogo}
                  />
                )}
                <Text
                  style={[styles.teamName, { color: theme.colors.primary }]}
                >
                  {post.team_details.name}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Engagement Metrics */}
        <View
          style={[
            styles.metricsContainer,
            { borderTopColor: theme.colors.border },
          ]}
        >
          <Text style={[styles.metricText, { color: theme.colors.subText }]}>
            {post.view_count || 0} views
          </Text>
          <Text style={[styles.metricText, { color: theme.colors.subText }]}>
            {likesCount} likes
          </Text>
          <Text style={[styles.metricText, { color: theme.colors.subText }]}>
            {post.comments_count || 0} comments
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
            <MaterialCommunityIcons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={20}
              color={
                isLiked ? theme.colors.notificationBadge : theme.colors.subText
              }
            />
            <Text
              style={[
                styles.actionText,
                {
                  color: isLiked
                    ? theme.colors.notificationBadge
                    : theme.colors.subText,
                },
              ]}
            >
              {isLiked ? 'Liked' : 'Like'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onCommentPress && onCommentPress(post.id)}
          >
            <MaterialCommunityIcons
              name="comment-outline"
              size={20}
              color={theme.colors.subText}
            />
            <Text style={[styles.actionText, { color: theme.colors.subText }]}>
              Comment
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <MaterialCommunityIcons
              name="share-outline"
              size={20}
              color={theme.colors.subText}
            />
            <Text style={[styles.actionText, { color: theme.colors.subText }]}>
              Share
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Render Image/Text Posts (unchanged) ───────────────────────────
  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile', { userId: author?.id })}
        >
          <Image source={{ uri: profileImageUri }} style={styles.avatar} />
        </TouchableOpacity>

        <View style={styles.authorInfo}>
          <Text style={[styles.username, { color: theme.colors.text }]}>
            {author?.display_name || author?.username}
          </Text>
          {supportInfo && (
            <Text style={[styles.supportText, { color: theme.colors.primary }]}>
              Supports {supportInfo.team_name}
            </Text>
          )}
        </View>

        <TouchableOpacity onPress={handleMenuPress}>
          <MaterialCommunityIcons
            name="dots-vertical"
            size={20}
            color={theme.colors.subText}
          />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {post.content && (
        <Autolink
          text={post.content}
          style={[styles.caption, { color: theme.colors.text }]}
          linkStyle={{ color: theme.colors.primary, fontWeight: '600' }}
          onPress={url => Linking.openURL(url)}
        />
      )}

      {/* Image */}
      {post.media_url && post.post_type === 'image' && (
        <Image source={{ uri: post.media_url }} style={styles.postImage} />
      )}

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
          <MaterialCommunityIcons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={20}
            color={
              isLiked ? theme.colors.notificationBadge : theme.colors.subText
            }
          />
          <Text
            style={[
              styles.actionText,
              {
                color: isLiked
                  ? theme.colors.notificationBadge
                  : theme.colors.subText,
              },
            ]}
          >
            {likesCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onCommentPress && onCommentPress(post.id)}
        >
          <MaterialCommunityIcons
            name="comment-outline"
            size={20}
            color={theme.colors.subText}
          />
          <Text style={[styles.actionText, { color: theme.colors.subText }]}>
            {post.comments_count || 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <MaterialCommunityIcons
            name="share-outline"
            size={20}
            color={theme.colors.subText}
          />
          <Text style={[styles.actionText, { color: theme.colors.subText }]}>
            {post.shares_count || 0}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
  },
  authorInfo: {
    flex: 1,
    marginLeft: 10,
  },
  username: {
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 2,
  },
  supportText: {
    fontSize: 12,
    fontWeight: '500',
  },
  contentSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  caption: {
    paddingHorizontal: 16,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
    marginBottom: 12,
  },
  videoContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 8,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  leagueTeamInfo: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  leagueBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  leagueName: {
    fontSize: 12,
    fontWeight: '600',
  },
  teamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  teamLogo: {
    width: 14,
    height: 14,
    borderRadius: 2,
  },
  teamName: {
    fontSize: 12,
    fontWeight: '600',
  },
  metricsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 0.5,
    marginVertical: 8,
    gap: 20,
  },
  metricText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  actionText: {
    fontWeight: '600',
    fontSize: 12,
  },
});

export default PostCard;
