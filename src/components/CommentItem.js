import React, { useContext } from 'react';
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
import api from '../api/client';
import { ThemeContext } from '../store/themeStore';

const CommentItem = ({
  comment,
  postAuthorId,
  onDeleteSuccess,
  onEditPress,
}) => {
  const { user } = useContext(AuthContext);
  const navigation = useNavigation();
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

  // 🚀 Data from your new CommentSerializer logic
  const author = comment.author_details;
  const support = comment.supporting_info;

  const isCommentOwner = user?.id === author?.id;
  const isPostAuthor = author?.id === postAuthorId;
  const isLikedByMe = comment.liked_by_me || false;

  // 🚀 Profile Image with Absolute URI from Serializer or UI-Avatars fallback
  const profileImageUri = author?.profile_pic
    ? author.profile_pic
    : `https://ui-avatars.com/api/?name=${
        author?.username || 'U'
      }&background=162A3B&color=fff`;

  const handleLongPress = () => {
    if (!isCommentOwner) return;
    Alert.alert('Comment Options', 'Select an action', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Edit', onPress: () => onEditPress(comment) },
      { text: 'Delete', style: 'destructive', onPress: confirmDelete },
    ]);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`api/posts/comments/${comment.id}/`);
      onDeleteSuccess(comment.id);
    } catch (err) {
      Alert.alert('Error', 'Could not delete comment.');
    }
  };

  const handleLike = async () => {
    try {
      // Logic for liking a comment goes here
      // await api.post(`api/posts/comments/${comment.id}/like/`);
    } catch (err) {
      console.log('Like error', err);
    }
  };

  return (
    <TouchableOpacity onLongPress={handleLongPress} activeOpacity={0.9}>
      <View style={styles.commentContainer}>
        {/* 🚀 Profile Image */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile', { userId: author?.id })}
        >
          <Image
            source={{ uri: profileImageUri }}
            style={styles.commentAvatar}
          />
        </TouchableOpacity>

        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('Profile', { userId: author?.id })
              }
            >
              <Text style={[styles.commentUser, { color: theme.colors.text }]}>
                {/* 🚀 Using display_name from Serializer */}
                {author?.display_name || author?.username || 'User'}
              </Text>
            </TouchableOpacity>

            {/* 🚀 Team Badge restored from supporting_info */}
            {support?.team_name && (
              <View
                style={[
                  styles.teamBadge,
                  {
                    backgroundColor: theme.colors.primary + '20',
                    borderColor: theme.colors.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.teamBadgeText,
                    { color: theme.colors.primary },
                  ]}
                >
                  {support.team_name}
                </Text>
              </View>
            )}

            {isPostAuthor && (
              <View
                style={[styles.tag, { backgroundColor: theme.colors.primary }]}
              >
                <Text
                  style={[styles.tagText, { color: theme.colors.buttonText }]}
                >
                  Author
                </Text>
              </View>
            )}
          </View>

          {/* 🚀 Autolink for Mentions and Hashtags */}
          <Autolink
            text={comment.content}
            style={[styles.commentBody, { color: theme.colors.text }]}
            linkStyle={[styles.linkText, { color: theme.colors.primary }]}
            mention="twitter"
            hashtag="instagram"
            onPress={(url, match) => {
              if (match.getType() === 'mention') {
                const username = match.getAnchorText().replace('@', '');
                navigation.navigate('Profile', { username: username });
              } else if (match.getType() === 'hashtag') {
                const tag = match.getAnchorText();
                navigation.navigate('Search', { query: tag });
              } else {
                Linking.openURL(url);
              }
            }}
          />

          <View style={styles.bottomRow}>
            <View style={styles.commentActions}>
              <TouchableOpacity style={styles.miniAction} onPress={handleLike}>
                <MaterialCommunityIcons
                  name={isLikedByMe ? 'heart' : 'heart-outline'}
                  size={14}
                  color={
                    isLikedByMe
                      ? theme.colors.notificationBadge
                      : theme.colors.subText
                  }
                />
                <Text
                  style={[
                    styles.actionText,
                    { color: theme.colors.subText },
                    isLikedByMe && { color: theme.colors.notificationBadge },
                  ]}
                >
                  {comment.likes_count || 0}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.miniAction, { marginLeft: 20 }]}>
                <Text
                  style={[styles.actionText, { color: theme.colors.subText }]}
                >
                  Reply
                </Text>
              </TouchableOpacity>
            </View>

            {/* 🚀 Notification that the post author liked this comment */}
            {comment.liked_by_author && (
              <View style={styles.authorLikeBadge}>
                <MaterialCommunityIcons
                  name="heart"
                  size={10}
                  color={theme.colors.notificationBadge}
                />
                <Text
                  style={[
                    styles.authorLikeText,
                    { color: theme.colors.notificationBadge },
                  ]}
                >
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
  commentContainer: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 0.5,
  },
  commentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  commentContent: { flex: 1, marginLeft: 12 },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  commentUser: { fontWeight: '700', fontSize: 14 },
  commentBody: { fontSize: 14, lineHeight: 20 },
  linkText: { fontWeight: '600' },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  commentActions: { flexDirection: 'row', alignItems: 'center' },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  miniAction: { flexDirection: 'row', alignItems: 'center' },
  teamBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 8,
    borderWidth: 0.5,
  },
  teamBadgeText: { fontSize: 10, fontWeight: '600' },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 8,
  },
  tagText: { fontSize: 9, fontWeight: 'bold' },
  authorLikeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
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
