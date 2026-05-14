/**
 * FeedList.js - Modern Version with TanStack Query + Auto-Fetch on Entry
 * ─────────────────────────────────────────────────────────────────────────
 * FEATURES:
 * ✅ Auto-fetch posts when screen is focused (first time or return)
 * ✅ Comments integrated with proper navigation
 * ✅ Infinite scroll pagination
 * ✅ Pull-to-refresh
 * ✅ Search functionality
 * ✅ Error handling & retry
 * ─────────────────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────
  // DEBOUNCED SEARCH
  // ─────────────────────────────────────────────────────────────────────
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 450);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ─────────────────────────────────────────────────────────────────────
  // QUERY KEY (changes when feed, league, or search changes)
  // ─────────────────────────────────────────────────────────────────────
  const queryKey = useMemo(
    () => ['posts', feedType, leagueId, debouncedSearch],
    [feedType, leagueId, debouncedSearch]
  );

  // ─────────────────────────────────────────────────────────────────────
  // INFINITE QUERY - FETCH POSTS WITH PAGINATION
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
      // Build API URL with filters
      let url = `api/posts/?feed_type=${feedType}&limit=10&offset=${pageParam}`;

      if (debouncedSearch) {
        url += `&search=${encodeURIComponent(debouncedSearch)}`;
      }
      if (leagueId) {
        url += `&league=${leagueId}`;
      }

      console.log('🔄 Fetching posts from:', url);
      const response = await api.get(url);
      return response.data;
    },
    getNextPageParam: (lastPage, allPages) => {
      const nextOffset = allPages.length * 10;
      return nextOffset < (lastPage.count || 0) ? nextOffset : undefined;
    },
    initialPageParam: 0,
    enabled: !(debouncedSearch === '' && searchQuery !== undefined),
    staleTime: 1000 * 60 * 3, // 3 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
  });

  // ─────────────────────────────────────────────────────────────────────
  // AUTO-FETCH WHEN SCREEN COMES INTO FOCUS
  // ─────────────────────────────────────────────────────────────────────
  useFocusEffect(
    React.useCallback(() => {
      console.log('📱 Screen focused - checking if refetch needed');
      
      // Refetch posts when returning to this screen
      // This ensures fresh data when user navigates back from comments
      refetch();
    }, [refetch])
  );

  // ─────────────────────────────────────────────────────────────────────
  // FLATTEN PAGINATED DATA
  // ─────────────────────────────────────────────────────────────────────
  const posts = data?.pages?.flatMap(page => page.results || page) || [];

  // ─────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    console.log('🔄 User pulled to refresh');
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

  // ─────────────────────────────────────────────────────────────────────
  // COMMENT BUTTON HANDLER
  // ─────────────────────────────────────────────────────────────────────
  const handleCommentPress = (postId) => {
    console.log('💬 Opening comments for post:', postId);
    navigation.navigate('Comments', { postId });
  };

  // ─────────────────────────────────────────────────────────────────────
  // LOADING STATE (Initial Load)
  // ─────────────────────────────────────────────────────────────────────
  if (isLoading && posts.length === 0) {
    return (
      <View
        style={[
          styles.centered,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text
          style={[
            styles.loadingText,
            { color: theme.colors.subText, marginTop: 12 },
          ]}
        >
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
      <View
        style={[
          styles.centered,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <MaterialCommunityIcons name="wifi-off" size={60} color="#64748B" />
        <Text
          style={[styles.errorText, { color: theme.colors.subText }]}
        >
          Failed to load posts
        </Text>
        <Text
          style={[
            styles.errorSubtext,
            { color: theme.colors.subText, marginTop: 8 },
          ]}
        >
          {error?.message || 'Please check your connection'}
        </Text>
        <TouchableOpacity
          style={[
            styles.retryButton,
            { backgroundColor: theme.colors.primary },
          ]}
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
          // ✅ Delete handler - invalidates query to refetch
          onDeleteSuccess={() => {
            queryClient.invalidateQueries({ queryKey });
          }}
          // ✅ COMMENT PRESS - navigates to Comments screen
          onCommentPress={() => handleCommentPress(item.id)}
        />
      )}
      // ─────────────────────────────────────────────────────────────────
      // INFINITE SCROLL - Load more posts when reaching end
      // ─────────────────────────────────────────────────────────────────
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isFetchingNextPage ? (
          <View style={styles.loadMoreContainer}>
            <ActivityIndicator
              size="small"
              color={theme.colors.primary}
            />
            <Text
              style={[
                styles.loadingText,
                { color: theme.colors.subText, marginTop: 8 },
              ]}
            >
              Loading more posts...
            </Text>
          </View>
        ) : null
      }
      // ─────────────────────────────────────────────────────────────────
      // PULL-TO-REFRESH
      // ─────────────────────────────────────────────────────────────────
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={handleRefresh}
          tintColor={theme.colors.primary}
          progressViewOffset={20}
        />
      }
      // ─────────────────────────────────────────────────────────────────
      // EMPTY STATE
      // ─────────────────────────────────────────────────────────────────
      ListEmptyComponent={
        <View
          style={[
            styles.centered,
            { backgroundColor: theme.colors.background, minHeight: 300 },
          ]}
        >
          <MaterialCommunityIcons
            name="inbox-multiple-outline"
            size={48}
            color={theme.colors.subText}
          />
          <Text
            style={[
              styles.emptyText,
              { color: theme.colors.subText, marginTop: 12 },
            ]}
          >
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
  errorSubtext: {
    fontSize: 13,
  },
  retryButton: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
  },
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