/**
 * FeedList.js – ConnectDial (FIXED v2)
 * ─────────────────────────────────────────────────────────────────────
 * FIXES in this version:
 * ✅ FIX #6: Cache-while-revalidate — on app reopen, cached posts show
 *            instantly while a silent background refetch updates them.
 *            Previously refetch() on every focus caused a blank flash
 *            because it triggered isLoading=true and cleared the list.
 *
 *   HOW IT WORKS:
 *   - staleTime: 2 min  → data is "fresh" for 2 min, no refetch needed
 *   - gcTime: 30 min    → cache kept in memory for 30 min after unmount
 *   - On focus: if data is stale, TanStack Query revalidates in the
 *     background (cached data stays visible, no loading spinner)
 *   - If app was closed/backgrounded > 2 min, focus triggers a silent
 *     background fetch — user sees old posts while new ones load in
 *   - Pull-to-refresh still forces an immediate full refetch
 *
 * ✅ All previous features preserved
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tabs } from 'react-native-collapsible-tab-view';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';

import PostCard from './PostCard';
import { AuthContext } from '../store/authStore';
import { ThemeContext } from '../store/themeStore';
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
  const [initialData, setInitialData] = useState(null);

  const storageKey = useMemo(() => {
    const leaguePart = leagueId ? `league:${leagueId}` : 'league:all';
    const searchPart = debouncedSearch ? `search:${debouncedSearch}` : 'search:none';
    return `feed-cache:${feedType}:${leaguePart}:${searchPart}`;
  }, [feedType, leagueId, debouncedSearch]);

  // ─────────────────────────────────────────────────────────────────────
  // DEBOUNCED SEARCH
  // ─────────────────────────────────────────────────────────────────────
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 450);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    let active = true;

    const hydrateFeedCache = async () => {
      try {
        const cached = await AsyncStorage.getItem(storageKey);
        if (!cached || !active) return;

        const parsed = JSON.parse(cached);
        if (parsed?.pages) {
          setInitialData(parsed);
        }
      } catch (err) {
        console.log('Feed cache hydration failed:', err);
      }
    };

    // Reset initialData when storageKey changes (leagueId/search changes)
    setInitialData(null);
    hydrateFeedCache();

    return () => {
      active = false;
    };
  }, [storageKey]);

  // ─────────────────────────────────────────────────────────────────────
  // QUERY KEY
  // ─────────────────────────────────────────────────────────────────────
  const queryKey = useMemo(
    () => ['posts', feedType, leagueId, debouncedSearch],
    [feedType, leagueId, debouncedSearch]
  );

  // ─────────────────────────────────────────────────────────────────────
  // INVALIDATE QUERY WHEN LEAGUE/SEARCH CHANGES
  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    // When leagueId or search changes, invalidate the previous query
    // This ensures we don't show stale data from a different league
    queryClient.invalidateQueries({
      queryKey: ['posts', feedType],
      refetchType: 'none', // Don't refetch yet, just mark as stale
    });
  }, [leagueId, debouncedSearch, feedType, queryClient]);

  // ─────────────────────────────────────────────────────────────────────
  // TRIGGER REFETCH WHEN LEAGUE CHANGES
  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (leagueId !== undefined) { // Only refetch if we have a leagueId (including null for global)
      queryClient.invalidateQueries({ queryKey, refetchType: 'active' });
    }
  }, [leagueId, queryClient, queryKey]);

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
    initialData: initialData || undefined,
    enabled: true,

    // ── FIX #6: Cache-while-revalidate settings ──────────────────────
    // staleTime: posts are "fresh" for 2 minutes. Within 2 min of the
    // last fetch, focus will NOT trigger a refetch — user sees cached
    // data with zero loading. After 2 min (e.g. user was away), the
    // data is "stale": a background refetch fires but the cached list
    // stays visible while it loads. No blank flash.
    staleTime: 1000 * 60 * 2,   // 2 minutes — adjust to taste
    gcTime:    1000 * 60 * 30,  // 30 minutes in memory after unmount
                                 // (was 10 — raised so reopening app
                                 //  after a short break still has cache)

    // refetchOnWindowFocus is web-only but kept for completeness
    refetchOnWindowFocus: true,
  });

  // ─────────────────────────────────────────────────────────────────────
  // FIX #6: Silent background revalidation on screen focus
  // ─────────────────────────────────────────────────────────────────────
  // We do NOT call refetch() unconditionally — that forces a full reload
  // and clears the list. Instead we let TanStack Query decide:
  //   - If data is fresh (< 2 min old): nothing happens, cache shown
  //   - If data is stale: background fetch fires, cache shown while loading
  // The user only ever sees a blank loading state on the very first load.
  useFocusEffect(
    React.useCallback(() => {
      const state = queryClient.getQueryState(queryKey);
      const isStale =
        !state ||
        !state.dataUpdatedAt ||
        Date.now() - state.dataUpdatedAt > 1000 * 60 * 2;

      if (isStale) {
        console.log('📱 Screen focused — data stale, background refetch');
        // refetchType: 'active' = refetch silently without clearing cache
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

  useEffect(() => {
    if (!data?.pages) return;

    const payload = {
      pages: data.pages,
      pageParams: data.pageParams || [],
    };

    AsyncStorage.setItem(storageKey, JSON.stringify(payload)).catch(err => {
      console.log('Feed cache save failed:', err);
    });
  }, [data, storageKey]);

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