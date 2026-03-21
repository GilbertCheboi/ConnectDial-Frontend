import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Video from 'react-native-video';
import { AuthContext } from '../store/authStore';
import api from '../api/client';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const formatTimeAgo = dateString => {
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
  const navigation = useNavigation();

  const author = post.author_details;
  const support = post.supporting_info;
  const isOwner = user?.id === author?.id;

  const [liked, setLiked] = useState(post.liked_by_me || false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [videoPaused, setVideoPaused] = useState(true);

  const getMediaSource = path => {
    if (!path) return null;
    // Uses the base URL from your client settings or current network IP
    return path.startsWith('http')
      ? { uri: path }
      : { uri: `http://192.168.100.107:8000${path}` };
  };

  const handleLike = async () => {
    const newLikedStatus = !liked;
    setLiked(newLikedStatus);
    setLikesCount(prev => (newLikedStatus ? prev + 1 : prev - 1));
    try {
      await api.post(`api/posts/${post.id}/like/`);
    } catch (err) {
      setLiked(!newLikedStatus);
      setLikesCount(post.likes_count);
    }
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
            Alert.alert('Error', 'Could not delete post.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.card}>
      {/* HEADER: LEAGUE & MENU */}
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

      {/* AUTHOR INFO (Navigation to Profile) */}
      {/* AUTHOR SECTION */}
      <TouchableOpacity
        onPress={() => navigation.push('Profile', { userId: author?.id })}
        style={styles.authorSection}
      >
        <Image
          source={
            author?.profile_pic
              ? { uri: author.profile_pic }
              : { uri: `https://ui-avatars.com/api/?name=${author?.username}` }
          }
          style={styles.avatar}
        />
        <View style={styles.nameColumn}>
          {/* 🚀 FIX: Priority to display_name */}
          <Text style={styles.username}>
            {author?.display_name || author?.username || 'Fan'}
          </Text>
          {support && (
            <Text style={styles.supportStatus}>
              Supports <Text style={styles.teamName}>{support.team_name}</Text>
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {/* CONTENT AREA */}
      <TouchableOpacity
        onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
      >
        <View style={styles.contentBody}>
          <Text style={styles.postText}>{post.content}</Text>
        </View>

        {post.media_file && (
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
      </TouchableOpacity>

      {/* FOOTER ACTIONS */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
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
        <TouchableOpacity style={styles.actionBtn}>
          <MaterialCommunityIcons name="repeat" size={22} color="#94A3B8" />
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
  contentBody: { paddingHorizontal: 15, marginBottom: 10 },
  postText: { color: '#F1F5F9', fontSize: 15, lineHeight: 22 },
  mediaWrapper: {
    width: width - 30,
    height: 240,
    alignSelf: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1A2A3D',
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
});

export default PostCard;
