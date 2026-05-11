/**
 * PostCard.js - Updated with Smart Share Feature
 * Includes: Screenshot capture + Native Share (WhatsApp, Telegram, etc.)
 */

import React, { useState, useContext, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Video from 'react-native-video';
import Autolink from 'react-native-autolink';
import Share from 'react-native-share';
import ViewShot from 'react-native-view-shot';
import { captureRef } from 'react-native-view-shot';

import { AuthContext } from '../store/authStore';
import { useFollow } from '../store/FollowContext';
import api from '../api/client';
import { useNavigation } from '@react-navigation/native';
import { ThemeContext } from '../store/themeStore';

const { width } = Dimensions.get('window');

const formatTimeAgo = dateString => {
  if (!dateString) return '';
  const now = new Date();
  const postDate = new Date(dateString);
  const diffInSeconds = Math.floor((now - postDate) / 1000);
  if (diffInSeconds < 60) return 'now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  return postDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const PostCard = ({ post, onDeleteSuccess, onEditPress, onCommentPress }) => {
  const { user } = useContext(AuthContext);
  const { followingIds, updateFollowStatus } = useFollow();
  const navigation = useNavigation();
  const postRef = useRef(null); // For screenshot

  const [isExpanded, setIsExpanded] = useState(false);
  const TEXT_LIMIT = 180;
  const shouldTruncate = post.content?.length > TEXT_LIMIT;

  const { theme } = useContext(ThemeContext) || {
    theme: {
      colors: {
        background: '#0A1624',
        surface: '#0D1F2D',
        card: '#112634',
        text: '#F8FAFC',
        subText: '#94A3B8',
        border: '#1E293B',
        primary: '#1E90FF',
        secondary: '#64748B',
        notificationBadge: '#FF4B4B',
      },
    },
  };

  const originalData = post.original_post;
  const isSimpleRepost = !!originalData && !post.content;
  const author = post.author_details;
  const support = post.supporting_info;
  const isOwner = user?.id === author?.id;

  const isFollowing =
    followingIds.has(author?.id) ||
    (author?.is_following && !followingIds.has(-author?.id));

  const [liked, setLiked] = useState(post.liked_by_me || false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [userPaused, setUserPaused] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      setUserPaused(true);
    });
    return unsubscribe;
  }, [navigation]);

  const getMediaSource = path => {
    if (!path) return null;
    return path.startsWith('http')
      ? { uri: path }
      : { uri: `https://api.connectdial.com/${path}` };
  };

  // ==================== SMART SHARE FUNCTION ====================
  const handleShare = async () => {
    try {
      // Capture screenshot of the post
      const uri = await captureRef(postRef, {
        format: 'png',
        quality: 0.92,
        result: 'tmpfile',
      });

      const shareLink = `https://connectdial.app/post/${post.id}`; // Update with your real domain

      const message = `Check out this post on ConnectDial 🔥\n\n${post.content?.substring(0, 140)}${post.content?.length > 140 ? '...' : ''}\n\n${shareLink}`;

      const shareOptions = {
        title: 'Share Post',
        message: message,
        url: uri,
        type: 'image/png',
        failOnCancel: false,
      };

      await Share.open(shareOptions);
    } catch (error) {
      console.log('Share error:', error);
      if (error.message !== 'User did not share') {
        Alert.alert('Share Failed', 'Could not share this post at the moment.');
      }
    }
  };

  const handleFollowToggle = async () => {
    if (followLoading) return;
    const previousState = isFollowing;
    const authorId = author?.id;
    setFollowLoading(true);
    updateFollowStatus(authorId, !previousState);
    try {
      const response = await api.post(`auth/users/${authorId}/toggle-follow/`);
      updateFollowStatus(authorId, response.data.following);
    } catch (err) {
      updateFollowStatus(authorId, previousState);
      Alert.alert('Error', 'Could not update follow status.');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleRepostPress = () => {
    Alert.alert('Share Post', 'Choose how to share this', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Repost',
        onPress: async () => {
          try {
            await api.post(`api/posts/${post.id}/repost/`);
            Alert.alert('Success', 'Reposted to your feed!');
          } catch (err) {
            Alert.alert('Error', 'Could not repost.');
          }
        },
      },
      {
        text: 'Quote Post',
        onPress: () => {
          navigation.navigate('CreatePost', {
            quoteMode: true,
            parentPost: post,
          });
        },
      },
    ]);
  };

  const handleMenuPress = () => {
    const options = [{ text: 'Cancel', style: 'cancel' }];

    if (isOwner) {
      options.push(
        { text: 'Edit Post', onPress: () => onEditPress?.(post) },
        {
          text: 'Delete Post',
          style: 'destructive',
          onPress: confirmDelete,
        },
      );
    } else {
      options.push({
        text: 'Report Post',
        onPress: () => Alert.alert('Reported', 'Thank you for reporting.'),
      });
    }
    Alert.alert('Post Options', 'Select an action', options);
  };

  const confirmDelete = () => {
    Alert.alert('Delete Post', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`api/posts/${post.id}/`);
            onDeleteSuccess?.(post.id);
          } catch (err) {
            Alert.alert('Error', 'Failed to delete');
          }
        },
      },
    ]);
  };

  const isVideo = path => {
    if (!path) return false;
    const lower = path.toLowerCase();
    return (
      lower.endsWith('.mp4') ||
      lower.endsWith('.mov') ||
      lower.endsWith('.webm') ||
      lower.includes('video')
    );
  };

  return (
    <ViewShot ref={postRef} options={{ format: 'png', quality: 0.92 }}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
          },
        ]}
      >
        {/* Repost Indicator */}
        {isSimpleRepost && (
          <View style={styles.repostIndicator}>
            <MaterialCommunityIcons name="repeat" size={16} color={theme.colors.secondary} />
            <Text style={[styles.repostUserText, { color: theme.colors.secondary }]}>
              {author?.display_name || author?.username} reposted
            </Text>
          </View>
        )}

        {/* Top Header */}
        <View style={styles.topHeader}>
          <View style={[styles.leagueTag, { backgroundColor: theme.colors.primary + '20' }]}>
            <MaterialCommunityIcons name="trophy-variant" size={12} color={theme.colors.primary} />
            <Text style={[styles.leagueHeaderText, { color: theme.colors.primary }]}>
              {support?.league_name || 'Global'}
            </Text>
          </View>
          <View style={styles.rightActions}>
            <Text style={[styles.timestamp, { color: theme.colors.subText }]}>
              {formatTimeAgo(post.created_at)}
            </Text>
            <TouchableOpacity onPress={handleMenuPress} style={styles.menuIconButton}>
              <MaterialCommunityIcons name="dots-horizontal" size={22} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Author Section */}
        <View style={styles.authorSection}>
          <TouchableOpacity
            onPress={() => navigation.push('Profile', { userId: author?.id })}
            style={{ flexDirection: 'row', flex: 1, alignItems: 'center' }}
          >
            <Image
              source={{
                uri: author?.profile_pic || `https://ui-avatars.com/api/?name=${author?.username}`,
              }}
              style={styles.avatar}
            />
            <View style={styles.nameColumn}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.username, { color: theme.colors.text }]}>
                  {author?.display_name || author?.username || 'Fan'}
                </Text>
                {/* Badges */}
                {author?.badge_type === 'official' && <MaterialCommunityIcons name="check-decagram" size={16} color="#FFD700" style={{ marginLeft: 4 }} />}
                {author?.badge_type === 'verified' && <MaterialCommunityIcons name="check-decagram" size={16} color="#1DA1F2" style={{ marginLeft: 4 }} />}
                {/* Add other badges as needed */}
              </View>

              {support ? (
                <Text style={[styles.supportStatus, { color: theme.colors.subText }]}>
                  Supports <Text style={{ color: theme.colors.primary }}>{support?.team_name}</Text>
                </Text>
              ) : (
                <Text style={[styles.supportStatus, { color: theme.colors.subText }]}>
                  {author?.account_type === 'news' ? 'News / Media' : 'Sports Fan'}
                </Text>
              )}
            </View>
          </TouchableOpacity>

          {!isOwner && (
            <TouchableOpacity
              style={[styles.smallFollowBtn, { backgroundColor: theme.colors.primary }, isFollowing && styles.smallFollowingBtn]}
              onPress={handleFollowToggle}
              disabled={followLoading}
            >
              {followLoading ? (
                <ActivityIndicator size="small" color={isFollowing ? theme.colors.primary : '#fff'} />
              ) : (
                <Text style={[styles.smallFollowText, { color: isFollowing ? theme.colors.subText : '#fff' }]}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Content */}
        <View style={styles.contentBody}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
          >
            {post.content && (
              <View pointerEvents="box-none">
                <Autolink
                  text={shouldTruncate && !isExpanded ? `${post.content.substring(0, TEXT_LIMIT)}...` : post.content}
                  style={[styles.postText, { color: theme.colors.text }]}
                  linkStyle={[styles.linkText, { color: theme.colors.primary }]}
                  onPress={(url, match) => {
                    if (match.getType() === 'mention') {
                      navigation.navigate('Profile', { username: match.getAnchorText().replace('@', '') });
                    } else {
                      Linking.openURL(url);
                    }
                  }}
                />
                {shouldTruncate && (
                  <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)}>
                    <Text style={{ color: theme.colors.primary, fontWeight: 'bold', fontSize: 13 }}>
                      {isExpanded ? 'Show Less' : 'See More'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Quote Post */}
            {originalData && (
              <TouchableOpacity style={[styles.quoteBox, { borderColor: theme.colors.border }]} onPress={() => navigation.navigate('PostDetail', { postId: originalData.id })}>
                {/* Quote content - keep your original quote UI */}
                <Text style={[styles.quoteContent, { color: theme.colors.text }]} numberOfLines={5}>
                  {originalData.content}
                </Text>
              </TouchableOpacity>
            )}

            {/* Media */}
            {!originalData && post.media_file && (
              <View style={styles.mediaWrapper}>
                {isVideo(post.media_file) ? (
                  <TouchableOpacity onPress={() => setUserPaused(prev => !prev)}>
                    <Video
                      source={getMediaSource(post.media_file)}
                      style={styles.mediaImage}
                      resizeMode="cover"
                      paused={userPaused}
                      repeat
                    />
                    {userPaused && (
                      <View style={styles.playOverlay}>
                        <MaterialCommunityIcons name="play-circle" size={52} color="rgba(255,255,255,0.85)" />
                      </View>
                    )}
                  </TouchableOpacity>
                ) : (
                  <Image source={getMediaSource(post.media_file)} style={styles.mediaImage} />
                )}
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => {
            const newLiked = !liked;
            setLiked(newLiked);
            setLikesCount(prev => (newLiked ? prev + 1 : prev - 1));
            api.post(`api/posts/${post.id}/like/`).catch(() => {
              setLiked(!newLiked);
              setLikesCount(post.likes_count);
            });
          }}>
            <MaterialCommunityIcons name={liked ? 'heart' : 'heart-outline'} size={22} color={liked ? theme.colors.notificationBadge : theme.colors.primary} />
            <Text style={[styles.actionText, { color: theme.colors.subText }]}>{likesCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={onCommentPress}>
            <MaterialCommunityIcons name="comment-text-outline" size={20} color={theme.colors.primary} />
            <Text style={[styles.actionText, { color: theme.colors.subText }]}>{post.comments_count || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={handleRepostPress}>
            <MaterialCommunityIcons name="repeat" size={22} color={theme.colors.primary} />
            <Text style={[styles.actionText, { color: theme.colors.subText }]}>{post.reposts_count || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
            <MaterialCommunityIcons name="share-variant-outline" size={20} color={theme.colors.primary} />
            <Text style={[styles.actionText, { color: theme.colors.subText }]}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ViewShot>
  );
};

const styles = StyleSheet.create({
  card: {
    paddingVertical: 12,
    borderBottomWidth: 6,
    borderBottomColor: 'transparent',
    marginBottom: 8,
    marginHorizontal: 8,
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  repostIndicator: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 45, marginBottom: 8 },
  repostUserText: { fontSize: 12, fontWeight: 'bold', marginLeft: 8 },
  topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, marginBottom: 12 },
  leagueTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  leagueHeaderText: { fontSize: 10, fontWeight: '800', marginLeft: 4, textTransform: 'uppercase' },
  rightActions: { flexDirection: 'row', alignItems: 'center' },
  menuIconButton: { paddingLeft: 10 },
  timestamp: { fontSize: 11, marginRight: 5 },
  authorSection: { flexDirection: 'row', paddingHorizontal: 15, alignItems: 'center', marginBottom: 5, justifyContent: 'space-between' },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  nameColumn: { marginLeft: 12 },
  username: { fontWeight: 'bold', fontSize: 16 },
  supportStatus: { fontSize: 12, marginTop: 1 },
  smallFollowBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 15, minWidth: 70, alignItems: 'center' },
  smallFollowingBtn: { backgroundColor: 'transparent', borderWidth: 1 },
  smallFollowText: { fontSize: 11, fontWeight: 'bold' },
  contentBody: { paddingHorizontal: 15, marginBottom: 10 },
  postText: { fontSize: 15, lineHeight: 22, marginBottom: 10 },
  linkText: { fontWeight: 'bold' },
  quoteBox: { marginTop: 5, borderWidth: 1, borderRadius: 12, padding: 12 },
  quoteContent: { fontSize: 14, lineHeight: 20 },
  mediaWrapper: { width: width - 30, height: 240, alignSelf: 'center', borderRadius: 16, overflow: 'hidden', marginTop: 10 },
  mediaImage: { width: '100%', height: '100%' },
  playOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
  footer: { flexDirection: 'row', paddingHorizontal: 25, marginTop: 16, justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 0.5 },
  actionBtn: { flexDirection: 'row', alignItems: 'center' },
  actionText: { marginLeft: 8, fontSize: 13, fontWeight: '600' },
});

export default PostCard;