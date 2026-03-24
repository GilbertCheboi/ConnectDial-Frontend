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
import { useNavigation } from '@react-navigation/native';

export default function FeedList({ feedType, leagueId, searchQuery }) {
  const { user } = useContext(AuthContext);
  const navigation = useNavigation();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const CACHE_KEY = `@cache_${feedType}_${leagueId || 'home'}_${
    searchQuery || ''
  }`;

  useEffect(() => {
    const initialize = async () => {
      // 🚀 THE GUARD: If we are on the Search tab but haven't typed anything yet,
      // clear the list and don't fetch.
      if (searchQuery === '') {
        setPosts([]);
        setLoading(false);
        return;
      }

      await loadCachedPosts();
      await fetchPosts();
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

  const fetchPosts = async (showRefreshing = false) => {
    if (searchQuery === '') return;

    if (showRefreshing) setIsRefreshing(true);
    else if (posts.length === 0) setLoading(true);

    try {
      let url = `api/posts/?feed_type=${feedType}`;

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
      const incoming = response.data.results || response.data;

      setPosts(incoming);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(incoming));
    } catch (err) {
      console.error('Fetch Error:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  if (loading && posts.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1E90FF" />
      </View>
    );
  }

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
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => fetchPosts(true)}
          tintColor="#1E90FF"
          // 🚀 Offset the spinner so it's visible below the tab bar
          progressViewOffset={20}
        />
      }
      ListEmptyComponent={
        <View style={styles.centered}>
          <Text style={styles.emptyText}>
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
    backgroundColor: '#0D1F2D',
    minHeight: 400, // 🚀 Prevents collapsing when empty
  },
  listContent: {
    backgroundColor: '#0D1F2D',
    minHeight: '100%',
    paddingTop: 15, // 🚀 FIX: Space between Tab Bar and first Post
    paddingBottom: 120, // 🚀 FIX: Extra space for bottom navigation
  },
  emptyText: { color: '#94A3B8', textAlign: 'center', fontSize: 16 },
});
