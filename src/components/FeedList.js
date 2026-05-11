/**
 * FeedList.js - Modern Version with TanStack Query
 * Benefits: Automatic caching, background refetch, better pagination, less boilerplate
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

import PostCard from './PostCard';
import { AuthContext } from '../store/authStore';
import { ThemeContext } from '../store/themeStore';
import { useNavigation } from '@react-navigation/native';
import api from '../api/client';

export default function FeedList({ feedType, leagueId, searchQuery = '' }) {
  const { user } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext) || {
    theme: { colors: { primary: '#1E90FF', subText: '#94A3B8', background: '#0D1F2D', text: '#F8FAFC' } },
  };

  const navigation = useNavigation();
  const queryClient = useQueryClient();

  // Debounced Search
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 450);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const queryKey = useMemo(() => [
    'posts',
    feedType,
    leagueId,
    debouncedSearch,
  ], [feedType, leagueId, debouncedSearch]);

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

      if (debouncedSearch) {
        url += `&search=${encodeURIComponent(debouncedSearch)}`;
      }
      if (leagueId) {
        url += `&league=${leagueId}`;
      }

      const response = await api.get(url);
      return response.data;
    },
    getNextPageParam: (lastPage, allPages) => {
      const nextOffset = allPages.length * 10;
      return nextOffset < (lastPage.count || 0) ? nextOffset : undefined;
    },
    initialPageParam: 0,
    enabled: !(debouncedSearch === '' && searchQuery !== undefined),
    staleTime: 1000 * 60 * 3,     // 3 minutes
    gcTime: 1000 * 60 * 10,       // 10 minutes (formerly cacheTime)
  });

  const posts = data?.pages?.flatMap(page => page.results || page) || [];

  const handleRefresh = async () => {
    await refetch();
  };

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const handleRetry = () => refetch();

  // Loading State
  if (isLoading && posts.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Error State
  if (error && posts.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <MaterialCommunityIcons name="wifi-off" size={60} color="#64748B" />
        <Text style={[styles.errorText, { color: theme.colors.subText }]}>
          Failed to load posts
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Tabs.FlatList
      data={posts}
      keyExtractor={item => item?.id?.toString()}
      renderItem={({ item }) => (
        <PostCard
          post={item}
          onDeleteSuccess={() => {
            // Invalidate query to refetch
            queryClient.invalidateQueries({ queryKey });
          }}
          onCommentPress={() =>
            navigation.navigate('Comments', { postId: item.id })
          }
        />
      )}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isFetchingNextPage ? (
          <View style={styles.loadMoreContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
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
          <Text style={[styles.emptyText, { color: theme.colors.subText }]}>
            {debouncedSearch ? 'No posts found matching your search.' : 'No posts available.'}
          </Text>
        </View>
      }
      contentContainerStyle={styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
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
    textAlign: 'center',
    fontSize: 16,
  },
  loadMoreContainer: {
    paddingVertical: 25,
    alignItems: 'center',
  },
  listContent: {
    minHeight: '100%',
    paddingTop: 15,
    paddingBottom: 120,
  },
});