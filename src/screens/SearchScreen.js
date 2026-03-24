import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Keyboard,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Tabs, MaterialTabBar } from 'react-native-collapsible-tab-view';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import FeedList from '../components/FeedList';
import UserList from '../components/UserList';
import api from '../api/client';

const RECENT_SEARCHES_KEY = '@recent_searches';

export default function SearchScreen() {
  const route = useRoute();
  const navigation = useNavigation();

  const [query, setQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [recentSearches, setRecentSearches] = useState([]);
  const [trendingTags, setTrendingTags] = useState([]); // Default to empty array
  const [isTrendingLoading, setIsTrendingLoading] = useState(false);

  // 🚀 Fetch Trending Tags on Mount
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        setIsTrendingLoading(true);
        // Ensure this matches your router: router.register(r'hashtags', HashtagViewSet)
        const response = await api.get('api/posts/hashtags/trending/');

        // Safety Check: Ensure data is an array
        if (Array.isArray(response.data)) {
          setTrendingTags(response.data);
        } else if (
          response.data?.results &&
          Array.isArray(response.data.results)
        ) {
          setTrendingTags(response.data.results);
        } else {
          setTrendingTags([]); // Fallback
        }
      } catch (err) {
        console.log('Trending fetch error', err);
        setTrendingTags([]); // Prevent crash on error
      } finally {
        setIsTrendingLoading(false);
      }
    };
    fetchTrending();
    loadRecentSearches();
  }, []);

  // 🚀 Handle Navigation from Feed (Hashtag/Mention clicks)
  useEffect(() => {
    if (route.params?.query) {
      handleSearch(route.params.query);
      navigation.setParams({ query: undefined });
    }
  }, [route.params?.query]);

  const loadRecentSearches = async () => {
    try {
      const saved = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch (e) {
      console.log(e);
    }
  };

  const saveSearch = async searchTerm => {
    if (!searchTerm.trim()) return;
    const filtered = recentSearches.filter(
      item => item.toLowerCase() !== searchTerm.toLowerCase(),
    );
    const newHistory = [searchTerm, ...filtered].slice(0, 5);
    setRecentSearches(newHistory);
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(newHistory));
  };

  const handleSearch = term => {
    const searchTerm = term || query;
    if (searchTerm.trim().length > 0) {
      setActiveSearch(searchTerm);
      setQuery(searchTerm);
      saveSearch(searchTerm);
      Keyboard.dismiss();
    }
  };

  const renderTabBar = useCallback(
    props => (
      <MaterialTabBar
        {...props}
        style={styles.tabBar}
        indicatorStyle={styles.indicator}
        activeColor="#FFFFFF"
        inactiveColor="#64748B"
      />
    ),
    [],
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} />

      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#888"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search teams, fans, or #tags..."
            placeholderTextColor="#888"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => handleSearch()}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setQuery('');
                setActiveSearch('');
              }}
            >
              <Ionicons name="close-circle" size={20} color="#888" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {activeSearch === '' ? (
          <ScrollView style={styles.historyContainer}>
            {/* 🔥 TRENDING SECTION */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Trending Now</Text>
              <Ionicons name="trending-up" size={18} color="#1E90FF" />
            </View>

            <View style={styles.trendingWrapper}>
              {isTrendingLoading ? (
                <ActivityIndicator
                  color="#1E90FF"
                  style={{ marginVertical: 10 }}
                />
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {/* 🚀 FIXED: Added optional chaining and fallback array */}
                  {(trendingTags || []).map(tag => (
                    <TouchableOpacity
                      key={tag.id}
                      style={styles.trendingTag}
                      onPress={() => handleSearch(`#${tag.name}`)}
                    >
                      <Text style={styles.trendingTagText}>#{tag?.name}</Text>
                      <Text style={styles.tagCount}>
                        {tag?.post_count || 0} posts
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* 🕒 RECENT SEARCHES */}
            {recentSearches.length > 0 && (
              <View style={[styles.sectionHeader, { marginTop: 20 }]}>
                <Text style={styles.sectionTitle}>Recent Searches</Text>
                <TouchableOpacity
                  onPress={() => {
                    setRecentSearches([]);
                    AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
                  }}
                >
                  <Text style={styles.clearText}>Clear All</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 🚀 FIXED: Added optional chaining */}
            {(recentSearches || []).map(item => (
              <TouchableOpacity
                key={item}
                style={styles.recentItem}
                onPress={() => handleSearch(item)}
              >
                <Ionicons name="time-outline" size={18} color="#64748B" />
                <Text style={styles.recentItemText}>{item}</Text>
                <TouchableOpacity
                  onPress={() => {
                    const filtered = recentSearches.filter(i => i !== item);
                    setRecentSearches(filtered);
                    AsyncStorage.setItem(
                      RECENT_SEARCHES_KEY,
                      JSON.stringify(filtered),
                    );
                  }}
                >
                  <Ionicons name="close" size={18} color="#475569" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}

            {recentSearches.length === 0 && !isTrendingLoading && (
              <View style={styles.placeholderContainer}>
                <Ionicons name="football-outline" size={60} color="#162A3B" />
                <Text style={styles.placeholderTitle}>Find Your Community</Text>
                <Text style={styles.placeholderSubtitle}>
                  Search for teams or #hashtags
                </Text>
              </View>
            )}
          </ScrollView>
        ) : (
          <Tabs.Container renderTabBar={renderTabBar} headerHeight={0}>
            <Tabs.Tab name="Posts">
              <Tabs.ScrollView>
                <FeedList feedType="search" searchQuery={activeSearch} />
              </Tabs.ScrollView>
            </Tabs.Tab>
            <Tabs.Tab name="People">
              <Tabs.ScrollView>
                <UserList searchQuery={activeSearch} />
              </Tabs.ScrollView>
            </Tabs.Tab>
          </Tabs.Container>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1F2D' },
  safeArea: { backgroundColor: '#0D1F2D' },
  header: { paddingHorizontal: 15, backgroundColor: '#0D1F2D', zIndex: 10 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#162A3B',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginVertical: 10,
    height: 46,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: '#fff', fontSize: 16 },
  tabBar: {
    backgroundColor: '#0D1F2D',
    borderBottomWidth: 1,
    borderBottomColor: '#162A3B',
  },
  indicator: { backgroundColor: '#1E90FF', height: 3 },
  historyContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  clearText: { color: '#1E90FF', fontSize: 13 },
  trendingWrapper: { marginBottom: 10 },
  trendingTag: {
    backgroundColor: '#162A3B',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#1E90FF55',
  },
  trendingTagText: { color: '#1E90FF', fontWeight: 'bold', fontSize: 14 },
  tagCount: { color: '#64748B', fontSize: 10, marginTop: 2 },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#162A3B',
  },
  recentItemText: { flex: 1, color: '#CBD5E1', marginLeft: 15, fontSize: 15 },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 80,
  },
  placeholderTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
  },
  placeholderSubtitle: {
    color: '#64748B',
    fontSize: 14,
    marginTop: 5,
  },
});
