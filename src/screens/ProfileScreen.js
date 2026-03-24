import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import api from '../api/client';
import PostCard from '../components/PostCard';
import { AuthContext } from '../store/authStore';

const { width } = Dimensions.get('window');

export default function ProfileScreen({ route, navigation }) {
  const { user: loggedInUser } = useContext(AuthContext);
  const userId = route.params?.userId || loggedInUser?.id;
  const isCurrentUser = userId === loggedInUser?.id;

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 🚀 Follow States
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  const loadData = async () => {
    try {
      const profileUrl = userId
        ? `auth/update/?user_id=${userId}`
        : `auth/update/`;
      const profileRes = await api.get(profileUrl);
      const profileData = profileRes.data.data || profileRes.data;

      setProfile(profileData);
      // Initialize follow states from backend data
      setIsFollowing(profileData.is_following);
      setFollowersCount(profileData.followers_count || 0);

      const postUrl = userId
        ? `api/posts/?user=${userId}`
        : `api/posts/?filter=mine`;
      const postsRes = await api.get(postUrl);
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

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [userId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };
  // 🚀 TOGGLE FOLLOW FUNCTION
  const handleFollowToggle = async () => {
    if (followLoading) return;

    // Optimistic Update: Change UI immediately
    const previousState = isFollowing;
    const previousCount = followersCount;

    setIsFollowing(!previousState);
    setFollowersCount(previousState ? previousCount - 1 : previousCount + 1);
    setFollowLoading(true);

    try {
      // Use the endpoint we created: /users/<id>/toggle-follow/
      const response = await api.post(`auth/users/${userId}/toggle-follow/`);

      // Sync with exact backend numbers
      setIsFollowing(response.data.following);
      setFollowersCount(response.data.follower_count);
    } catch (err) {
      // Rollback on error
      setIsFollowing(previousState);
      setFollowersCount(previousCount);
      Alert.alert('Error', 'Could not update follow status. Please try again.');
    } finally {
      setFollowLoading(false);
    }
  };

  const renderSupportSection = () => {
    const preferences = profile?.fan_preferences || [];
    return (
      <View style={styles.supportContainer}>
        <Text style={styles.sectionTitle}>MY LEAGUES & TEAMS</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScroll}
        >
          {preferences.map((pref, index) => (
            <View key={index} style={styles.sportChip}>
              <View style={styles.leagueIconBadge}>
                <MaterialCommunityIcons
                  name="trophy"
                  size={12}
                  color="#FFFFFF"
                />
              </View>
              <View style={styles.chipTextStack}>
                <Text style={styles.leagueNameText}>
                  {pref.league_name || 'League'}
                </Text>
                <Text style={styles.teamNameSubText}>
                  {pref.team_name || 'Team'}
                </Text>
              </View>
            </View>
          ))}

          {isCurrentUser && (
            <TouchableOpacity
              style={styles.addLeagueBtn}
              onPress={() =>
                navigation.navigate('Onboarding', {
                  screen: 'SelectLeagues',
                  params: { mode: 'add' },
                })
              }
            >
              <MaterialCommunityIcons name="plus" size={20} color="#1E90FF" />
              <Text style={styles.addLeagueText}>Add League</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#1E90FF" />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: '#0D1F2D' }}
      data={posts}
      keyExtractor={item => item.id.toString()}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#1E90FF"
        />
      }
      ListHeaderComponent={
        <>
          <View style={styles.headerContainer}>
            <Image
              source={{
                uri:
                  profile?.banner_image ||
                  'https://images.unsplash.com/photo-1504450758481-7338eba7524a?q=80&w=800&auto=format&fit=crop',
              }}
              style={styles.banner}
            />
            <View style={styles.profilePicWrapper}>
              <Image
                source={{
                  uri:
                    profile?.profile_image ||
                    `https://ui-avatars.com/api/?name=${profile?.username}&background=1E90FF&color=fff`,
                }}
                style={styles.profilePic}
              />
            </View>
          </View>

          <View style={styles.bioContainer}>
            <View style={styles.nameRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>
                  {profile?.display_name || profile?.username || 'Fan'}
                </Text>
                <Text style={styles.handle}>
                  @{profile?.username || 'anonymous'}
                </Text>
              </View>

              {/* 🚀 CONDITIONAL ACTION BUTTON (Edit vs Follow) */}
              {isCurrentUser ? (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() =>
                    navigation.navigate('EditProfile', { mode: 'edit' })
                  }
                >
                  <Text style={styles.editButtonText}>Edit Profile</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.followButton,
                    isFollowing && styles.followingButton,
                  ]}
                  onPress={handleFollowToggle}
                  disabled={followLoading}
                >
                  {followLoading ? (
                    <ActivityIndicator
                      size="small"
                      color={isFollowing ? '#1E90FF' : '#fff'}
                    />
                  ) : (
                    <Text
                      style={[
                        styles.followButtonText,
                        isFollowing && styles.followingButtonText,
                      ]}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.bio}>
              {profile?.bio || 'Passionate sports fan. 🏆'}
            </Text>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{posts.length}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{followersCount}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {profile?.following_count || 0}
                </Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
            </View>
          </View>

          {renderSupportSection()}

          <View style={styles.tabHeader}>
            <Text style={styles.tabText}>POSTS</Text>
            <View style={styles.activeIndicator} />
          </View>
        </>
      }
      renderItem={({ item }) => <PostCard post={item} />}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="post-outline"
            size={50}
            color="#1E293B"
          />
          <Text style={styles.emptyText}>No posts yet.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    backgroundColor: '#0D1F2D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: { height: 170, position: 'relative' },
  banner: { width: '100%', height: 130, backgroundColor: '#1A2A3D' },
  profilePicWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 20,
    padding: 4,
    backgroundColor: '#0D1F2D',
    borderRadius: 44,
  },
  profilePic: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1A2A3D',
  },
  bioContainer: { paddingHorizontal: 20, paddingTop: 12 },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 0.5 },
  handle: { color: '#64748B', fontSize: 14, marginTop: 2 },

  // 🚀 BUTTON STYLES
  editButton: {
    borderWidth: 1,
    borderColor: '#1E90FF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: { color: '#1E90FF', fontWeight: 'bold', fontSize: 13 },
  followButton: {
    backgroundColor: '#1E90FF',
    paddingHorizontal: 25,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#64748B',
  },
  followButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  followingButtonText: { color: '#64748B' },

  bio: { color: '#CBD5E1', marginTop: 12, fontSize: 14, lineHeight: 20 },
  statsRow: {
    flexDirection: 'row',
    marginTop: 20,
    borderTopWidth: 0.5,
    borderTopColor: '#1E293B',
    paddingTop: 15,
  },
  statItem: { marginRight: 30, alignItems: 'flex-start' },
  statNumber: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  statLabel: { color: '#64748B', fontSize: 12, marginTop: 2 },
  supportContainer: { marginTop: 25, marginBottom: 10 },
  sectionTitle: {
    color: '#1E90FF',
    fontSize: 11,
    fontWeight: '900',
    marginLeft: 20,
    marginBottom: 15,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  chipScroll: { paddingLeft: 20, paddingRight: 10 },
  sportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#162636',
    paddingHorizontal: 16,
    borderRadius: 12,
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#1E293B',
    height: 55,
  },
  leagueIconBadge: {
    backgroundColor: '#1E90FF',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chipTextStack: { flexDirection: 'column' },
  leagueNameText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  teamNameSubText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  addLeagueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderRadius: 12,
    marginRight: 25,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    borderStyle: 'dashed',
    height: 55,
  },
  addLeagueText: {
    color: '#1E90FF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  tabHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  tabText: { color: '#1E90FF', fontSize: 14, fontWeight: 'bold' },
  activeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1E90FF',
    marginLeft: 8,
  },
  emptyContainer: {
    marginTop: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: { color: '#64748B', fontSize: 16, marginTop: 12 },
});
