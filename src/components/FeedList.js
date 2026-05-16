/**
 * FeedList.js – ConnectDial (FIXED v4)
 * ─────────────────────────────────────────────────────────────────────
 * FIXES in this version:
 *
 * ✅ FIX #9 (ROOT CAUSE): League feed was never actually filtered.
 *    The old URL was:
 *      api/posts/?feed_type=following&limit=10&offset=0&league=3
 *    The backend PostViewSet.get_queryset() ignored feed_type and league
 *    entirely — it just returned ALL posts ordered by -created_at.
 *
 *    Now:
 *    - When leagueId is set, feedType is forced to 'league' in the URL
 *    - The URL uses league_id= (matches backend param check)
 *    - Backend now reads feed_type + league_id and filters accordingly
 *
 * ✅ FIX #10: queryKey includes feedType AND leagueId so league feeds
 *    are cached separately from global/following feeds. Switching
 *    between leagues no longer shows stale data from another league.
 *
 * ✅ All previous features preserved (cache-while-revalidate,
 *    FollowContext seeding, hideFollow on following tab, etc.)
 * ─────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useState, useContext, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Tabs } from 'react-native-collapsible-tab-view';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';

import PostCard from './PostCard';
import { AuthContext } from '../store/authStore';
import { ThemeContext } from '../store/themeStore';
import { useFollow } from '../store/FollowContext';
import { useNavigation } from '@react-navigation/native';
import api from '../api/client';

export default function FeedList({ feedType, leagueId, searchQuery = '' }) {
  const { user } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext) || {
    theme: {
      colors: {
        primary: '#1E90FF',
        subText: '#94A3B8',
        background: '#0D1F2D',
        text: '#F8FAFC',
      },
    },
  };

  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { setInitialFollowing } = useFollow();

  // ─────────────────────────────────────────────────────────────────────
  // DEBOUNCED SEARCH
  // ─────────────────────────────────────────────────────────────────────
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 450);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ─────────────────────────────────────────────────────────────────────
  // QUERY KEY
  // ✅ FIX #10: leagueId is part of the key so each league gets its
  //    own cache bucket. No more stale cross-league results.
  // ─────────────────────────────────────────────────────────────────────
  const queryKey = useMemo(
    () => ['posts', feedType, leagueId ?? 'all', debouncedSearch],
    [feedType, leagueId, debouncedSearch]
  );

  // ─────────────────────────────────────────────────────────────────────
  // RESOLVE EFFECTIVE FEED TYPE
  // When a leagueId is provided, always tell the backend feed_type=league
  // regardless of what the parent screen passed as feedType.
  // ─────────────────────────────────────────────────────────────────────
  const effectiveFeedType = leagueId ? 'league' : feedType;

  // ─────────────────────────────────────────────────────────────────────
  // INFINITE QUERY
  // ─────────────────────────────────────────────────────────────────────
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
    queryKey,
    queryFn: async ({ pageParam = 0 }) => {
      // ✅ FIX #9: Build the correct URL with feed_type and league_id.
      //
      //  Old (broken):
      //    api/posts/?feed_type=following&limit=10&offset=0&league=3
      //    → backend ignored everything, returned all posts
      //
      //  New (fixed):
      //    api/posts/?feed_type=league&limit=10&offset=0&league_id=3
      //    → backend filters by league_id correctly
      //
      // NOTE: The backend also supports the legacy &league= param name,
      // but &league_id= is the canonical one used in get_queryset().
      let url =
        `api/posts/?feed_type=${effectiveFeedType}` +
        `&limit=10&offset=${pageParam}`;

      if (leagueId) {
        url += `&league_id=${leagueId}`;
      }

      if (debouncedSearch) {
        url += `&search=${encodeURIComponent(debouncedSearch)}`;
      }

      console.log('🔄 FeedList fetching:', url);
      const response = await api.get(url);
      return response.data;
    },
    getNextPageParam: (lastPage, allPages) => {
      const nextOffset = allPages.length * 10;
      return nextOffset < (lastPage.count || 0) ? nextOffset : undefined;
    },
    initialPageParam: 0,
    enabled: true,

    // ── Cache-while-revalidate ────────────────────────────────────────
    staleTime: 1000 * 60 * 2,   // 2 minutes fresh window
    gcTime:    1000 * 60 * 30,  // 30 minutes in memory after unmount
    refetchOnWindowFocus: true,
  });

  // ─────────────────────────────────────────────────────────────────────
  // Silent background revalidation on screen focus
  // ─────────────────────────────────────────────────────────────────────
  useFocusEffect(
    React.useCallback(() => {
      const state = queryClient.getQueryState(queryKey);
      const isStale =
        !state ||
        !state.dataUpdatedAt ||
        Date.now() - state.dataUpdatedAt > 1000 * 60 * 2;

      if (isStale) {
        console.log('📱 Screen focused — data stale, background refetch');
        queryClient.invalidateQueries({ queryKey, refetchType: 'active' });
      } else {
        console.log('📱 Screen focused — data fresh, showing cache');
      }
    }, [queryKey, queryClient])
  );

  // ─────────────────────────────────────────────────────────────────────
  // FLATTEN PAGINATED DATA
  // ─────────────────────────────────────────────────────────────────────
  const posts = data?.pages?.flatMap(page => page.results || page) || [];

  // ─────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    console.log('🔄 User pulled to refresh — forcing full refetch');
    await refetch();
  };

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      console.log('📜 Reached end — loading more posts');
      fetchNextPage();
    }
  };

  const handleRetry = () => {
    console.log('🔁 Retrying failed request');
    refetch();
  };

  const handleCommentPress = (postId) => {
    console.log('💬 Opening comments for post:', postId);
    navigation.navigate('Comments', { postId });
  };

  // ─────────────────────────────────────────────────────────────────────
  // LOADING STATE — only shown on very first load (no cached data)
  // ─────────────────────────────────────────────────────────────────────
  if (isLoading && posts.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.subText, marginTop: 12 }]}>
          Loading posts...
        </Text>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // ERROR STATE
  // ─────────────────────────────────────────────────────────────────────
  if (error && posts.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <MaterialCommunityIcons name="wifi-off" size={60} color="#64748B" />
        <Text style={[styles.errorText, { color: theme.colors.subText }]}>
          Failed to load posts
        </Text>
        <Text style={[styles.errorSubtext, { color: theme.colors.subText, marginTop: 8 }]}>
          {error?.message || 'Please check your connection'}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleRetry}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // MAIN FEED
  // ─────────────────────────────────────────────────────────────────────
  return (
    <Tabs.FlatList
      data={posts}
      keyExtractor={(item) => item?.id?.toString()}
      renderItem={({ item }) => (
        <PostCard
          post={item}
          // On the Following tab, hide the "Follow" button only.
          // The "Following" button stays visible so users can still unfollow.
          feedType={feedType}           // ← Add this line
          hideFollow={feedType === 'following'}
          onDeleteSuccess={() => {
            queryClient.invalidateQueries({ queryKey });
          }}
          onCommentPress={() => handleCommentPress(item.id)}
        />
      )}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isFetchingNextPage ? (
          <View style={styles.loadMoreContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.subText, marginTop: 8 }]}>
              Loading more posts...
            </Text>
          </View>
        ) : null
      }
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={handleRefresh}
          tintColor={theme.colors.primary}
          progressViewOffset={20}
        />
      }
      ListEmptyComponent={
        <View style={[styles.centered, { backgroundColor: theme.colors.background, minHeight: 300 }]}>
          <MaterialCommunityIcons
            name="inbox-multiple-outline"
            size={48}
            color={theme.colors.subText}
          />
          <Text style={[styles.emptyText, { color: theme.colors.subText, marginTop: 12 }]}>
            {debouncedSearch
              ? 'No posts found matching your search.'
              : leagueId
              ? 'No posts in this league yet.'
              : 'No posts available.'}
          </Text>
        </View>
      }
      contentContainerStyle={styles.listContent}
      scrollEnabled={true}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 12,
    fontWeight: '600',
  },
  errorSubtext: { fontSize: 13 },
  retryButton: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  emptyText: { textAlign: 'center', fontSize: 16, fontWeight: '500' },
  loadMoreContainer: {
    paddingVertical: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    minHeight: '100%',
    paddingTop: 64,
    paddingBottom: 120,
  },
});