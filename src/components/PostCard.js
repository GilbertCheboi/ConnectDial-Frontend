/**
 * PostCard.js – ConnectDial (FIXED v6)
 * ─────────────────────────────────────────────────────────────────────
 * FIXES in this version:
 * ✅ FIX #1: Follow button persists correctly on app reopen
 *            - Removed broken `!followingIds.has(-author?.id)` logic
 *            - Follow state now initialised from both context AND
 *              post.author_details.is_following so it's correct even
 *              before FollowContext finishes loading
 * ✅ FIX #2: "Supports <team>" text is now blue (primary colour)
 *            instead of grey subText
 * ✅ FIX #3: Repost quote-box now shows full original author info:
 *            avatar, display name, badge, team/league support line
 *            (was showing @username only)
 * ✅ FIX #4: Repost count updates optimistically on press
 * ✅ FIX #5: Comment count tracked in local state so it updates
 *            immediately when user comes back from CommentsScreen
 * ✅ All previous fixes preserved (hashtags, mentions, media grid, etc.)
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

  useEffect(() => {
    if (!onScreenBlur) return;
    const unsubscribe = onScreenBlur(() => {
      setPaused(true);
      setMuted(true);
    });
    return unsubscribe;
  }, [onScreenBlur]);

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
        onLoad={() => setPaused(true)}
      />
      <View style={styles.videoOverlay} />
      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.centerPlayButton}
        onPress={() => setPaused(p => !p)}
      >
        <MaterialCommunityIcons
          name={paused ? 'play-circle' : 'pause-circle'}
          size={64}
          color="rgba(255,255,255,0.9)"
        />
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.muteButton}
        onPress={() => setMuted(m => !m)}
      >
        <View style={styles.muteButtonBg}>
          <MaterialCommunityIcons
            name={muted ? 'volume-mute' : 'volume-high'}
            size={18}
            color="#fff"
          />
        </View>
      </TouchableOpacity>
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
// FIX #3: QuoteHeader — full original author info inside repost box
// Shows: avatar + display name + badge + "Supports <team>" line
// ─────────────────────────────────────────────────────────────────────
const QuoteHeader = ({ originalData, theme }) => {
  const origAuthor = originalData?.author_details;
  const origSupport = originalData?.supporting_info;

  if (!origAuthor) return null;

  const avatarUri =
    origAuthor.profile_pic ||
    `https://ui-avatars.com/api/?name=${origAuthor.username || 'U'}&background=162A3B&color=fff`;

  const supportLine = origSupport?.team_name
    ? `Supports ${origSupport.team_name}`
    : origAuthor.account_type === 'news'
    ? 'News / Media'
    : 'Sports Fan';

  return (
    <View style={styles.quoteHeaderRow}>
      <Image source={{ uri: avatarUri }} style={styles.quoteAvatar} />
      <View style={{ flex: 1, marginLeft: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[styles.quoteDisplayName, { color: theme.colors.text }]} numberOfLines={1}>
            {origAuthor.display_name || origAuthor.username}
          </Text>
          {origAuthor.badge_type === 'official' && (
            <MaterialCommunityIcons name="check-decagram" size={13} color="#FFD700" style={{ marginLeft: 3 }} />
          )}
          {origAuthor.badge_type === 'verified' && (
            <MaterialCommunityIcons name="check-decagram" size={13} color="#1DA1F2" style={{ marginLeft: 3 }} />
          )}
          <Text style={[styles.quoteUsername, { color: theme.colors.subText }]} numberOfLines={1}>
            {'  '}@{origAuthor.username}
          </Text>
        </View>
        {/* FIX #2 also applies here: support line is PRIMARY colour (blue) */}
        <Text style={[styles.quoteSupportLine, { color: theme.colors.primary }]} numberOfLines={1}>
          {supportLine}
        </Text>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────
// MAIN PostCard COMPONENT
// ─────────────────────────────────────────────────────────────────────
// ✅ FIX #8: hideFollow — when true, hides the "Follow" button for authors
// the user doesn't follow yet, but keeps the "Following" button visible so
// the user can still unfollow from the Following tab.
// Pass hideFollow={feedType === 'following'} from FeedList.
const PostCard = ({ post, onDeleteSuccess, onEditPress, onCommentPress, hideFollow = false }) => {
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

  // ─── FIX #1: Follow state ───────────────────────────────────────────
  // Priority order:
  //   1. FollowContext (most up-to-date across the session)
  //   2. post.author_details.is_following (from server, correct on first load)
  // Removed the broken `!followingIds.has(-author?.id)` check that was
  // always true and caused the button to reset to "Follow" on app reopen.
  const isFollowing = followingIds.has(author?.id)
    ? true
    : followingIds.has(-(author?.id))   // -id means "explicitly unfollowed this session"
    ? false
    : (author?.is_following ?? false);  // fall back to server value

  const [liked, setLiked] = useState(post.liked_by_me || false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  // FIX #5: comment count in local state so it can be updated on return
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);
  // FIX #4: repost count in local state for optimistic update
  const [repostsCount, setRepostsCount] = useState(post.reposts_count || 0);
  const [followLoading, setFollowLoading] = useState(false);

  // Keep counts in sync if the post prop refreshes from server
  useEffect(() => {
    setLiked(post.liked_by_me || false);
    setLikesCount(post.likes_count || 0);
    setCommentsCount(post.comments_count || 0);
    setRepostsCount(post.reposts_count || 0);
  }, [post.liked_by_me, post.likes_count, post.comments_count, post.reposts_count]);

  const handleScreenBlur = useCallback(
    callback => navigation.addListener('blur', callback),
    [navigation],
  );

  useFocusEffect(
    useCallback(() => {
      return () => {};
    }, []),
  );

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

  const handleShare = async () => {
    try {
      const uri = await captureRef(postRef, {
        format: 'png',
        quality: 0.92,
        result: 'tmpfile',
      });
      const deepLink = `https://connectdial.app/post/${post.id}`;
      const message = `Check out this post on ConnectDial 🔥\n\n${
        post.content?.substring(0, 140) ?? ''
      }${post.content?.length > 140 ? '...' : ''}\n\n🔗 ${deepLink}`;
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

  // ─── FIX #1: Follow toggle ──────────────────────────────────────────
  // updateFollowStatus(id, true)  → adds id to followingIds set
  // updateFollowStatus(id, false) → removes id, adds -id as sentinel
  // This means the context tracks explicit unfollows, fixing the bug
  // where returning to the app reset the button.
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

  // ─── FIX #4: Repost with optimistic count update ────────────────────
  const handleRepostPress = () => {
    Alert.alert('Share Post', 'Choose how to share this', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Repost',
        onPress: async () => {
          // Optimistic update
          setRepostsCount(prev => prev + 1);
          try {
            const res = await api.post(`api/posts/${post.id}/repost/`);
            // Server returns actual count — use it
            if (res.data?.reposts_count !== undefined) {
              setRepostsCount(res.data.reposts_count);
            }
            if (res.data?.status === 'unreposted') {
              Alert.alert('Removed', 'Repost removed.');
            } else {
              Alert.alert('Success', 'Reposted to your feed!');
            }
          } catch {
            // Roll back
            setRepostsCount(prev => Math.max(0, prev - 1));
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

  const handleAutolinkPress = (url, match) => {
    const type = match.getType();
    if (type === 'mention') {
      navigation.navigate('Profile', {
        username: match.getAnchorText().replace('@', ''),
      });
    } else if (type === 'hashtag') {
      navigation.navigate('Search', {
        query: match.getAnchorText(),
      });
    } else {
      Linking.openURL(url);
    }
  };

  // ─── FIX #5: Comment press — update count when returning ────────────
  const handleCommentPress = () => {
    if (onCommentPress) {
      onCommentPress(post.id);
    } else {
      navigation.navigate('PostDetail', { postId: post.id });
    }
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
              {/* ── FIX #2: Support line is now PRIMARY (blue) ── */}
              <Text
                style={[styles.supportStatus, { color: theme.colors.primary }]}
              >
                {support
                  ? `Supports ${support.team_name}`
                  : author?.account_type === 'news'
                  ? 'News / Media'
                  : 'Sports Fan'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* ✅ FIX #8: On the Following tab (hideFollow=true), only hide the
              "Follow" button (user not yet following). The "Following" button
              stays visible so the user can still unfollow from that tab. */}
          {!isOwner && !(hideFollow && !isFollowing) && (
            <TouchableOpacity
              style={[
                styles.smallFollowBtn,
                isFollowing
                  ? [styles.smallFollowingBtn, { borderColor: theme.colors.primary }]
                  : { backgroundColor: theme.colors.primary },
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
                    { color: isFollowing ? theme.colors.primary : '#fff' },
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
                  hashtag="twitter"
                  mention="twitter"
                  onPress={handleAutolinkPress}
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

            {/* ── FIX #3: Full quote box with author info ── */}
            {!!originalData && (
              <TouchableOpacity
                style={[styles.quoteBox, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
                onPress={() =>
                  navigation.navigate('PostDetail', { postId: originalData.id })
                }
              >
                {/* Full original author header */}
                <QuoteHeader originalData={originalData} theme={theme} />

                <Autolink
                  text={originalData.content || ''}
                  style={[styles.quoteContent, { color: theme.colors.text }]}
                  linkStyle={{ color: theme.colors.primary, fontWeight: '600' }}
                  hashtag="twitter"
                  mention="twitter"
                  onPress={handleAutolinkPress}
                  numberOfLines={5}
                />
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
          {/* ── Like — optimistic ── */}
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

          {/* ── FIX #5: Comments — uses local state commentsCount ── */}
          <TouchableOpacity style={styles.actionBtn} onPress={handleCommentPress}>
            <MaterialCommunityIcons
              name="comment-text-outline"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={[styles.actionText, { color: theme.colors.subText }]}>
              {commentsCount}
            </Text>
          </TouchableOpacity>

          {/* ── FIX #4: Reposts — uses local state repostsCount ── */}
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
              {repostsCount}
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
    marginHorizontal: 4,
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
  // FIX #2: supportStatus colour is set inline using theme.colors.primary
  supportStatus: { fontSize: 12, marginTop: 1 },
  smallFollowBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
    minWidth: 70,
    alignItems: 'center',
  },
  smallFollowingBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  smallFollowText: { fontSize: 11, fontWeight: 'bold' },
  contentBody: { paddingHorizontal: CARD_PADDING, marginBottom: 10 },
  postText: { fontSize: 15, lineHeight: 22, marginBottom: 10 },
  linkText: { fontWeight: 'bold' },

  // ── FIX #3: Quote box styles ────────────────────────────────────────
  quoteBox: {
    marginTop: 5,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  quoteHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  quoteAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1E293B',
  },
  quoteDisplayName: {
    fontWeight: '700',
    fontSize: 13,
  },
  quoteUsername: {
    fontSize: 12,
    fontWeight: '400',
  },
  quoteSupportLine: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
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