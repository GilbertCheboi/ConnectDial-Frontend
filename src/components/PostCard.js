/**
 * PostCard.js – ConnectDial (ENHANCED & FIXED v4)
 * ─────────────────────────────────────────────────────────────────────
 * FIXES:
 * ✅ Fixed: `setNativeProps is not a function` error (removed completely)
 * ✅ Correct video pause on screen blur using React state only
 * ✅ Clean imports and code structure
 * ✅ Fully working video controls
 * ─────────────────────────────────────────────────────────────────────
 */
import React, {
  useState,
  useContext,
  useEffect,
  useRef,
  useCallback,
} from 'react';
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
import { captureRef } from 'react-native-view-shot';
import ViewShot from 'react-native-view-shot';
import { AuthContext } from '../store/authStore';
import { useFollow } from '../store/FollowContext';
import api from '../api/client';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ThemeContext } from '../store/themeStore';

const { width } = Dimensions.get('window');
const CARD_PADDING = 15;
const MEDIA_WIDTH = width - CARD_PADDING * 2 - 16;

// ─────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────
const formatTimeAgo = dateString => {
  if (!dateString) return '';
  const now = new Date();
  const postDate = new Date(dateString);
  const diffSeconds = Math.floor((now - postDate) / 1000);
  if (diffSeconds < 60) return 'now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h`;
  return postDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const resolveUri = path => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return { uri: path };
  }
  return { uri: `https://api.connectdial.com/${path}` };
};

const isVideoPath = path => {
  if (!path) return false;
  const lower = path.toLowerCase();
  return (
    lower.endsWith('.mp4') ||
    lower.endsWith('.mov') ||
    lower.endsWith('.webm') ||
    lower.includes('video')
  );
};

// ─────────────────────────────────────────────────────────────────────
// VIDEO TILE
// ─────────────────────────────────────────────────────────────────────
const VideoTile = ({ uri, style, onScreenBlur }) => {
  const [paused, setPaused] = useState(true);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef(null);

  // Pause & mute video when screen loses focus
  useEffect(() => {
    if (!onScreenBlur) return;
    const unsubscribe = onScreenBlur(() => {
      setPaused(true);
      setMuted(true);
    });
    return unsubscribe;
  }, [onScreenBlur]);

  const handlePlayPause = () => {
    setPaused(p => !p);
  };

  const handleMuteToggle = () => {
    setMuted(m => !m);
  };

  return (
    <TouchableOpacity activeOpacity={0.95} style={style}>
      <Video
        ref={videoRef}
        source={uri}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        paused={paused}
        muted={muted}
        repeat
        onError={e => console.log('Video error:', e)}
        onLoad={() => setPaused(true)} // Ensure video starts paused
      />

      <View style={styles.videoOverlay} />

      {/* Center Play/Pause Button */}
      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.centerPlayButton}
        onPress={handlePlayPause}
      >
        <MaterialCommunityIcons
          name={paused ? 'play-circle' : 'pause-circle'}
          size={64}
          color="rgba(255,255,255,0.9)"
        />
      </TouchableOpacity>

      {/* Top-right Mute Button */}
      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.muteButton}
        onPress={handleMuteToggle}
      >
        <View style={styles.muteButtonBg}>
          <MaterialCommunityIcons
            name={muted ? 'volume-mute' : 'volume-high'}
            size={18}
            color="#fff"
          />
        </View>
      </TouchableOpacity>

      {/* Unmuted Indicator */}
      {!muted && (
        <View style={styles.unmuteIndicator}>
          <Text style={styles.unmuteText}>🔊</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────────────────────────────
// MEDIA GRID
// ─────────────────────────────────────────────────────────────────────
const MediaGrid = ({ mediaFiles, onScreenBlur }) => {
  if (!mediaFiles || mediaFiles.length === 0) return null;

  const count = mediaFiles.length;

  const renderTile = (item, tileStyle) => {
    const rawUrl = typeof item === 'string' ? item : item.file_url;
    const isVideo =
      typeof item === 'string'
        ? isVideoPath(rawUrl)
        : item.media_type === 'video';
    const uri = resolveUri(rawUrl);
    if (!uri) return null;

    if (isVideo) {
      return (
        <VideoTile
          key={rawUrl}
          uri={uri}
          style={[styles.mediaTile, tileStyle]}
          onScreenBlur={onScreenBlur}
        />
      );
    }

    return (
      <Image
        key={rawUrl}
        source={uri}
        style={[styles.mediaTile, tileStyle]}
        resizeMode="cover"
      />
    );
  };

  if (count === 1) {
    return (
      <View style={[styles.mediaWrapper, { height: 280 }]}>
        {renderTile(mediaFiles[0], {
          width: '100%',
          height: '100%',
          borderRadius: 12,
        })}
      </View>
    );
  }

  if (count === 2) {
    const tileW = (MEDIA_WIDTH - 4) / 2;
    return (
      <View
        style={[
          styles.mediaWrapper,
          { flexDirection: 'row', height: 220, gap: 4 },
        ]}
      >
        {mediaFiles.map((item, idx) =>
          renderTile(item, { width: tileW, height: '100%', borderRadius: 12 }),
        )}
      </View>
    );
  }

  if (count === 3) {
    const halfW = (MEDIA_WIDTH - 4) / 2;
    return (
      <View
        style={[
          styles.mediaWrapper,
          { flexDirection: 'row', height: 260, gap: 4 },
        ]}
      >
        {renderTile(mediaFiles[0], {
          width: halfW,
          height: '100%',
          borderRadius: 12,
        })}
        <View style={{ flex: 1, gap: 4 }}>
          {renderTile(mediaFiles[1], { flex: 1, borderRadius: 12 })}
          {renderTile(mediaFiles[2], { flex: 1, borderRadius: 12 })}
        </View>
      </View>
    );
  }

  // 4+ items → 2x2 grid
  const displayItems = mediaFiles.slice(0, 4);
  const extra = mediaFiles.length - 4;
  const tileW = (MEDIA_WIDTH - 4) / 2;
  const tileH = 130;

  return (
    <View
      style={[
        styles.mediaWrapper,
        {
          flexWrap: 'wrap',
          flexDirection: 'row',
          height: tileH * 2 + 4,
          gap: 4,
        },
      ]}
    >
      {displayItems.map((item, idx) => {
        const isLast = idx === 3 && extra > 0;
        const tile = renderTile(item, {
          width: tileW,
          height: tileH,
          borderRadius: 12,
        });

        if (isLast) {
          return (
            <View key={idx} style={{ width: tileW, height: tileH }}>
              {tile}
              <View style={styles.moreOverlay}>
                <Text style={styles.moreText}>+{extra}</Text>
              </View>
            </View>
          );
        }
        return (
          <View key={idx} style={{ width: tileW, height: tileH }}>
            {tile}
          </View>
        );
      })}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────
// MAIN PostCard COMPONENT
// ─────────────────────────────────────────────────────────────────────
const PostCard = ({ post, onDeleteSuccess, onEditPress, onCommentPress }) => {
  const { user } = useContext(AuthContext);
  const { followingIds, updateFollowStatus } = useFollow();
  const navigation = useNavigation();
  const postRef = useRef(null);

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
  const [followLoading, setFollowLoading] = useState(false);

  // Screen blur handler
  const handleScreenBlur = useCallback(
    callback => {
      return navigation.addListener('blur', callback);
    },
    [navigation],
  );

  useFocusEffect(
    useCallback(() => {
      return () => {};
    }, []),
  );

  // Resolve media
  const resolvedMedia = (() => {
    if (post.media_files?.length > 0) return post.media_files;
    if (post.media_file || post.media_url) {
      return [
        {
          file_url: post.media_url || post.media_file,
          media_type: isVideoPath(post.media_file || post.media_url)
            ? 'video'
            : 'image',
        },
      ];
    }
    return [];
  })();

  // Handlers
  const handleShare = async () => {
    try {
      const uri = await captureRef(postRef, {
        format: 'png',
        quality: 0.92,
        result: 'tmpfile',
      });
      const shareLink = `https://connectdial.app/post/${post.id}`;
      const message = `Check out this post on ConnectDial 🔥\n\n${
        post.content?.substring(0, 140) ?? ''
      }${post.content?.length > 140 ? '...' : ''}\n\n${shareLink}`;

      await Share.open({
        title: 'Share Post',
        message,
        url: uri,
        type: 'image/png',
        failOnCancel: false,
      });
    } catch (error) {
      if (error?.message !== 'User did not share') {
        Alert.alert('Share Failed', 'Could not share this post at the moment.');
      }
    }
  };

  const handleFollowToggle = async () => {
    if (followLoading || !author?.id) return;
    const prev = isFollowing;
    const authorId = author.id;

    setFollowLoading(true);
    updateFollowStatus(authorId, !prev);

    try {
      const res = await api.post(`auth/users/${authorId}/toggle-follow/`);
      updateFollowStatus(authorId, res.data.following);
    } catch {
      updateFollowStatus(authorId, prev);
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
          } catch {
            Alert.alert('Error', 'Could not repost.');
          }
        },
      },
      {
        text: 'Quote Post',
        onPress: () =>
          navigation.navigate('CreatePost', {
            quoteMode: true,
            parentPost: post,
          }),
      },
    ]);
  };

  const handleMenuPress = () => {
    const options = [{ text: 'Cancel', style: 'cancel' }];
    if (isOwner) {
      options.push(
        { text: 'Edit Post', onPress: () => onEditPress?.(post) },
        { text: 'Delete Post', style: 'destructive', onPress: confirmDelete },
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
          } catch {
            Alert.alert('Error', 'Failed to delete');
          }
        },
      },
    ]);
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
        {isSimpleRepost && (
          <View style={styles.repostIndicator}>
            <MaterialCommunityIcons
              name="repeat"
              size={16}
              color={theme.colors.secondary}
            />
            <Text
              style={[styles.repostUserText, { color: theme.colors.secondary }]}
            >
              {author?.display_name || author?.username} reposted
            </Text>
          </View>
        )}

        <View style={styles.topHeader}>
          <View
            style={[
              styles.leagueTag,
              { backgroundColor: theme.colors.primary + '20' },
            ]}
          >
            <MaterialCommunityIcons
              name="trophy-variant"
              size={12}
              color={theme.colors.primary}
            />
            <Text
              style={[styles.leagueHeaderText, { color: theme.colors.primary }]}
            >
              {support?.league_name || 'Global'}
            </Text>
          </View>
          <View style={styles.rightActions}>
            <Text style={[styles.timestamp, { color: theme.colors.subText }]}>
              {formatTimeAgo(post.created_at)}
            </Text>
            <TouchableOpacity
              onPress={handleMenuPress}
              style={styles.menuIconButton}
            >
              <MaterialCommunityIcons
                name="dots-horizontal"
                size={22}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.authorSection}>
          <TouchableOpacity
            onPress={() => navigation.push('Profile', { userId: author?.id })}
            style={{ flexDirection: 'row', flex: 1, alignItems: 'center' }}
          >
            <Image
              source={{
                uri:
                  author?.profile_pic ||
                  `https://ui-avatars.com/api/?name=${author?.username}`,
              }}
              style={styles.avatar}
            />
            <View style={styles.nameColumn}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.username, { color: theme.colors.text }]}>
                  {author?.display_name || author?.username || 'Fan'}
                </Text>
                {author?.badge_type === 'official' && (
                  <MaterialCommunityIcons
                    name="check-decagram"
                    size={16}
                    color="#FFD700"
                    style={{ marginLeft: 4 }}
                  />
                )}
                {author?.badge_type === 'verified' && (
                  <MaterialCommunityIcons
                    name="check-decagram"
                    size={16}
                    color="#1DA1F2"
                    style={{ marginLeft: 4 }}
                  />
                )}
              </View>
              <Text
                style={[styles.supportStatus, { color: theme.colors.subText }]}
              >
                {support
                  ? `Supports ${support.team_name}`
                  : author?.account_type === 'news'
                  ? 'News / Media'
                  : 'Sports Fan'}
              </Text>
            </View>
          </TouchableOpacity>

          {!isOwner && (
            <TouchableOpacity
              style={[
                styles.smallFollowBtn,
                { backgroundColor: theme.colors.primary },
                isFollowing && styles.smallFollowingBtn,
              ]}
              onPress={handleFollowToggle}
              disabled={followLoading}
            >
              {followLoading ? (
                <ActivityIndicator
                  size="small"
                  color={isFollowing ? theme.colors.primary : '#fff'}
                />
              ) : (
                <Text
                  style={[
                    styles.smallFollowText,
                    { color: isFollowing ? theme.colors.subText : '#fff' },
                  ]}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.contentBody}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() =>
              navigation.navigate('PostDetail', { postId: post.id })
            }
          >
            {!!post.content && (
              <View pointerEvents="box-none">
                <Autolink
                  text={
                    shouldTruncate && !isExpanded
                      ? `${post.content.substring(0, TEXT_LIMIT)}...`
                      : post.content
                  }
                  style={[styles.postText, { color: theme.colors.text }]}
                  linkStyle={[styles.linkText, { color: theme.colors.primary }]}
                  onPress={(url, match) => {
                    if (match.getType() === 'mention') {
                      navigation.navigate('Profile', {
                        username: match.getAnchorText().replace('@', ''),
                      });
                    } else {
                      Linking.openURL(url);
                    }
                  }}
                />
                {shouldTruncate && (
                  <TouchableOpacity onPress={() => setIsExpanded(e => !e)}>
                    <Text
                      style={{
                        color: theme.colors.primary,
                        fontWeight: 'bold',
                        fontSize: 13,
                      }}
                    >
                      {isExpanded ? 'Show Less' : 'See More'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {!!originalData && (
              <TouchableOpacity
                style={[styles.quoteBox, { borderColor: theme.colors.border }]}
                onPress={() =>
                  navigation.navigate('PostDetail', { postId: originalData.id })
                }
              >
                <Text
                  style={[styles.quoteAuthor, { color: theme.colors.primary }]}
                  numberOfLines={1}
                >
                  @{originalData.author_details?.username}
                </Text>
                <Text
                  style={[styles.quoteContent, { color: theme.colors.text }]}
                  numberOfLines={5}
                >
                  {originalData.content}
                </Text>
                {originalData.media_files?.length > 0 && (
                  <MediaGrid
                    mediaFiles={originalData.media_files}
                    onScreenBlur={handleScreenBlur}
                  />
                )}
              </TouchableOpacity>
            )}

            {!originalData && resolvedMedia.length > 0 && (
              <MediaGrid
                mediaFiles={resolvedMedia}
                onScreenBlur={handleScreenBlur}
              />
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              const newLiked = !liked;
              setLiked(newLiked);
              setLikesCount(prev => (newLiked ? prev + 1 : prev - 1));
              api.post(`api/posts/${post.id}/like/`).catch(() => {
                setLiked(!newLiked);
                setLikesCount(post.likes_count || 0);
              });
            }}
          >
            <MaterialCommunityIcons
              name={liked ? 'heart' : 'heart-outline'}
              size={22}
              color={
                liked ? theme.colors.notificationBadge : theme.colors.primary
              }
            />
            <Text style={[styles.actionText, { color: theme.colors.subText }]}>
              {likesCount}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={onCommentPress}>
            <MaterialCommunityIcons
              name="comment-text-outline"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={[styles.actionText, { color: theme.colors.subText }]}>
              {post.comments_count || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleRepostPress}
          >
            <MaterialCommunityIcons
              name="repeat"
              size={22}
              color={theme.colors.primary}
            />
            <Text style={[styles.actionText, { color: theme.colors.subText }]}>
              {post.reposts_count || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
            <MaterialCommunityIcons
              name="share-variant-outline"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={[styles.actionText, { color: theme.colors.subText }]}>
              Share
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ViewShot>
  );
};

// ─────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    paddingVertical: 12,
    marginBottom: 8,
    marginHorizontal: 8,
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  repostIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 45,
    marginBottom: 8,
  },
  repostUserText: { fontSize: 12, fontWeight: 'bold', marginLeft: 8 },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: CARD_PADDING,
    marginBottom: 12,
  },
  leagueTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  leagueHeaderText: {
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  rightActions: { flexDirection: 'row', alignItems: 'center' },
  menuIconButton: { paddingLeft: 10 },
  timestamp: { fontSize: 11, marginRight: 5 },
  authorSection: {
    flexDirection: 'row',
    paddingHorizontal: CARD_PADDING,
    alignItems: 'center',
    marginBottom: 5,
    justifyContent: 'space-between',
  },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  nameColumn: { marginLeft: 12 },
  username: { fontWeight: 'bold', fontSize: 16 },
  supportStatus: { fontSize: 12, marginTop: 1 },
  smallFollowBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
    minWidth: 70,
    alignItems: 'center',
  },
  smallFollowingBtn: { backgroundColor: 'transparent', borderWidth: 1 },
  smallFollowText: { fontSize: 11, fontWeight: 'bold' },
  contentBody: { paddingHorizontal: CARD_PADDING, marginBottom: 10 },
  postText: { fontSize: 15, lineHeight: 22, marginBottom: 10 },
  linkText: { fontWeight: 'bold' },
  quoteBox: { marginTop: 5, borderWidth: 1, borderRadius: 12, padding: 12 },
  quoteAuthor: { fontSize: 13, fontWeight: 'bold', marginBottom: 4 },
  quoteContent: { fontSize: 14, lineHeight: 20 },
  mediaWrapper: { marginTop: 10, overflow: 'hidden', alignSelf: 'stretch' },
  mediaTile: { overflow: 'hidden', backgroundColor: '#0a1624' },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  centerPlayButton: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  muteButton: { position: 'absolute', top: 10, right: 10, zIndex: 3 },
  muteButtonBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  unmuteIndicator: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    zIndex: 2,
  },
  unmuteText: { fontSize: 18 },
  moreOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: 12,
  },
  moreText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 25,
    marginTop: 16,
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 0.5,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center' },
  actionText: { marginLeft: 8, fontSize: 13, fontWeight: '600' },
});

export default PostCard;
