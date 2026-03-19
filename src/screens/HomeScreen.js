import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Text,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import api from '../api/client';
import PostCard from '../components/PostCard';

export default function HomeScreen({ route, navigation }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Extract params safely (passed from Sidebar/Drawer)
  const leagueId = route.params?.leagueId;
  const leagueName = route.params?.leagueName;

  useEffect(() => {
    fetchPosts();
    // Update Header title if a league is selected
    if (leagueName) {
      navigation.setOptions({ title: leagueName });
    } else {
      navigation.setOptions({ title: 'Home Feed' });
    }
  }, [leagueId]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const url = leagueId ? `api/posts/?league=${leagueId}` : 'api/posts/';
      const response = await api.get(url);

      // --- THE FIX IS HERE ---
      // If you have pagination enabled, the posts are in response.data.results
      // If not, they are in response.data
      const incomingPosts = response.data.results || response.data;

      console.log('--- ✅ SERVER RESPONSE ---');
      console.log('Posts Count:', incomingPosts.length);

      setPosts(incomingPosts); // Set the extracted array
    } catch (err) {
      console.log('--- ❌ API ERROR ---');
      // ... your existing error logic
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1E90FF" />
          <Text style={styles.loadingText}>Fetching latest posts...</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => <PostCard post={item} />}
          // Ensures the list takes up space even when empty
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.centered}>
              <MaterialCommunityIcons
                name="comment-off-outline"
                size={50}
                color="#94A3B8"
              />
              <Text style={styles.empty}>
                No posts found in {leagueName || 'this area'}.
              </Text>
              <TouchableOpacity onPress={fetchPosts} style={styles.refreshBtn}>
                <Text style={styles.refreshText}>Tap to Refresh</Text>
              </TouchableOpacity>
            </View>
          }
          refreshing={loading}
          onRefresh={fetchPosts}
        />
      )}

      {/* Floating Action Button for creating a post */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() =>
          navigation.navigate('CreatePost', { leagueId, leagueName })
        }
      >
        <MaterialCommunityIcons name="plus" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1F2D',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 10,
    fontSize: 14,
  },
  empty: {
    color: '#94A3B8',
    textAlign: 'center',
    fontSize: 16,
    marginTop: 10,
  },
  refreshBtn: {
    marginTop: 15,
    padding: 10,
  },
  refreshText: {
    color: '#1E90FF',
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#1E90FF',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
});
