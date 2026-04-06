import React, { useState, useEffect, useCallback, useContext } from 'react';
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
import { ThemeContext } from '../store/themeStore';

const RECENT_SEARCHES_KEY = '@recent_searches';

export default function SearchScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { theme } = useContext(ThemeContext) || {
    theme: {
      colors: {
        background: '#0D1F2D',
        surface: '#0D1F2D',
        text: '#FFFFFF',
        subText: '#94A3B8',
        primary: '#1E90FF',
        border: '#1E293B',
        secondary: '#64748B',
        card: '#112634',
        notificationBadge: '#FF4B4B',
        buttonText: '#FFFFFF',
      },
    },
  };

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
        style={styles(theme).tabBar}
        indicatorStyle={styles(theme).indicator}
        activeColor={theme.colors.text}
        inactiveColor={theme.colors.subText}
      />
    ),
    [theme],
  );

  return (
    <View style={styles(theme).container}>
      <SafeAreaView style={styles(theme).safeArea} />

      <View style={styles(theme).header}>
        <View style={styles(theme).searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color={theme.colors.subText}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search teams, fans, or #tags..."
            placeholderTextColor={theme.colors.subText}
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
              <Ionicons
                name="close-circle"
                size={20}
                color={theme.colors.subText}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {activeSearch === '' ? (
          <ScrollView style={styles(theme).historyContainer}>
            {/* 🔥 TRENDING SECTION */}
            <View style={styles(theme).sectionHeader}>
              <Text style={styles(theme).sectionTitle}>Trending Now</Text>
              <Ionicons
                name="trending-up"
                size={18}
                color={theme.colors.primary}
              />
            </View>

            <View style={styles(theme).trendingWrapper}>
              {isTrendingLoading ? (
                <ActivityIndicator
                  color={theme.colors.primary}
                  style={{ marginVertical: 10 }}
                />
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {/* 🚀 FIXED: Added optional chaining and fallback array */}
                  {(trendingTags || []).map(tag => (
                    <TouchableOpacity
                      key={tag.id}
                      style={styles(theme).trendingTag}
                      onPress={() => handleSearch(`#${tag.name}`)}
                    >
                      <Text style={styles(theme).trendingTagText}>
                        #{tag?.name}
                      </Text>
                      <Text style={styles(theme).tagCount}>
                        {tag?.post_count || 0} posts
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* 🕒 RECENT SEARCHES */}
            {recentSearches.length > 0 && (
              <View style={[styles(theme).sectionHeader, { marginTop: 20 }]}>
                <Text style={styles(theme).sectionTitle}>Recent Searches</Text>
                <TouchableOpacity
                  onPress={() => {
                    setRecentSearches([]);
                    AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
                  }}
                >
                  <Text style={styles(theme).clearText}>Clear All</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 🚀 FIXED: Added optional chaining */}
            {(recentSearches || []).map(item => (
              <TouchableOpacity
                key={item}
                style={styles(theme).recentItem}
                onPress={() => handleSearch(item)}
              >
                <Ionicons
                  name="time-outline"
                  size={18}
                  color={theme.colors.subText}
                />
                <Text style={styles(theme).recentItemText}>{item}</Text>
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
                  <Ionicons
                    name="close"
                    size={18}
                    color={theme.colors.secondary}
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}

            {recentSearches.length === 0 && !isTrendingLoading && (
              <View style={styles(theme).placeholderContainer}>
                <Ionicons
                  name="football-outline"
                  size={60}
                  color={theme.colors.card}
                />
                <Text style={styles(theme).placeholderTitle}>
                  Find Your Community
                </Text>
                <Text style={styles(theme).placeholderSubtitle}>
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

const styles = theme =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    safeArea: { backgroundColor: theme.colors.background },
    header: {
      paddingHorizontal: 15,
      backgroundColor: theme.colors.background,
      zIndex: 10,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      paddingHorizontal: 12,
      marginVertical: 10,
      height: 46,
    },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, color: theme.colors.text, fontSize: 16 },
    tabBar: {
      backgroundColor: theme.colors.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    indicator: { backgroundColor: theme.colors.primary, height: 3 },
    historyContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: {
      color: theme.colors.text,
      fontWeight: 'bold',
      fontSize: 16,
    },
    clearText: { color: theme.colors.primary, fontSize: 13 },
    trendingWrapper: { marginBottom: 10 },
    trendingTag: {
      backgroundColor: theme.colors.card,
      paddingHorizontal: 15,
      paddingVertical: 10,
      borderRadius: 20,
      marginRight: 10,
      borderWidth: 1,
      borderColor: theme.colors.primary + '55',
    },
    trendingTagText: {
      color: theme.colors.primary,
      fontWeight: 'bold',
      fontSize: 14,
    },
    tagCount: { color: theme.colors.subText, fontSize: 10, marginTop: 2 },
    recentItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    recentItemText: {
      flex: 1,
      color: theme.colors.text,
      marginLeft: 15,
      fontSize: 15,
    },
    placeholderContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 80,
    },
    placeholderTitle: {
      color: theme.colors.text,
      fontSize: 18,
      fontWeight: 'bold',
      marginTop: 15,
    },
    placeholderSubtitle: {
      color: theme.colors.subText,
      fontSize: 14,
      marginTop: 5,
    },
  });
