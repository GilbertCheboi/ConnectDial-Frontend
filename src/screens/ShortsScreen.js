/**
 * ConnectDial — ShortsScreen.jsx
 * ================================
 * Instagram Reels / TikTok style full-screen video feed.
 *
 * Backend endpoints used (all from shorts/urls.py):
 *   GET  api/shorts/feed/                          personalised feed
 *   GET  api/shorts/<id>/stream/                   range-capable stream (up to 2 hrs)
 *   POST api/shorts/<id>/view/                     watch time tracking
 *   POST api/shorts/<id>/like/                     toggle like
 *   POST api/shorts/<id>/share/                    external share
 *   POST api/shorts/<id>/reshare/                  in-app reshare
 *   GET  api/shorts/<id>/comments/                 list comments
 *   POST api/shorts/<id>/comments/                 post comment
 *
 * Features:
 *   - Full-screen vertical video (Instagram Reels style)
 *   - Progress bar scrubber (seek to any point in a 2-hr video)
 *   - Double-tap to like with heart animation
 *   - Single-tap to pause/resume with icon feedback
 *   - Mute/unmute toggle
 *   - Like, Comment, Share side actions
 *   - Comment drawer (slide-up like Instagram)
 *   - Share sheet with WhatsApp, Telegram, Twitter, Copy Link, Reshare
 *   - Follow/unfollow button on video
 *   - League badge top-right
 *   - Duration display (supports 1:23 and 1:02:45 formats)
 *   - Infinite scroll with pagination
 *   - Pull-to-refresh
 *   - Watch time reporting on leave/swipe
 */

import React, {
  useState,
  useEffect,
  useRef,
  useContext,
  useCallback,
  memo,
} from 'react';
import {
  View,
  FlatList,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StatusBar,
  Animated,
  Platform,
  RefreshControl,
  Share,
  Linking,
  TextInput,
  KeyboardAvoidingView,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import Video from 'react-native-video';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useIsFocused } from '@react-navigation/native';
import { ThemeContext } from '../store/themeStore';
import { useFollow } from '../store/FollowContext';
import api from '../api/client';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('screen');
const PAGE_SIZE = 10;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const fmtCount = n => {
  if (!n && n !== 0) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

const fmtTime = seconds => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const h   = Math.floor(seconds / 3600);
  const m   = Math.floor((seconds % 3600) / 60);
  const s   = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// AVATAR PLACEHOLDER
// ─────────────────────────────────────────────────────────────────────────────

const Avatar = ({ uri, username, size = 36, primaryColor }) => {
  const [error, setError] = useState(false);
  if (uri && !error) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        onError={() => setError(true)}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: (primaryColor || '#1E90FF') + '33',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text style={{ color: primaryColor || '#1E90FF', fontWeight: '700', fontSize: size * 0.4 }}>
        {(username || '?')[0].toUpperCase()}
      </Text>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMMENT DRAWER
// ─────────────────────────────────────────────────────────────────────────────

const CommentDrawer = memo(({ item, theme, onClose }) => {
  const [comments, setComments]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [text, setText]             = useState('');
  const [submitting, setSubmitting] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 6,
    }).start();

    // ✅ Correct URL from urls.py
    api.get(`api/videos/shorts/${item.id}/comments/`)
      .then(res => setComments(res.data?.results || res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [item.id]);

  const handleSubmit = async () => {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      // ✅ Correct URL + correct field name (body, not text)
      const res = await api.post(`api/videos/shorts/${item.id}/comments/`, {
        body: text.trim(),
      });
      setComments(prev => [res.data, ...prev]);
      setText('');
    } catch {
      Alert.alert('Error', 'Could not post comment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Animated.View
      style={[
        styles.drawer,
        {
          backgroundColor: theme.colors.card || '#1a1a1a',
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.drawerHandle} />
      <View style={styles.drawerHeader}>
        <Text style={[styles.drawerTitle, { color: theme.colors.text }]}>
          Comments {comments.length > 0 ? `(${fmtCount(comments.length)})` : ''}
        </Text>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={22} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 30 }} />
      ) : comments.length === 0 ? (
        <View style={styles.emptyComments}>
          <Ionicons name="chatbubble-outline" size={40} color={theme.colors.subText} />
          <Text style={[styles.emptyText, { color: theme.colors.subText }]}>
            No comments yet. Be the first!
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {comments.map(c => (
            <View key={c.id} style={styles.commentRow}>
              <Avatar
                uri={c.author_avatar}
                username={c.author_username || c.username}
                size={36}
                primaryColor={theme.colors.primary}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.commentUsername, { color: theme.colors.subText }]}>
                  @{c.author_username || c.username}
                </Text>
                <Text style={[styles.commentText, { color: theme.colors.text }]}>
                  {c.body || c.text}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View
          style={[
            styles.commentInputRow,
            { borderTopColor: theme.colors.border || '#333' },
          ]}
        >
          <TextInput
            style={[
              styles.commentInputField,
              {
                backgroundColor: theme.colors.inputBackground || '#2a2a2a',
                color: theme.colors.text,
              },
            ]}
            placeholder="Add a comment..."
            placeholderTextColor={theme.colors.subText}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting || !text.trim()}
            style={styles.commentSendBtn}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Ionicons
                name="send"
                size={20}
                color={text.trim() ? theme.colors.primary : theme.colors.subText}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// SHARE SHEET
// ─────────────────────────────────────────────────────────────────────────────

const ShareSheet = memo(({ item, theme, onClose }) => {
  const [loadingPlatform, setLoadingPlatform] = useState(null);
  const slideAnim = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 6,
    }).start();
  }, []);

  const PLATFORMS = [
    { key: 'whatsapp',  label: 'WhatsApp', icon: 'logo-whatsapp', color: '#25D366' },
    { key: 'telegram',  label: 'Telegram', icon: 'paper-plane',   color: '#229ED9' },
    { key: 'twitter',   label: 'Twitter/X', icon: 'logo-twitter', color: '#1DA1F2' },
    { key: 'copy_link', label: 'Copy Link', icon: 'link-outline',  color: '#aaa'   },
    { key: 'in_app',    label: 'Reshare',   icon: 'repeat',        color: '#FF6B6B'},
  ];

  const handleShare = async platform => {
    setLoadingPlatform(platform);
    try {
      if (platform === 'in_app') {
        // ✅ Correct reshare URL from urls.py
        await api.post(`api/videos/shorts/${item.id}/reshare/`, {});
        Alert.alert('Reshared!', 'This video now appears on your profile.');
        onClose();
        return;
      }

      // ✅ Correct share URL from urls.py
      const res  = await api.post(`api/videos/shorts/${item.id}/share/`, { platform });
      const data = res.data;

      if (platform === 'whatsapp') {
        const url      = `whatsapp://send?text=${encodeURIComponent(data.text || data.share_url)}`;
        const canOpen  = await Linking.canOpenURL(url);
        canOpen
          ? Linking.openURL(url)
          : Share.share({ message: data.text || data.share_url });
      } else if (platform === 'telegram') {
        const tgUrl   = data.telegram_url;
        const canOpen = await Linking.canOpenURL('tg://');
        canOpen
          ? Linking.openURL(tgUrl)
          : Share.share({ message: data.text || data.share_url });
      } else if (platform === 'twitter') {
        Linking.openURL(data.twitter_url);
      } else {
        await Share.share({
          message: data.share_url,
          url:     data.share_url,
          title:   data.og_title,
        });
      }
    } catch {
      Alert.alert('Error', 'Could not share. Please try again.');
    } finally {
      setLoadingPlatform(null);
      if (platform !== 'in_app') onClose();
    }
  };

  return (
    <Animated.View
      style={[
        styles.shareSheet,
        {
          backgroundColor: theme.colors.card || '#1a1a1a',
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.drawerHandle} />
      <Text style={[styles.drawerTitle, { color: theme.colors.text, marginBottom: 16 }]}>
        Share video
      </Text>

      {/* Preview card */}
      <View
        style={[
          styles.sharePreviewCard,
          { backgroundColor: theme.colors.inputBackground || '#2a2a2a' },
        ]}
      >
        <Ionicons name="videocam" size={20} color={theme.colors.primary} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text
            style={[styles.sharePreviewTitle, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {item.og_title || `@${item.author_username}`}
          </Text>
          <Text
            style={[styles.sharePreviewDesc, { color: theme.colors.subText }]}
            numberOfLines={2}
          >
            {item.og_description || item.caption || 'Watch on ConnectDial'}
          </Text>
        </View>
      </View>

      <View style={styles.sharePlatforms}>
        {PLATFORMS.map(p => (
          <TouchableOpacity
            key={p.key}
            style={styles.sharePlatformBtn}
            onPress={() => handleShare(p.key)}
            disabled={!!loadingPlatform}
          >
            <View
              style={[styles.sharePlatformIcon, { backgroundColor: p.color + '22' }]}
            >
              {loadingPlatform === p.key ? (
                <ActivityIndicator size="small" color={p.color} />
              ) : (
                <Ionicons name={p.icon} size={26} color={p.color} />
              )}
            </View>
            <Text style={[styles.sharePlatformLabel, { color: theme.colors.subText }]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        onPress={onClose}
        style={[styles.shareCancelBtn, { borderTopColor: theme.colors.border || '#333' }]}
      >
        <Text style={[styles.shareCancelText, { color: theme.colors.subText }]}>Cancel</Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS BAR
// Instagram/YouTube style scrubber — critical for 2-hr videos
// ─────────────────────────────────────────────────────────────────────────────

const ProgressBar = memo(({ currentTime, duration, onSeek, theme }) => {
  const ratio    = duration > 0 ? Math.min(currentTime / duration, 1) : 0;
  const barWidth = SCREEN_WIDTH;

  const handlePress = e => {
    const x        = e.nativeEvent.locationX;
    const seekRatio = Math.max(0, Math.min(x / barWidth, 1));
    onSeek(seekRatio * duration);
  };

  return (
    <TouchableWithoutFeedback onPress={handlePress}>
      <View style={styles.progressContainer}>
        <View
          style={[
            styles.progressTrack,
            { backgroundColor: 'rgba(255,255,255,0.3)' },
          ]}
        >
          <View
            style={[
              styles.progressFill,
              {
                width: `${ratio * 100}%`,
                backgroundColor: theme.colors.primary,
              },
            ]}
          />
        </View>
        <View style={styles.progressTimes}>
          <Text style={styles.progressTimeText}>{fmtTime(currentTime)}</Text>
          <Text style={styles.progressTimeText}>{fmtTime(duration)}</Text>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE VIDEO ITEM
// ─────────────────────────────────────────────────────────────────────────────

const ShortItem = memo(({ item, isVisible, navigation, theme }) => {
  // Video state
  const [isBuffering, setIsBuffering] = useState(true);
  const [userPaused, setUserPaused]   = useState(false);
  const [isMuted, setIsMuted]         = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(item.duration || 0);
  const [videoError, setVideoError]   = useState(false);
  const videoRef = useRef(null);

  // Engagement state
  const [liked, setLiked]               = useState(item.is_liked ?? false);
  const [likesCount, setLikesCount]     = useState(item.likes_count ?? 0);
  const [commentsCount, setCommentsCount] = useState(item.comments_count ?? 0);
  const [sharesCount, setSharesCount]   = useState(item.shares_count ?? 0);

  // Drawer state
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare]       = useState(false);

  // Follow
  const { followingIds, updateFollowStatus } = useFollow();
  const [followLoading, setFollowLoading]    = useState(false);

  // Animations
  const heartScale      = useRef(new Animated.Value(0)).current;
  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  const feedbackScale   = useRef(new Animated.Value(0)).current;
  const lastTap         = useRef(0);
  const watchStartRef   = useRef(null);

  // ── Data mapping ──────────────────────────────────────────────────────────
  const username   = item.author_username || 'user';
  const authorId   = item.author_id;
  const teamName   = item.team_name || null;
  const leagueName = item.league_name || null;
  const avatarUri  = item.author_avatar || null;
  const isOwner    = false; // set from auth context if needed

  const isFollowing = followingIds?.has(authorId);

  // ✅ video_url from serializer points to /api/shorts/<id>/stream/
  // which is Range-capable — react-native-video handles seeking natively
  const videoUri = item.video_url;

  // ── Watch time reporting ──────────────────────────────────────────────────
  const reportEngagement = useCallback(async () => {
    if (!watchStartRef.current) return;
    const watchTime = (Date.now() - watchStartRef.current) / 1000;
    watchStartRef.current = null;
    try {
      // ✅ Correct view URL from urls.py
      await api.post(`api/videos/shorts/${item.id}/view/`, { watch_time: watchTime });
    } catch {
      // Silent
    }
  }, [item.id]);

  useEffect(() => {
    if (isVisible) {
      watchStartRef.current = Date.now();
      setUserPaused(false);
    } else {
      reportEngagement();
    }
    return () => {
      if (isVisible) reportEngagement();
    };
  }, [isVisible]);

  // ── Like toggle ───────────────────────────────────────────────────────────
  const toggleLike = useCallback(async () => {
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikesCount(c => c + (wasLiked ? -1 : 1));
    try {
      // ✅ Correct like URL from urls.py
      const res = await api.post(`api/videos/shorts/${item.id}/like/`);
      if (res.data?.likes_count !== undefined) {
        setLiked(res.data.liked);
        setLikesCount(res.data.likes_count);
      }
    } catch {
      setLiked(wasLiked);
      setLikesCount(c => c + (wasLiked ? 1 : -1));
    }
  }, [liked, item.id]);

  // ── Follow toggle ─────────────────────────────────────────────────────────
  const handleFollowToggle = useCallback(async () => {
    if (followLoading || !authorId) return;
    const prev = isFollowing;
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
  }, [followLoading, isFollowing, authorId]);

  // ── Seek ──────────────────────────────────────────────────────────────────
  const handleSeek = useCallback(seconds => {
    videoRef.current?.seek(seconds);
  }, []);

  // ── Double tap = like, Single tap = pause ─────────────────────────────────
  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      // Double tap — like with heart animation
      heartScale.setValue(0);
      Animated.sequence([
        Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, bounciness: 12 }),
        Animated.timing(heartScale, { toValue: 0, duration: 150, delay: 400, useNativeDriver: true }),
      ]).start();
      if (!liked) toggleLike();
    } else {
      // Single tap — play/pause
      setUserPaused(p => !p);
      feedbackOpacity.setValue(1);
      feedbackScale.setValue(0.5);
      Animated.parallel([
        Animated.spring(feedbackScale, { toValue: 1.2, useNativeDriver: true, friction: 4 }),
        Animated.timing(feedbackOpacity, {
          toValue: 0,
          duration: 400,
          delay: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
    lastTap.current = now;
  }, [liked, toggleLike]);

  return (
    <View style={styles.videoContainer}>

      {/* ── Video Player ── */}
      {videoError ? (
        <View style={[StyleSheet.absoluteFill, styles.errorContainer]}>
          <Ionicons name="alert-circle-outline" size={60} color={theme.colors.subText} />
          <Text style={[styles.errorText, { color: theme.colors.subText }]}>
            Video unavailable
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => setVideoError(false)}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Video
          ref={videoRef}
          source={{ uri: videoUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          paused={!isVisible || userPaused}
          repeat={true}
          muted={isMuted}
          onLoad={data => {
            setIsBuffering(false);
            setVideoDuration(data.duration || item.duration || 0);
          }}
          onBuffer={({ isBuffering: b }) => setIsBuffering(b)}
          onProgress={data => setCurrentTime(data.currentTime)}
          onError={() => setVideoError(true)}
          // ✅ Range-request config — critical for seeking in 2-hr videos
          // react-native-video sends Range headers automatically
          bufferConfig={{
            minBufferMs:                    10000,   // 10s ahead
            maxBufferMs:                    60000,   // 60s max buffer
            bufferForPlaybackMs:            2000,    // start playing after 2s buffered
            bufferForPlaybackAfterRebufferMs: 5000,
          }}
          progressUpdateInterval={500}
        />
      )}

      {/* ── Tap Overlay ── */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleTap}
        style={styles.tapOverlay}
      />

      {/* ── Animations (heart + pause) ── */}
      <View style={styles.overlayContainer} pointerEvents="none">
        <Animated.View
          style={[
            styles.iconWrapper,
            { opacity: feedbackOpacity, transform: [{ scale: feedbackScale }] },
          ]}
        >
          <View style={styles.iconCircle}>
            <Ionicons
              name={userPaused ? 'play' : 'pause'}
              size={40}
              color="white"
            />
          </View>
        </Animated.View>
        <Animated.View
          style={[
            styles.iconWrapper,
            { transform: [{ scale: heartScale }], position: 'absolute' },
          ]}
        >
          <Ionicons name="heart" size={110} color={theme.colors.notificationBadge} />
        </Animated.View>
      </View>

      {/* ── Buffering Indicator ── */}
      {isBuffering && !videoError && (
        <ActivityIndicator
          style={styles.loader}
          size="large"
          color={theme.colors.primary}
        />
      )}

      {/* ── Top Controls ── */}
      <TouchableOpacity
        style={styles.muteBtn}
        onPress={() => setIsMuted(m => !m)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name={isMuted ? 'volume-mute' : 'volume-high'}
          size={22}
          color="#fff"
        />
      </TouchableOpacity>

      {leagueName && (
        <View style={[styles.leagueBadge, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.leagueBadgeText}>{leagueName}</Text>
        </View>
      )}

      {/* ── Side Actions ── */}
      <View style={styles.sideActions}>

        {/* Author avatar with follow ring */}
        <TouchableOpacity
          style={styles.avatarWrapper}
          onPress={handleFollowToggle}
          disabled={followLoading || isOwner}
        >
          <View
            style={[
              styles.avatarRing,
              { borderColor: isFollowing ? theme.colors.border : theme.colors.primary },
            ]}
          >
            <Avatar
              uri={avatarUri}
              username={username}
              size={44}
              primaryColor={theme.colors.primary}
            />
          </View>
          {!isOwner && !isFollowing && (
            <View
              style={[
                styles.followPlusBtn,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <Ionicons name="add" size={14} color="#fff" />
            </View>
          )}
        </TouchableOpacity>

        {/* Like */}
        <TouchableOpacity style={styles.actionBtn} onPress={toggleLike}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={38}
            color={liked ? theme.colors.notificationBadge : '#fff'}
          />
          <Text style={styles.actionText}>{fmtCount(likesCount)}</Text>
        </TouchableOpacity>

        {/* Comment */}
        <TouchableOpacity style={styles.actionBtn} onPress={() => setShowComments(true)}>
          <Ionicons name="chatbubble-ellipses" size={34} color="#fff" />
          <Text style={styles.actionText}>{fmtCount(commentsCount)}</Text>
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity style={styles.actionBtn} onPress={() => setShowShare(true)}>
          <Ionicons name="share-social" size={32} color="#fff" />
          <Text style={styles.actionText}>{fmtCount(sharesCount)}</Text>
        </TouchableOpacity>

      </View>

      {/* ── Bottom Info ── */}
      <View style={styles.bottomInfo}>
        <View style={styles.userRow}>
          <Text style={styles.username}>@{username}</Text>
          {teamName && (
            <View style={styles.teamTag}>
              <Text style={styles.teamTagText}>⚽ {teamName}</Text>
            </View>
          )}
          {!isOwner && isFollowing !== undefined && (
            <TouchableOpacity
              style={[
                styles.smallFollowBtn,
                isFollowing
                  ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' }
                  : { backgroundColor: theme.colors.primary },
              ]}
              onPress={handleFollowToggle}
              disabled={followLoading}
            >
              {followLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.smallFollowText}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {item.caption ? (
          <Text style={styles.caption} numberOfLines={3}>
            {item.caption}
          </Text>
        ) : null}

        {/* Duration badge */}
        {item.duration_display && (
          <View style={styles.durationBadge}>
            <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.8)" />
            <Text style={styles.durationText}>{item.duration_display}</Text>
          </View>
        )}
      </View>

      {/* ── Progress Bar (seek — critical for 2-hr videos) ── */}
      <View style={styles.progressWrapper}>
        <ProgressBar
          currentTime={currentTime}
          duration={videoDuration}
          onSeek={handleSeek}
          theme={theme}
        />
      </View>

      {/* ── Comment Drawer ── */}
      {showComments && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <TouchableOpacity
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
            activeOpacity={1}
            onPress={() => setShowComments(false)}
          />
          <CommentDrawer
            item={item}
            theme={theme}
            onClose={() => setShowComments(false)}
          />
        </View>
      )}

      {/* ── Share Sheet ── */}
      {showShare && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <TouchableOpacity
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
            activeOpacity={1}
            onPress={() => setShowShare(false)}
          />
          <ShareSheet
            item={item}
            theme={theme}
            onClose={() => setShowShare(false)}
          />
        </View>
      )}
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────

export default function ShortsScreen({ navigation }) {
  const { theme } = useContext(ThemeContext) || {
    theme: {
      colors: {
        background: '#000',
        primary: '#1E90FF',
        text: '#fff',
        subText: '#aaa',
        notificationBadge: '#FF4B4B',
        card: '#1a1a1a',
        border: '#333',
        inputBackground: '#2a2a2a',
        buttonText: '#fff',
      },
    },
  };

  const [shorts, setShorts]               = useState([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [viewableIndex, setViewableIndex] = useState(0);
  const [offset, setOffset]               = useState(0);
  const [hasMore, setHasMore]             = useState(true);
  const isFocused = useIsFocused();

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchShorts = useCallback(
    async ({ isRefresh = false, pageOffset = 0 } = {}) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
          setOffset(0);
          setHasMore(true);
        } else if (pageOffset > 0) {
          setIsLoadingMore(true);
        }

        // ✅ Correct feed URL from urls.py
        const url      = `api/videos/shorts/feed/?limit=${PAGE_SIZE}&offset=${pageOffset}`;
        const response = await api.get(url);
        const data     = response.data;
        const incoming = data.results || data;
        const total    = data.count ?? incoming.length;

        setShorts(prev => (pageOffset === 0 ? incoming : [...prev, ...incoming]));
        const nextOffset = pageOffset + PAGE_SIZE;
        setHasMore(nextOffset < total);
        setOffset(nextOffset);
      } catch (err) {
        console.error('Shorts fetch error:', err?.response?.data || err.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchShorts({ pageOffset: 0 });
  }, []);

  // ── Status bar ─────────────────────────────────────────────────────────────
  useEffect(() => {
    StatusBar.setHidden(isFocused, 'fade');
    return () => StatusBar.setHidden(false, 'fade');
  }, [isFocused]);

  // ── Viewability ────────────────────────────────────────────────────────────
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems?.length > 0) setViewableIndex(viewableItems[0].index);
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;

  const handleEndReached = useCallback(
    ({ distanceFromEnd }) => {
      if (distanceFromEnd < 500 && hasMore && !isLoadingMore && !loading) {
        fetchShorts({ pageOffset: offset });
      }
    },
    [hasMore, isLoadingMore, loading, offset, fetchShorts],
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: '#000' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ color: theme.colors.subText, marginTop: 12 }}>
          Loading videos...
        </Text>
      </View>
    );
  }

  if (!loading && shorts.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: '#000' }]}>
        <Ionicons name="videocam-off-outline" size={60} color={theme.colors.subText} />
        <Text style={{ color: theme.colors.subText, marginTop: 16, fontSize: 16 }}>
          No videos yet. Be the first to post!
        </Text>
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: theme.colors.primary, marginTop: 20 }]}
          onPress={() => fetchShorts({ isRefresh: true, pageOffset: 0 })}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.mainContainer, { backgroundColor: '#000' }]}>
      <FlatList
        data={shorts}
        keyExtractor={item => String(item.id)}
        renderItem={({ item, index }) => (
          <ShortItem
            item={item}
            isVisible={isFocused && index === viewableIndex}
            navigation={navigation}
            theme={theme}
          />
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        windowSize={3}
        initialNumToRender={2}
        maxToRenderPerBatch={3}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchShorts({ isRefresh: true, pageOffset: 0 })}
            tintColor={theme.colors.primary}
          />
        }
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.loadMoreIndicator}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : null
        }
      />

      {/* Back button */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="chevron-back" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  mainContainer:    { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },

  videoContainer: { height: SCREEN_HEIGHT, width: SCREEN_WIDTH, backgroundColor: '#000' },

  tapOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 10 },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  iconWrapper: { justifyContent: 'center', alignItems: 'center' },
  iconCircle: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center', alignItems: 'center',
  },

  loader: { position: 'absolute', top: '48%', left: '45%', zIndex: 110 },

  errorContainer: {
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#111',
  },
  errorText: { marginTop: 12, fontSize: 15 },
  retryBtn: {
    marginTop: 16, paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: 20,
  },

  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 30,
    left: 15,
    zIndex: 200,
  },
  muteBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 65 : 35,
    left: 60,
    zIndex: 200,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 6, borderRadius: 20,
  },
  leagueBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 65 : 35,
    right: 15,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, zIndex: 200,
  },
  leagueBadgeText: {
    color: '#fff', fontSize: 11,
    fontWeight: '900', textTransform: 'uppercase',
  },

  // ── Side actions (right column like Instagram Reels) ──
  sideActions: {
    position: 'absolute',
    right: 12,
    bottom: 180,
    alignItems: 'center',
    zIndex: 200,
    gap: 4,
  },
  avatarWrapper: { marginBottom: 20, alignItems: 'center' },
  avatarRing: {
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 2, justifyContent: 'center', alignItems: 'center',
  },
  followPlusBtn: {
    position: 'absolute', bottom: -8,
    width: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#000',
  },
  actionBtn:  { alignItems: 'center', marginBottom: 18 },
  actionText: {
    fontSize: 12, fontWeight: '700',
    color: '#fff', marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 3,
  },

  // ── Bottom info ──
  bottomInfo: {
    position: 'absolute',
    bottom: 80,
    left: 15,
    right: 100,
    zIndex: 200,
  },
  userRow: {
    flexDirection: 'row', alignItems: 'center',
    flexWrap: 'wrap', gap: 8, marginBottom: 8,
  },
  username: {
    fontWeight: 'bold', fontSize: 16, color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 3,
  },
  teamTag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5,
  },
  teamTagText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  caption: {
    fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.9)',
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 2,
  },
  durationBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 6,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  durationText: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },

  smallFollowBtn: {
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 15, minWidth: 70, alignItems: 'center',
  },
  smallFollowText: { fontSize: 11, fontWeight: 'bold', color: '#fff' },

  // ── Progress bar ──
  progressWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 300,
  },
  progressContainer: { paddingHorizontal: 0, paddingBottom: 4 },
  progressTrack: {
    height: 3,
    width: '100%',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill:  { height: '100%', borderRadius: 2 },
  progressTimes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginTop: 2,
  },
  progressTimeText: {
    fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '600',
  },

  loadMoreIndicator: { paddingVertical: 20, alignItems: 'center' },

  // ── Comment Drawer ──
  drawer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: SCREEN_HEIGHT * 0.65,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    zIndex: 400,
  },
  drawerHandle: {
    width: 40, height: 4,
    backgroundColor: '#555', borderRadius: 2,
    alignSelf: 'center', marginTop: 10, marginBottom: 8,
  },
  drawerHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, marginBottom: 12,
  },
  drawerTitle: { fontSize: 16, fontWeight: '700' },
  emptyComments: { alignItems: 'center', marginTop: 40, gap: 12 },
  emptyText:     { textAlign: 'center', fontSize: 14 },
  commentRow: {
    flexDirection: 'row', paddingHorizontal: 16,
    paddingVertical: 10,
  },
  commentUsername: { fontSize: 12, marginBottom: 3 },
  commentText:     { fontSize: 14, lineHeight: 20 },
  commentInputRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 1, gap: 10,
  },
  commentInputField: {
    flex: 1, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    fontSize: 14, maxHeight: 80,
  },
  commentSendBtn: { padding: 8 },

  // ── Share Sheet ──
  shareSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    zIndex: 400,
  },
  sharePreviewCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, borderRadius: 10, marginBottom: 20,
  },
  sharePreviewTitle: { fontSize: 14, fontWeight: '700' },
  sharePreviewDesc:  { fontSize: 12, marginTop: 2 },
  sharePlatforms: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'center', gap: 16,
  },
  sharePlatformBtn:   { alignItems: 'center', width: 68 },
  sharePlatformIcon: {
    width: 52, height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center', marginBottom: 6,
  },
  sharePlatformLabel: { fontSize: 11, textAlign: 'center' },
  shareCancelBtn: {
    marginTop: 20, paddingVertical: 14,
    borderTopWidth: 1, alignItems: 'center',
  },
  shareCancelText: { fontSize: 15 },
});