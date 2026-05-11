import React, { useState, useContext, useEffect } from 'react';
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
  if (diffInSeconds < 84400) return `${Math.floor(diffInSeconds / 3600)}h`;
  return postDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const PostCard = ({ post, onDeleteSuccess, onEditPress, onCommentPress }) => {
  const { user } = useContext(AuthContext);
  const { followingIds, updateFollowStatus } = useFollow();
  const navigation = useNavigation();

  const [isExpanded, setIsExpanded] = React.useState(false);
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
        icon: '#1E90FF',
        button: '#1E90FF',
        buttonText: '#FFFFFF',
        inputBackground: '#112634',
        overlay: 'rgba(255, 255, 255, 0.05)',
        drawerBackground: '#0D1F2D',
        drawerText: '#F8FAFC',
        drawerIcon: '#1E90FF',
        tabBar: '#0D1F2D',
        tabBarInactive: '#64748B',
        header: '#0D1F2D',
        headerTint: '#F8FAFC',
        notificationBadge: '#FF4B4B',
        sheetBackground: '#0D1F2D',
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

  // ✅ Video starts paused. Tap to play, tap to pause. Navigating away forces pause.
  const [userPaused, setUserPaused] = useState(true);

  useEffect(() => {
    // ✅ Whenever user navigates away from this screen, pause all videos
    const unsubscribe = navigation.addListener('blur', () => {
      setUserPaused(true);
    });
    return unsubscribe;
  }, [navigation]);

  const [followLoading, setFollowLoading] = useState(false);

  const getMediaSource = path => {
    if (!path) return null;
    return path.startsWith('http')
      ? { uri: path }
      : { uri: `http://192.168.100.107:8000${path}` };
  };

  const renderAuthorBadge = () => {
    const badgeType = author?.badge_type;
    const accountType = author?.account_type;

    const badgeMap = {
      official: { label: 'Official Media',  icon: 'shield-check',    color: '#FACC15' },
      pioneer:  { label: 'Pioneer',         icon: 'rocket-launch',   color: '#A855F7' },
      superfan: { label: 'Superfan',         icon: 'star-circle',     color: '#22C55E' },
      verified: { label: 'Verified',         icon: 'check-circle',    color: '#38BDF8' },
    };

    if (badgeType && badgeType !== 'none') {
      const badge = badgeMap[badgeType];
      return (
        <View style={styles.badgeRow}>
          <MaterialCommunityIcons name={badge.icon} size={14} color={badge.color} />
          <Text style={[styles.badgeText, { color: badge.color }]}> {badge.label}</Text>
        </View>
      );
    }

    if (accountType && accountType !== 'fan') {
      const label = accountType === 'news' ? 'News / Media' : 'Organization';
      return (
        <View style={styles.badgeRow}>
          <MaterialCommunityIcons name="briefcase-outline" size={14} color="#94A3B8" />
          <Text style={[styles.badgeText, { color: '#94A3B8' }]}> {label}</Text>
        </View>
      );
    }

    return null;
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
        {
          text: 'Edit Post',
          onPress: () => {
            navigation.navigate('CreatePost', {
              editMode: true,
              postData: post,
              leagueId: post.league,
              leagueName: post.supporting_info?.league_name,
            });
          },
        },
        {
          text: 'Delete Post',
          style: 'destructive',
          onPress: () => confirmDelete(),
        },
      );
    } else {
      options.push({
        text: 'Report Post',
        onPress: () => Alert.alert('Reported', 'Thank you.'),
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

  // ✅ Determines if this media is a video
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
          <MaterialCommunityIcons name="repeat" size={16} color={theme.colors.secondary} />
          <Text style={[styles.repostUserText, { color: theme.colors.secondary }]}>
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
          <Text style={[styles.leagueHeaderText, { color: theme.colors.primary }]}>
            {support?.league_name || 'Global'}
          </Text>
        </View>
        <View style={styles.rightActions}>
          <Text style={[styles.timestamp, { color: theme.colors.subText }]}>
            {formatTimeAgo(post.created_at)}
          </Text>
          <TouchableOpacity onPress={handleMenuPress} style={styles.menuIconButton}>
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
                  name="check-decagram" size={16} color="#FFD700" style={{ marginLeft: 4 }}
                />
              )}
              {author?.badge_type === 'verified' && (
                <MaterialCommunityIcons
                  name="check-decagram" size={16} color="#1DA1F2" style={{ marginLeft: 4 }}
                />
              )}
              {author?.badge_type === 'pioneer' && (
                <MaterialCommunityIcons
                  name="rocket-launch" size={15} color="#BB86FC" style={{ marginLeft: 4 }}
                />
              )}
              {author?.badge_type === 'superfan' && (
                <MaterialCommunityIcons
                  name="shield-check" size={16} color="#FF4500" style={{ marginLeft: 4 }}
                />
              )}
            </View>

            {support ? (
              <Text style={[styles.supportStatus, { color: theme.colors.subText }]}>
                Supports{' '}
                <Text style={[styles.teamName, { color: theme.colors.primary }]}>
                  {support?.team_name}
                </Text>
              </Text>
            ) : (
              <Text style={[styles.supportStatus, { color: theme.colors.subText }]}>
                {author?.account_type === 'news'
                  ? 'News / Media'
                  : author?.account_type === 'organization'
                  ? 'Official Organization'
                  : 'Sports Fan'}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        {!isOwner && (
          <TouchableOpacity
            style={[
              styles.smallFollowBtn,
              { backgroundColor: theme.colors.primary },
              isFollowing && [
                styles.smallFollowingBtn,
                { borderColor: theme.colors.border, backgroundColor: 'transparent' },
              ],
            ]}
            onPress={handleFollowToggle}
            disabled={followLoading}
          >
            {followLoading ? (
              <ActivityIndicator
                size="small"
                color={isFollowing ? theme.colors.primary : theme.colors.buttonText}
              />
            ) : (
              <Text
                style={[
                  styles.smallFollowText,
                  { color: isFollowing ? theme.colors.subText : theme.colors.buttonText },
                  isFollowing && styles.smallFollowingText,
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
          onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
          style={styles.contentBody}
        >
          {post.content ? (
            <View pointerEvents="box-none">
              <Autolink
                text={
                  shouldTruncate && !isExpanded
                    ? `${post.content.substring(0, TEXT_LIMIT)}...`
                    : post.content
                }
                style={[styles.postText, { color: theme.colors.text }]}
                linkStyle={[styles.linkText, { color: theme.colors.primary }]}
                mention="twitter"
                hashtag="instagram"
                url={true}
                onPress={(url, match) => {
                  if (match.getType() === 'mention') {
                    const cleanUsername = match.getAnchorText().replace('@', '');
                    navigation.navigate('Profile', { username: cleanUsername });
                  } else if (match.getType() === 'hashtag') {
                    const tag = match.getAnchorText();
                    navigation.navigate('Search', { query: tag });
                  } else {
                    Linking.openURL(url);
                  }
                }}
              />
              {shouldTruncate && (
                <TouchableOpacity
                  onPress={() => setIsExpanded(!isExpanded)}
                  style={{ marginTop: 6, alignSelf: 'flex-start' }}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: theme.colors.primary, fontWeight: 'bold', fontSize: 13 }}>
                    {isExpanded ? 'Show Less' : 'See More'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}
        </TouchableOpacity>

        {originalData && (
          <TouchableOpacity
            style={[styles.quoteBox, { borderColor: theme.colors.border }]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('PostDetail', { postId: originalData.id })}
          >
            <View style={styles.quoteHeader}>
              <Image
                source={{
                  uri:
                    originalData.author_details?.profile_pic ||
                    `https://ui-avatars.com/api/?name=${originalData.author_details?.username}`,
                }}
                style={styles.miniAvatar}
              />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text
                    style={[styles.quoteUsername, { color: theme.colors.text }]}
                    numberOfLines={1}
                  >
                    {originalData.author_details?.display_name ||
                      originalData.author_details?.username}
                  </Text>

                  {originalData.author_details?.badge_type === 'official' && (
                    <MaterialCommunityIcons name="check-decagram" size={14} color="#FFD700" style={{ marginLeft: 3 }} />
                  )}
                  {originalData.author_details?.badge_type === 'verified' && (
                    <MaterialCommunityIcons name="check-decagram" size={14} color="#1DA1F2" style={{ marginLeft: 3 }} />
                  )}
                  {originalData.author_details?.badge_type === 'pioneer' && (
                    <MaterialCommunityIcons name="rocket-launch" size={13} color="#BB86FC" style={{ marginLeft: 3 }} />
                  )}
                  {originalData.author_details?.badge_type === 'superfan' && (
                    <MaterialCommunityIcons name="shield-check" size={14} color="#FF4500" style={{ marginLeft: 3 }} />
                  )}
                </View>

                {originalData.supporting_info?.team_name ? (
                  <Text style={[styles.quoteTeamText, { color: theme.colors.subText, fontSize: 11 }]}>
                    Supports{' '}
                    <Text style={{ color: theme.colors.primary, fontWeight: '500' }}>
                      {originalData.supporting_info.team_name}
                    </Text>
                  </Text>
                ) : (
                  <Text style={[styles.quoteTeamText, { color: theme.colors.subText, fontSize: 11 }]}>
                    {originalData.author_details?.account_type === 'news'
                      ? 'News / Media'
                      : originalData.author_details?.account_type === 'organization'
                      ? 'Official Organization'
                      : 'Sports Fan'}
                  </Text>
                )}
              </View>
            </View>

            <Text
              style={[styles.quoteContent, { color: theme.colors.text, marginTop: 4 }]}
              numberOfLines={5}
              ellipsizeMode="tail"
            >
              {originalData.content}
            </Text>

            {originalData.content?.split('\n').length > 5 ||
            originalData.content?.length > 200 ? (
              <Text style={{ color: theme.colors.primary, fontSize: 11, marginTop: 2, fontWeight: '600' }}>
                Read full post...
              </Text>
            ) : null}
          </TouchableOpacity>
        )}

        {/* ✅ FIXED VIDEO PLAYER — pauses on navigate away, tap to play/pause */}
        {!originalData && post.media_file && (
          <View style={styles.mediaWrapper}>
            {isVideo(post.media_file) ? (
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => setUserPaused(prev => !prev)}
                style={{ width: '100%', height: '100%' }}
              >
                <Video
                  source={getMediaSource(post.media_file)}
                  style={styles.mediaImage}
                  resizeMode="cover"
                  paused={userPaused}   // ✅ starts paused, tap to play, blur to pause
                  repeat
                  onError={e => console.log('Video error:', e)}
                />
                {/* ✅ Play overlay shown when paused */}
                {userPaused && (
                  <View style={styles.playOverlay}>
                    <MaterialCommunityIcons
                      name="play-circle"
                      size={52}
                      color="rgba(255,255,255,0.85)"
                    />
                  </View>
                )}
              </TouchableOpacity>
            ) : (
              <Image
                source={getMediaSource(post.media_file)}
                style={styles.mediaImage}
              />
            )}
          </View>
        )}
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
              setLikesCount(post.likes_count);
            });
          }}
        >
          <MaterialCommunityIcons
            name={liked ? 'heart' : 'heart-outline'}
            size={22}
            color={liked ? theme.colors.notificationBadge : theme.colors.primary}
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

        <TouchableOpacity style={styles.actionBtn} onPress={handleRepostPress}>
          <MaterialCommunityIcons
            name="repeat"
            size={22}
            color={isSimpleRepost ? '#10B981' : theme.colors.primary}
          />
          <Text style={[styles.actionText, { color: theme.colors.subText }]}>
            {post.reposts_count || 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn}>
          <MaterialCommunityIcons
            name="share-variant-outline"
            size={20}
            color={theme.colors.primary}
          />
        </TouchableOpacity>
      </View>
    </View>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
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
    paddingHorizontal: 15,
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
  rightActions:   { flexDirection: 'row', alignItems: 'center' },
  menuIconButton: { paddingLeft: 10 },
  timestamp:      { fontSize: 11, marginRight: 5 },
  authorSection: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    alignItems: 'center',
    marginBottom: 5,
    justifyContent: 'space-between',
  },
  avatar:       { width: 42, height: 42, borderRadius: 21 },
  nameColumn:   { marginLeft: 12 },
  username:     { fontWeight: 'bold', fontSize: 16 },
  supportStatus:{ fontSize: 12, marginTop: 1 },
  teamName:     { fontWeight: '600' },
  smallFollowBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
    minWidth: 70,
    alignItems: 'center',
  },
  smallFollowingBtn:  { backgroundColor: 'transparent', borderWidth: 1 },
  smallFollowText:    { fontSize: 11, fontWeight: 'bold' },
  smallFollowingText: {},
  contentBody:  { paddingHorizontal: 15, marginBottom: 10 },
  postText:     { fontSize: 15, lineHeight: 22, marginBottom: 10 },
  linkText:     { fontWeight: 'bold' },
  quoteBox: {
    marginTop: 5,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  quoteHeader:  { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  miniAvatar:   { width: 18, height: 18, borderRadius: 9, marginRight: 8 },
  quoteUsername:{ fontWeight: 'bold', fontSize: 13 },
  quoteContent: { fontSize: 14, lineHeight: 20 },
  mediaWrapper: {
    width: width - 30,
    height: 240,
    alignSelf: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 10,
  },
  mediaImage: { width: '100%', height: '100%' },
  // ✅ Overlay shown when video is paused
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 25,
    marginTop: 16,
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 0.5,
  },
  actionBtn:  { flexDirection: 'row', alignItems: 'center' },
  actionText: { marginLeft: 8, fontSize: 13, fontWeight: '600' },
  quoteTeamText: { color: '#64748B', fontSize: 10, marginTop: -2 },
  badgeRow:   { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  badgeText:  { fontSize: 11, fontWeight: '600' },
});

export default PostCard;