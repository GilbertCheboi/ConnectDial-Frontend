import React, { useEffect, useState, useCallback, useContext } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Tabs } from 'react-native-collapsible-tab-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import api from '../api/client';
import PostCard from './PostCard';
import { AuthContext } from '../store/authStore';
import { useNavigation } from '@react-navigation/native';

export default function FeedList({ feedType, leagueId }) {
  const { user } = useContext(AuthContext);
  const navigation = useNavigation();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const CACHE_KEY = `@cache_${feedType}_${leagueId || 'home'}`;

  // --- 1. INITIAL LOAD (Same as your old Home) ---
  useEffect(() => {
    const initialize = async () => {
      await loadCachedPosts();
      await fetchPosts();
    };
    initialize();
  }, [feedType, leagueId]);

  // --- 2. CACHE LOGIC (Kept from your old Home) ---
  const loadCachedPosts = async () => {
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      if (cachedData) {
        setPosts(JSON.parse(cachedData));
        setLoading(false);
      }
    } catch (e) {
      console.log('Cache Error:', e);
    }
  };

  // --- 3. API LOGIC (Merged with your Onboarding/League logic) ---
  const fetchPosts = async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else if (posts.length === 0) setLoading(true);

    try {
      let url = `api/posts/?feed_type=${feedType}`;
      const preferences = user?.fan_preferences || [];

      // If user clicked a specific League in Drawer
      if (leagueId) {
        url += `&league=${leagueId}`;
      }
      // If on 'Following' tab and has preferences, apply your "Hard Filter"
      else if (feedType === 'following' && preferences.length > 0) {
        const followedIds = preferences.map(p => p.league).join(',');
        url += `&leagues=${followedIds}`;
      }

      const response = await api.get(url);
      const incoming = response.data.results || response.data;

      setPosts(incoming);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(incoming));
    } catch (err) {
      console.log('Fetch Error:', err);
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
      keyExtractor={item => item.id.toString()}
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
        />
      }
      ListEmptyComponent={
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No posts found in this feed.</Text>
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
  },
  listContent: {
    backgroundColor: '#0D1F2D',
    minHeight: '100%',
    paddingBottom: 100,
  },
  emptyText: { color: '#94A3B8', textAlign: 'center', fontSize: 16 },
});
