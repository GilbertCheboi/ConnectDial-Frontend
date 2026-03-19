import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');

const PostCard = ({ post }) => {
  const author = post.author_details;
  const support = post.supporting_info;

  // --- HELPER: Handles Backend URLs & Remote Placeholders ---
  const getProfileImage = path => {
    if (path) {
      // If it's already a full URL, use it; otherwise, prepend your backend IP
      if (path.startsWith('http')) return { uri: path };
      return { uri: `http://192.168.1.10:8000${path}` }; // REPLACE WITH YOUR IP
    }
    // REMOTE PLACEHOLDER: Use a UI-friendly placeholder if no local assets exist
    return {
      uri: `https://ui-avatars.com/api/?name=${
        author?.username || 'U'
      }&background=1E90FF&color=fff&bold=true`,
    };
  };

  const getPostMedia = path => {
    if (!path) return null;
    if (path.startsWith('http')) return { uri: path };
    return { uri: `http://192.168.1.10:8000${path}` }; // REPLACE WITH YOUR IP
  };

  return (
    <View style={styles.card}>
      {/* --- HEADER --- */}
      <View style={styles.header}>
        <View style={styles.authorRow}>
          {/* Circular Avatar using Remote URL */}
          <View style={styles.avatarWrapper}>
            <Image
              source={getProfileImage(author?.profile_pic)}
              style={styles.avatar}
            />
          </View>

          <View style={styles.nameColumn}>
            <View style={styles.userRow}>
              <Text style={styles.username}>{author?.username || 'Fan'}</Text>
              {author?.fan_badge &&
                author.fan_badge !== 'Awaiting Partnership' && (
                  <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>{author.fan_badge}</Text>
                  </View>
                )}
            </View>

            {/* Contextual Team Support */}
            {support && (
              <Text style={styles.supportStatus}>
                Supports{' '}
                <Text style={styles.teamName}>{support.team_name}</Text>
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity>
          <MaterialCommunityIcons
            name="dots-horizontal"
            size={20}
            color="#64748B"
          />
        </TouchableOpacity>
      </View>

      {/* --- POST CONTENT --- */}
      <Text style={styles.postText}>{post.content}</Text>

      {/* --- POST MEDIA --- */}
      {post.media_file && (
        <View style={styles.mediaContainer}>
          <Image
            source={getPostMedia(post.media_file)}
            style={styles.mediaImage}
            resizeMode="cover"
          />
        </View>
      )}

      {/* --- FOOTER ACTIONS --- */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.actionBtn}>
          <MaterialCommunityIcons
            name={post.liked_by_me ? 'heart' : 'heart-outline'}
            size={22}
            color={post.liked_by_me ? '#FF4B4B' : '#94A3B8'}
          />
          <Text
            style={[
              styles.actionText,
              post.liked_by_me && { color: '#FF4B4B' },
            ]}
          >
            {post.likes_count || 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn}>
          <MaterialCommunityIcons
            name="comment-outline"
            size={20}
            color="#94A3B8"
          />
          <Text style={styles.actionText}>{post.comments_count || 0}</Text>
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
    backgroundColor: '#0D1F2D', // Deep navy/dark theme
    marginBottom: 8,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1A2A3D',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E90FF',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1A2A3D',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  nameColumn: {
    marginLeft: 12,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  badgeContainer: {
    backgroundColor: '#FFD70025',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 8,
    borderWidth: 0.5,
    borderColor: '#FFD700',
  },
  badgeText: {
    color: '#FFD700',
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  supportStatus: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  teamName: {
    color: '#1E90FF',
    fontWeight: '700',
  },
  postText: {
    color: '#E2E8F0',
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  mediaContainer: {
    width: width - 30,
    height: 200,
    alignSelf: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1A2A3D',
    marginBottom: 10,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#1A2A3D',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    color: '#94A3B8',
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
  },
});

export default PostCard;
