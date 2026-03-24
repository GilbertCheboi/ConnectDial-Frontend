import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
  Linking, // 🚀 Added for opening URLs
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Video from 'react-native-video';
import Autolink from 'react-native-autolink'; // 🚀 Added for Mentions/Hashtags/Links
import { AuthContext } from '../store/authStore';
import { useFollow } from '../store/FollowContext';
import api from '../api/client';
import { useNavigation } from '@react-navigation/native';

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
  const [videoPaused, setVideoPaused] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  const getMediaSource = path => {
    if (!path) return null;
    return path.startsWith('http')
      ? { uri: path }
      : { uri: `http://192.168.100.107:8000${path}` };
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

  return (
    <View style={styles.card}>
      {isSimpleRepost && (
        <View style={styles.repostIndicator}>
          <MaterialCommunityIcons name="repeat" size={16} color="#64748B" />
          <Text style={styles.repostUserText}>
            {author?.display_name || author?.username} reposted
          </Text>
        </View>
      )}

      <View style={styles.topHeader}>
        <View style={styles.leagueTag}>
          <MaterialCommunityIcons
            name="trophy-variant"
            size={12}
            color="#1E90FF"
          />
          <Text style={styles.leagueHeaderText}>
            {support?.league_name || 'Global'}
          </Text>
        </View>
        <View style={styles.rightActions}>
          <Text style={styles.timestamp}>{formatTimeAgo(post.created_at)}</Text>
          <TouchableOpacity
            onPress={handleMenuPress}
            style={styles.menuIconButton}
          >
            <MaterialCommunityIcons
              name="dots-horizontal"
              size={22}
              color="#64748B"
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
            <Text style={styles.username}>
              {author?.display_name || author?.username || 'Fan'}
            </Text>
            <Text style={styles.supportStatus}>
              Supports{' '}
              <Text style={styles.teamName}>
                {support?.team_name || 'All Teams'}
              </Text>
            </Text>
          </View>
        </TouchableOpacity>

        {!isOwner && (
          <TouchableOpacity
            style={[
              styles.smallFollowBtn,
              isFollowing && styles.smallFollowingBtn,
            ]}
            onPress={handleFollowToggle}
            disabled={followLoading}
          >
            {followLoading ? (
              <ActivityIndicator
                size="small"
                color={isFollowing ? '#1E90FF' : '#FFF'}
              />
            ) : (
              <Text
                style={[
                  styles.smallFollowText,
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
        {post.content ? (
          <Autolink
            text={post.content}
            style={styles.postText}
            linkStyle={styles.linkText}
            mention="twitter"
            hashtag="instagram"
            url={true}
            onPress={(url, match) => {
              // 🚀 Custom Navigation Logic
              if (match.getType() === 'mention') {
                const cleanUsername = match.getAnchorText().replace('@', '');
                navigation.navigate('Profile', { username: cleanUsername });
              } else if (match.getType() === 'hashtag') {
                const cleanTag = match.getAnchorText().replace('#', '');
                navigation.navigate('Search', { query: cleanTag });
              } else {
                Linking.openURL(url);
              }
            }}
            // If user taps the text but NOT a link, go to detail
            onLongPress={() =>
              navigation.navigate('PostDetail', { postId: post.id })
            }
          />
        ) : null}

        {originalData && (
          <TouchableOpacity
            style={styles.quoteBox}
            onPress={() =>
              navigation.navigate('PostDetail', { postId: originalData.id })
            }
          >
            <View style={styles.quoteHeader}>
              <Image
                source={{ uri: originalData.author_details?.profile_pic }}
                style={styles.miniAvatar}
              />
              <View>
                <Text style={styles.quoteUsername}>
                  {originalData.author_details?.display_name}
                </Text>
                {originalData.supporting_info?.team_name && (
                  <Text style={styles.quoteTeamText}>
                    Supports{' '}
                    <Text style={{ color: '#1E90FF' }}>
                      {originalData.supporting_info.team_name}
                    </Text>
                  </Text>
                )}
              </View>
            </View>
            <Text style={styles.quoteContent} numberOfLines={3}>
              {originalData.content}
            </Text>
          </TouchableOpacity>
        )}

        {!originalData && post.media_file && (
          <View style={styles.mediaWrapper}>
            {post.media_file.endsWith('.mp4') ? (
              <Video
                source={getMediaSource(post.media_file)}
                style={styles.mediaImage}
                resizeMode="cover"
                paused={videoPaused}
                repeat
              />
            ) : (
              <Image
                source={getMediaSource(post.media_file)}
                style={styles.mediaImage}
              />
            )}
          </View>
        )}
      </View>

      <View style={styles.footer}>
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
            color={liked ? '#FF4B4B' : '#94A3B8'}
          />
          <Text style={styles.actionText}>{likesCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={onCommentPress}>
          <MaterialCommunityIcons
            name="comment-text-outline"
            size={20}
            color="#94A3B8"
          />
          <Text style={styles.actionText}>{post.comments_count || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={handleRepostPress}>
          <MaterialCommunityIcons
            name="repeat"
            size={22}
            color={isSimpleRepost ? '#10B981' : '#94A3B8'}
          />
          <Text style={styles.actionText}>{post.reposts_count || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn}>
          <MaterialCommunityIcons
            name="share-variant-outline"
            size={20}
            color="#94A3B8"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0D1F2D',
    paddingVertical: 14,
    borderBottomWidth: 6,
    borderBottomColor: '#050B10',
  },
  repostIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 45,
    marginBottom: 8,
  },
  repostUserText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
  },
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
    backgroundColor: '#1E90FF15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  leagueHeaderText: {
    color: '#1E90FF',
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  rightActions: { flexDirection: 'row', alignItems: 'center' },
  menuIconButton: { paddingLeft: 10 },
  timestamp: { color: '#64748B', fontSize: 11, marginRight: 5 },
  authorSection: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    alignItems: 'center',
    marginBottom: 5,
    justifyContent: 'space-between',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1A2A3D',
  },
  nameColumn: { marginLeft: 12 },
  username: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  supportStatus: { color: '#94A3B8', fontSize: 12, marginTop: 1 },
  teamName: { color: '#1E90FF', fontWeight: '600' },
  smallFollowBtn: {
    backgroundColor: '#1E90FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
    minWidth: 70,
    alignItems: 'center',
  },
  smallFollowingBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#64748B',
  },
  smallFollowText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  smallFollowingText: { color: '#64748B' },
  contentBody: { paddingHorizontal: 15, marginBottom: 10 },
  postText: {
    color: '#F1F5F9',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
  },
  // 🚀 New Link Style
  linkText: { color: '#1E90FF', fontWeight: 'bold' },
  quoteBox: {
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#050B10',
  },
  quoteHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  miniAvatar: { width: 18, height: 18, borderRadius: 9, marginRight: 8 },
  quoteUsername: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  quoteContent: { color: '#CBD5E1', fontSize: 14, lineHeight: 20 },
  mediaWrapper: {
    width: width - 30,
    height: 240,
    alignSelf: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1A2A3D',
    marginTop: 10,
  },
  mediaImage: { width: '100%', height: '100%' },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 25,
    marginTop: 16,
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#1E293B',
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center' },
  actionText: {
    color: '#94A3B8',
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '600',
  },
  quoteTeamText: { color: '#64748B', fontSize: 10, marginTop: -2 },
});

export default PostCard;
