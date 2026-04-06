import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  RefreshControl,
} from 'react-native';
// 🚀 IMPORTANT: Ensure you are using Tabs.FlatList
import { Tabs } from 'react-native-collapsible-tab-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';
import PostCard from './PostCard';
import { AuthContext } from '../store/authStore';
import { ThemeContext } from '../store/themeStore';
import { useNavigation } from '@react-navigation/native';

export default function FeedList({ feedType, leagueId, searchQuery }) {
  const { user } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext) || {
    theme: {
      colors: { primary: '#1E90FF', subText: '#94A3B8', background: '#0D1F2D' },
    },
  };
  const navigation = useNavigation();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const CACHE_KEY = `@cache_${feedType}_${leagueId || 'home'}_${
    searchQuery || ''
  }`;
  const PAGE_SIZE = 10;

  useEffect(() => {
    const initialize = async () => {
      // 🚀 Reset pagination when filters change
      setOffset(0);
      setHasMore(true);
      setPosts([]);

      // 🚀 THE GUARD: If we are on the Search tab but haven't typed anything yet,
      // clear the list and don't fetch.
      if (searchQuery === '') {
        setLoading(false);
        return;
      }

      await loadCachedPosts();
      await fetchPosts(0, true); // Fetch from offset 0, not refreshing
    };
    initialize();
  }, [feedType, leagueId, searchQuery]);

  const loadCachedPosts = async () => {
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      if (cachedData) {
        setPosts(JSON.parse(cachedData));
      }
    } catch (e) {
      console.log('Cache Error:', e);
    }
  };

  const fetchPosts = async (pageOffset = 0, isInitial = false) => {
    if (searchQuery === '') return;
    if (!hasMore && pageOffset > 0) return; // Don't fetch if no more pages

    // Set loading states
    if (isInitial || pageOffset === 0) {
      setLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      let url = `api/posts/?feed_type=${feedType}&limit=${PAGE_SIZE}&offset=${pageOffset}`;

      if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`;
      }

      const preferences = user?.fan_preferences || [];
      if (leagueId) {
        url += `&league=${leagueId}`;
      } else if (preferences.length > 0) {
        const followedIds = preferences.map(p => p.league).join(',');
        url += `&leagues=${followedIds}`;
      }

      const response = await api.get(url);

      // 🚀 Handle paginated response
      const data = response.data;
      const incoming = data.results || data;
      const totalCount = data.count || 0;

      if (pageOffset === 0) {
        // 🚀 First page: replace all
        setPosts(incoming);
      } else {
        // 🚀 Subsequent pages: append
        setPosts(prev => [...prev, ...incoming]);
      }

      // 🚀 Check if there are more pages
      const nextOffset = pageOffset + PAGE_SIZE;
      setHasMore(nextOffset < totalCount);
      setOffset(nextOffset);

      // Cache first page only
      if (pageOffset === 0) {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(incoming));
      }
    } catch (err) {
      console.error('Fetch Error:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  };

  if (loading && posts.length === 0) {
    return (
      <View
        style={[styles.centered, { backgroundColor: theme.colors.background }]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const handleEndReached = ({ distanceFromEnd }) => {
    // 🚀 Trigger load more when within 500 points of end
    if (distanceFromEnd < 500 && hasMore && !isLoadingMore && !loading) {
      fetchPosts(offset, false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setOffset(0);
    setHasMore(true);
    fetchPosts(0, false);
  };

  return (
    <Tabs.FlatList
      data={posts}
      keyExtractor={item => item?.id?.toString() || Math.random().toString()}
      renderItem={({ item }) => (
        <PostCard
          post={item}
          onDeleteSuccess={id =>
            setPosts(prev => prev.filter(p => p.id !== id))
          }
          onCommentPress={() =>
            navigation.navigate('Comments', { postId: item.id })
          }
        />
      )}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isLoadingMore ? (
          <View style={styles.loadMoreContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        ) : null
      }
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={theme.colors.primary}
          // 🚀 Offset the spinner so it's visible below the tab bar
          progressViewOffset={20}
        />
      }
      ListEmptyComponent={
        <View
          style={[
            styles.centered,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <Text style={[styles.emptyText, { color: theme.colors.subText }]}>
            {searchQuery === ''
              ? 'Type something to search for posts...'
              : 'No posts found matching your search.'}
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
    minHeight: 400, // 🚀 Prevents collapsing when empty
  },
  listContent: {
    minHeight: '100%',
    paddingTop: 15, // 🚀 FIX: Space between Tab Bar and first Post
    paddingBottom: 120, // 🚀 FIX: Extra space for bottom navigation
  },
  emptyText: { textAlign: 'center', fontSize: 16 },
  loadMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
