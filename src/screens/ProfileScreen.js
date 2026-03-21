import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import api from '../api/client';
import PostCard from '../components/PostCard';
import { AuthContext } from '../store/authStore';

export default function ProfileScreen({ route }) {
  const { user: loggedInUser } = useContext(AuthContext);

  // Look for userId in params, otherwise default to the logged-in user
  const userId = route.params?.userId || loggedInUser?.id;

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      // 1. Profile Fetch
      const profileUrl = userId
        ? `auth/update/?user_id=${userId}`
        : `auth/update/`;
      const profileRes = await api.get(profileUrl);
      // Standardize the profile data
      const profileData = profileRes.data.data || profileRes.data;
      setProfile(profileData);

      // 2. Posts Fetch (THE FIX)
      const postUrl = userId
        ? `api/posts/?user=${userId}`
        : `api/posts/?filter=mine`;
      const postsRes = await api.get(postUrl);

      // LOG THIS to see the structure: console.log("Post Data:", postsRes.data);

      // Check if data is inside a 'results' key (pagination) or is a direct array
      const actualPosts = Array.isArray(postsRes.data)
        ? postsRes.data
        : postsRes.data.results || [];

      setPosts(actualPosts);
    } catch (err) {
      console.error('Fetch Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Re-run whenever the userId changes (e.g., clicking a friend's profile)
  useEffect(() => {
    setLoading(true);
    loadData();
  }, [userId]);

  if (loading)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#0D1F2D',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color="#1E90FF" />
      </View>
    );

  return (
    <FlatList
      style={{ backgroundColor: '#0D1F2D' }}
      data={posts}
      keyExtractor={item => item.id.toString()}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadData();
          }}
          tintColor="#fff"
        />
      }
      ListHeaderComponent={
        <>
          <View style={styles.headerContainer}>
            <Image
              source={{
                uri:
                  profile?.banner_image ||
                  'https://via.placeholder.com/800x200',
              }}
              style={styles.banner}
            />
            <Image
              source={{
                uri:
                  profile?.profile_image || 'https://via.placeholder.com/150',
              }}
              style={styles.profilePic}
            />
          </View>
          <View style={styles.bioContainer}>
            <Text style={styles.name}>
              {profile?.display_name || profile?.username || 'Fan'}
            </Text>
            <Text style={styles.handle}>
              @{profile?.username || 'anonymous'}
            </Text>
            <Text style={styles.bio}>{profile?.bio || 'No bio yet.'}</Text>
            <View style={styles.statsRow}>
              <Text style={styles.statText}>
                <Text style={styles.bold}>{posts.length}</Text> Posts
              </Text>
            </View>
          </View>
          <View style={styles.tabHeader}>
            <Text style={styles.tabText}>POSTS</Text>
          </View>
        </>
      }
      renderItem={({ item }) => <PostCard post={item} />}
      ListEmptyComponent={
        <Text style={{ color: '#888', textAlign: 'center', marginTop: 40 }}>
          No posts yet.
        </Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  headerContainer: { height: 160 },
  banner: { width: '100%', height: 120, backgroundColor: '#1A2A3D' },
  profilePic: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#0D1F2D',
    position: 'absolute',
    bottom: 0,
    left: 20,
    backgroundColor: '#0D1F2D',
  },
  bioContainer: { padding: 20, marginTop: 10 },
  name: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  handle: { color: '#64748B', fontSize: 14, marginBottom: 5 },
  bio: { color: '#ccc', marginTop: 5, fontSize: 14, lineHeight: 20 },
  statsRow: { flexDirection: 'row', marginTop: 15 },
  statText: { color: '#888', marginRight: 20 },
  bold: { color: '#fff', fontWeight: 'bold' },
  tabHeader: {
    borderBottomWidth: 2,
    borderBottomColor: '#1E90FF',
    width: 80,
    alignItems: 'center',
    paddingVertical: 10,
    marginLeft: 20,
  },
  tabText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
});
