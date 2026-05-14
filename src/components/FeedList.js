/**
 * FeedList.js – ConnectDial (FIXED v3)
 * ─────────────────────────────────────────────────────────────────────
 * FIXES in this version (on top of v2):
 * ✅ FIX #7: Follow button seeds FollowContext from feed data on load.
 *            Previously FollowContext started as an empty Set, so
 *            followingIds.has(id) was always false and every post
 *            showed "Follow" even for already-followed users.
 *            Now when posts load we extract all author IDs where
 *            is_following=true and call setInitialFollowing() to seed
 *            the context. Re-seeds whenever feed data refreshes too.
 *
 * ✅ FIX #8: Follow button hidden on "Following" tab entirely.
 *            Posts in the Following feed are by definition already
 *            followed. A hideFollow={feedType === 'following'} prop is
 *            passed to PostCard so the button never shows there.
 *
 * ✅ All previous features preserved (cache-while-revalidate, etc.)
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
// ✅ FIX #7: Import useFollow so we can seed the context from feed data
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

  // ✅ FIX #7: Pull setInitialFollowing from FollowContext
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
  // ─────────────────────────────────────────────────────────────────────
  const queryKey = useMemo(
    () => ['posts', feedType, leagueId, debouncedSearch],
    [feedType, leagueId, debouncedSearch]
  );

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
      let url = `api/posts/?feed_type=${feedType}&limit=10&offset=${pageParam}`;
      if (debouncedSearch) url += `&search=${encodeURIComponent(debouncedSearch)}`;
      if (leagueId) url += `&league=${leagueId}`;
      console.log('🔄 Fetching posts from:', url);
      const response = await api.get(url);
      return response.data;
    },
    getNextPageParam: (lastPage, allPages) => {
      const nextOffset = allPages.length * 10;
      return nextOffset < (lastPage.count || 0) ? nextOffset : undefined;
    },
    initialPageParam: 0,
    enabled: true,

    // ── Cache-while-revalidate settings ──────────────────────────────
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
  // ✅ FIX #7: Seed FollowContext whenever feed data arrives
  // Extracts every author in this feed where is_following=true and
  // merges them into the shared context Set. This fixes the blank/Follow
  // state on first render when the context Set is still empty.
  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (posts.length === 0) return;
    const followedIds = posts
      .map(p => p.author_details)
      .filter(a => a?.is_following && a?.id)
      .map(a => a.id);
    if (followedIds.length > 0) {
      setInitialFollowing(followedIds);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]); // re-seed whenever query data refreshes

  // ─────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    console.log('🔄 User pulled to refresh — forcing full refetch');
    await refetch();
  };

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      console.log('📜 Reached end - loading more posts');
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
          // ✅ FIX #8: On the Following tab, hide the "Follow" button only.
          // The "Following" button stays visible so users can still unfollow.
          // On the Global/Home tab this is false so both states show normally.
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