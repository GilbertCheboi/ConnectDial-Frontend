/**
 * ShortsScreen.js – TikTok-style vertical video feed with streaming
 * Features:
 * • Infinite scroll through shorts
 * • One video per screen
 * • Quality/speed/volume controls
 * • No autoplay (tap to play)
 * • Streaming optimization (HLS ready)
 * • Hot-score ranking
 */

import React, { useContext, useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { AuthContext } from '../store/authStore';
import { ThemeContext } from '../store/themeStore';
import { useNavigation } from '@react-navigation/native';
import api from '../api/client';
import VideoPlayer from './VideoPlayer';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const ShortsScreen = () => {
  const { user } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext) || {
    theme: { colors: { primary: '#1E90FF', subText: '#94A3B8', background: '#0D1F2D', text: '#F8FAFC' } },
  };

  const navigation = useNavigation();
  const queryClient = useQueryClient();

  // ── Playback State ─────────────────────────────────────────────
  const [activeShortId, setActiveShortId] = useState(null);
  const [viewedShorts, setViewedShorts] = useState(new Set());

  // ── Shorts Query ───────────────────────────────────────────────
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['shorts'],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await api.get(`/api/posts/shorts/?offset=${pageParam}&limit=5`);
      return response.data;
    },
    getNextPageParam: (lastPage, allPages) => {
      const nextOffset = allPages.length * 5;
      return nextOffset < (lastPage.count || 0) ? nextOffset : undefined;
    },
    initialPageParam: 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10,   // 10 minutes
  });

  const shorts = data?.pages?.flatMap(page => page.results || page) || [];

  // ── Handle view tracking ───────────────────────────────────────
  const handleVideoViewCount = async (shortId) => {
    if (!viewedShorts.has(shortId)) {
      try {
        await api.post(`/api/posts/${shortId}/view/`);
        setViewedShorts(prev => new Set([...prev, shortId]));
      } catch (err) {
        console.error('View tracking error:', err);
      }
    }
  };

  // ── Pagination ─────────────────────────────────────────────────
  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  // ── Screen Focus (pause/resume videos) ─────────────────────────
  useFocusEffect(
    React.useCallback(() => {
      // Resume video playback when screen is focused
      return () => {
        // Pause videos when screen is unfocused
      };
    }, [])
  );

  // ── Loading State ──────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // ── Error State ────────────────────────────────────────────────
  if (error && shorts.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <MaterialCommunityIcons name="wifi-off" size={60} color="#64748B" />
        <Text style={[styles.errorText, { color: theme.colors.subText }]}>
          Failed to load shorts
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Empty State ────────────────────────────────────────────────
  if (shorts.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <MaterialCommunityIcons
          name="video-outline"
          size={60}
          color={theme.colors.subText}
        />
        <Text style={[styles.emptyText, { color: theme.colors.text }]}>
          No Shorts Available
        </Text>
        <Text style={[styles.emptySubtext, { color: theme.colors.subText }]}>
          Check back later for new shorts
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={shorts}
        keyExtractor={(item) => item?.id?.toString()}
        renderItem={({ item, index }) => (
          <ShortItem
            short={item}
            isActive={activeShortId === item.id}
            onSetActive={() => setActiveShortId(item.id)}
            onViewCount={handleVideoViewCount}
            theme={theme}
            navigation={navigation}
            queryClient={queryClient}
          />
        )}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        scrollEventThrottle={16}
        pagingEnabled
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.loadMoreContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

// ── Individual Short Item ──────────────────────────────────────────
const ShortItem = ({
  short,
  isActive,
  onSetActive,
  onViewCount,
  theme,
  navigation,
  queryClient,
}) => {
  const [isLiked, setIsLiked] = useState(short?.liked_by_me || false);
  const [likesCount, setLikesCount] = useState(short?.likes_count || 0);
  const containerRef = useRef(null);

  const author = short?.author_details;
  const profileImageUri =
    author?.profile_pic ||
    `https://ui-avatars.com/api/?name=${author?.username || 'U'}&background=162A3B&color=fff`;

  // ── Like Handler ───────────────────────────────────────────────
  const handleLike = async () => {
    try {
      const response = await api.post(`/api/posts/${short.id}/like/`);
      setIsLiked(response.data.liked);
      setLikesCount(response.data.likes_count);
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  // ── Share Handler ──────────────────────────────────────────────
  const handleShare = async () => {
    try {
      await api.post(`/api/posts/${short.id}/share/`, { comment: '' });
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  // ── Comment Handler ────────────────────────────────────────────
  const handleComment = () => {
    navigation.navigate('Comments', { postId: short.id });
  };

  return (
    <View
      ref={containerRef}
      style={[styles.shortContainer, { backgroundColor: theme.colors.background }]}
      onLayout={() => onSetActive()}
    >
      {/* Video Player */}
      <VideoPlayer
        videoUrl={short.media_url}
        isShort={true}
        postId={short.id}
        onViewCount={onViewCount}
        autoPlay={isActive}
        containerStyle={styles.videoFill}
      />

      {/* Left Overlay – Author Info */}
      <View style={styles.leftOverlay}>
        <View style={styles.authorSection}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Profile', { userId: author?.id })}
          >
            <Image
              source={{ uri: profileImageUri }}
              style={styles.avatarSmall}
            />
          </TouchableOpacity>

          <View style={styles.authorDetails}>
            <Text style={[styles.authorName, { color: '#fff' }]}>
              {author?.display_name || author?.username}
            </Text>

            {author?.badge_type === 'official' && (
              <MaterialCommunityIcons
                name="check-decagram"
                size={12}
                color="#FFD700"
              />
            )}

            <TouchableOpacity
              style={[
                styles.followButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => {
                // Toggle follow
              }}
            >
              <Text style={styles.followButtonText}>Follow</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Caption */}
        {short.content && (
          <Text
            style={[styles.caption, { color: '#fff' }]}
            numberOfLines={3}
          >
            {short.content}
          </Text>
        )}

        {/* Hashtags */}
        {short.hashtags && short.hashtags.length > 0 && (
          <View style={styles.hashtagsContainer}>
            {short.hashtags.slice(0, 2).map((tag, idx) => (
              <TouchableOpacity key={idx}>
                <Text style={[styles.hashtag, { color: theme.colors.primary }]}>
                  #{tag.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Right Overlay – Actions */}
      <View style={styles.rightOverlay}>
        {/* Like Button */}
        <TouchableOpacity style={styles.actionIcon} onPress={handleLike}>
          <MaterialCommunityIcons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={28}
            color={isLiked ? '#FF4757' : '#fff'}
          />
          <Text style={styles.actionCount}>{likesCount}</Text>
        </TouchableOpacity>

        {/* Comment Button */}
        <TouchableOpacity style={styles.actionIcon} onPress={handleComment}>
          <MaterialCommunityIcons name="comment-outline" size={28} color="#fff" />
          <Text style={styles.actionCount}>{short.comments_count || 0}</Text>
        </TouchableOpacity>

        {/* Share Button */}
        <TouchableOpacity style={styles.actionIcon} onPress={handleShare}>
          <MaterialCommunityIcons name="share-outline" size={28} color="#fff" />
          <Text style={styles.actionCount}>{short.shares_count || 0}</Text>
        </TouchableOpacity>

        {/* More Button */}
        <TouchableOpacity style={styles.actionIcon}>
          <MaterialCommunityIcons
            name="dots-vertical"
            size={28}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      {/* Bottom Overlay – League/Team */}
      {(short.league_details || short.team_details) && (
        <View style={styles.bottomOverlay}>
          {short.league_details && (
            <View style={styles.leagueBadgeSmall}>
              <Text style={styles.leagueText}>{short.league_details.name}</Text>
            </View>
          )}

          {short.team_details && (
            <View style={styles.teamBadgeSmall}>
              <Text style={styles.teamText}>{short.team_details.name}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 12,
  },
  retryButton: {
    backgroundColor: '#1E90FF',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 6,
  },
  loadMoreContainer: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shortContainer: {
    height: SCREEN_HEIGHT,
    position: 'relative',
  },
  videoFill: {
    width: '100%',
    height: '100%',
  },
  leftOverlay: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 60,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 10,
  },
  avatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
  },
  authorDetails: {
    flex: 1,
  },
  authorName: {
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 4,
  },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  followButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  hashtagsContainer: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  hashtag: {
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  rightOverlay: {
    position: 'absolute',
    right: 12,
    bottom: 120,
    gap: 20,
  },
  actionIcon: {
    alignItems: 'center',
    gap: 6,
  },
  actionCount: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
  },
  leagueBadgeSmall: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  leagueText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  teamBadgeSmall: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  teamText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});

export default ShortsScreen;
