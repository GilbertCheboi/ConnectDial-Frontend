import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Text,
  RefreshControl,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import api from '../api/client';
import PostCard from '../components/PostCard';

export default function HomeScreen({ route, navigation }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const leagueId = route.params?.leagueId;
  const leagueName = route.params?.leagueName;

  useEffect(() => {
    fetchPosts();
    navigation.setOptions({
      title: leagueName ? leagueName : 'Home Feed',
    });
  }, [leagueId, leagueName]);

  const fetchPosts = async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setLoading(true);

    try {
      const url = leagueId ? `api/posts/?league=${leagueId}` : 'api/posts/';
      const response = await api.get(url);
      const incomingPosts = response.data.results || response.data;
      setPosts(incomingPosts);
    } catch (err) {
      console.log('--- ❌ API ERROR ---', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const removePostFromState = useCallback(postId => {
    setPosts(currentPosts => currentPosts.filter(post => post.id !== postId));
  }, []);

  // --- 🚀 NEW: Update comment count locally ---
  const handleCommentPress = post => {
    navigation.navigate('Comments', {
      postId: post.id,
      // This function runs when a comment is successfully posted
      onCommentAdded: () => {
        setPosts(currentPosts =>
          currentPosts.map(p =>
            p.id === post.id
              ? { ...p, comments_count: (p.comments_count || 0) + 1 }
              : p,
          ),
        );
      },
    });
  };

  const handleEditPost = post => {
    navigation.navigate('CreatePost', {
      editMode: true,
      postData: post,
      onEditSuccess: updatedPost => {
        setPosts(prev =>
          prev.map(p => (p.id === updatedPost.id ? updatedPost : p)),
        );
      },
    });
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
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onDeleteSuccess={removePostFromState}
              onEditPress={handleEditPost}
              // Pass the new handler to PostCard
              onCommentPress={() => handleCommentPress(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchPosts(true)}
              tintColor="#1E90FF"
            />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <MaterialCommunityIcons
                name="comment-off-outline"
                size={50}
                color="#94A3B8"
              />
              <Text style={styles.empty}>No posts found.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

// ... styles remain the same

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1F2D',
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 100, // Space for the FAB
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
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
    right: 25,
    bottom: 25,
    backgroundColor: '#1E90FF',
    width: 65,
    height: 65,
    borderRadius: 32.5,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
});
