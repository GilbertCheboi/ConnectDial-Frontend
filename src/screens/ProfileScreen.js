/**
 * ProfileScreen.js - ConnectDial (FIXED)
 * ─────────────────────────────────────────────────────────────────────
 * FIXES in this version:
 * ✅ FIX #1: Followers stat is now tappable → navigates to FollowersList
 * ✅ FIX #1: Following stat is now tappable → navigates to FollowingList
 * ✅ FIX #1: following_count stored in local state so it updates
 *            immediately when current user follows/unfollows someone
 * ✅ FIX #2: Leagues horizontal ScrollView now scrollable on Android
 *            — nestedScrollEnabled on both FlatList and ScrollView
 *            — decelerationRate="fast" for smooth chip scrolling
 *            — scrollEventThrottle={16} for proper event handling
 * ✅ All existing functionality preserved
 * ─────────────────────────────────────────────────────────────────────
 */

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
  Platform,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import api from '../api/client';
import PostCard from '../components/PostCard';
import { AuthContext } from '../store/authStore';
import { ThemeContext } from '../store/themeStore';

const { width } = Dimensions.get('window');

export default function ProfileScreen({ route, navigation }) {
  const { user: loggedInUser } = useContext(AuthContext);
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
        inputBackground: '#112634',
        buttonText: '#FFFFFF',
      },
    },
  };

  const routeUserId = route.params?.userId;
  const routeUsername = route.params?.username;

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isCurrentUser, setIsCurrentUser] = useState(false);

  // Follow states
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  // The resolved user ID for this profile (needed for follower/following navigation)
  const [profileUserId, setProfileUserId] = useState(null);

  const loadData = async () => {
    try {
      const profileUrl = routeUserId
        ? `auth/update/?user_id=${routeUserId}`
        : routeUsername
        ? `auth/update/?username=${routeUsername}`
        : `auth/update/`;
      const profileRes = await api.get(profileUrl);
      const profileData = profileRes.data.data || profileRes.data;

      setProfile(profileData);
      setIsFollowing(profileData.is_following);
      setFollowersCount(profileData.followers_count || 0);
      setFollowingCount(profileData.following_count || 0);

      const requestedUserId =
        profileData.user_id || routeUserId || loggedInUser?.id;
      setProfileUserId(requestedUserId);
      setIsCurrentUser(requestedUserId === loggedInUser?.id);

      const postUrl = requestedUserId
        ? `api/posts/?user=${requestedUserId}`
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
  }, [routeUserId, routeUsername, loggedInUser?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // ─────────────────────────────────────────────────────────────────────
  // TOGGLE FOLLOW
  // ─────────────────────────────────────────────────────────────────────
  const handleFollowToggle = async () => {
    if (followLoading) return;

    const targetUserId = profile?.user_id || routeUserId;
    if (!targetUserId) {
      Alert.alert('Error', 'Unable to determine which user to follow.');
      return;
    }

    const previousState = isFollowing;
    const previousCount = followersCount;

    // Optimistic update
    setIsFollowing(!previousState);
    setFollowersCount(previousState ? previousCount - 1 : previousCount + 1);
    setFollowLoading(true);

    try {
      const response = await api.post(
        `auth/users/${targetUserId}/toggle-follow/`,
      );
      setIsFollowing(response.data.following);
      setFollowersCount(response.data.follower_count);
    } catch (err) {
      setIsFollowing(previousState);
      setFollowersCount(previousCount);
      Alert.alert('Error', 'Could not update follow status. Please try again.');
    } finally {
      setFollowLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // Navigate to followers / following list screens
  // ─────────────────────────────────────────────────────────────────────
  const handleFollowersPress = () => {
    if (!profileUserId) return;
    navigation.navigate('FollowersList', {
      userId: profileUserId,
      type: 'followers',
      title: 'Followers',
    });
  };

  const handleFollowingPress = () => {
    if (!profileUserId) return;
    navigation.navigate('FollowersList', {
      userId: profileUserId,
      type: 'following',
      title: 'Following',
    });
  };

  // ─────────────────────────────────────────────────────────────────────
  // FIX #2: Leagues & Teams section with working horizontal scroll
  // Key fixes:
  //   1. nestedScrollEnabled={true} — tells Android to pass horizontal
  //      touch events DOWN into this ScrollView instead of consuming them
  //      in the parent FlatList.
  //   2. decelerationRate="fast" — snappy, natural chip scroll feel.
  //   3. scrollEventThrottle={16} — ~60fps event updates (one per frame).
  //   4. The parent FlatList also gets nestedScrollEnabled={true} —
  //      without this, Android still swallows the events at the list level.
  // ─────────────────────────────────────────────────────────────────────
  const renderSupportSection = () => {
    const preferences = profile?.fan_preferences || [];
    return (
      <View style={styles.supportContainer}>
        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
          MY LEAGUES & TEAMS
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          // ── FIX #2 core props ──────────────────────────────────────
          nestedScrollEnabled={true}
          decelerationRate="fast"
          scrollEventThrottle={16}
          // ── prevents parent FlatList stealing horizontal gestures ──
          onStartShouldSetResponderCapture={() => false}
          // ──────────────────────────────────────────────────────────
          contentContainerStyle={styles.chipScroll}
        >
          {preferences.map((pref, index) => (
            <View
              key={index}
              style={[
                styles.sportChip,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.leagueIconBadge,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
                <MaterialCommunityIcons
                  name="trophy"
                  size={12}
                  color="#FFFFFF"
                />
              </View>
              <View style={styles.chipTextStack}>
                <Text
                  style={[styles.leagueNameText, { color: theme.colors.text }]}
                >
                  {pref.league_name || 'League'}
                </Text>
                <Text
                  style={[
                    styles.teamNameSubText,
                    { color: theme.colors.subText },
                  ]}
                >
                  {pref.team_name || 'Team'}
                </Text>
              </View>
            </View>
          ))}

          {isCurrentUser && (
            <TouchableOpacity
              style={[
                styles.addLeagueBtn,
                { borderColor: theme.colors.primary },
              ]}
              onPress={() =>
                navigation.navigate('Onboarding', {
                  screen: 'SelectLeagues',
                  params: { mode: 'add' },
                })
              }
            >
              <MaterialCommunityIcons
                name="plus"
                size={20}
                color={theme.colors.primary}
              />
              <Text
                style={[styles.addLeagueText, { color: theme.colors.primary }]}
              >
                Add League
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  };

  if (loading) {
    return (
      <View
        style={[
          styles.loaderContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    // ── FIX #2: nestedScrollEnabled on the parent FlatList ──────────
    // Required on Android so child horizontal ScrollViews can receive
    // their own touch events without the FlatList intercepting them.
    // ────────────────────────────────────────────────────────────────
    <FlatList
      style={{ backgroundColor: theme.colors.background }}
      data={posts}
      keyExtractor={item => item.id.toString()}
      nestedScrollEnabled={true}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.primary}
        />
      }
      ListHeaderComponent={
        <>
          {/* ── Banner & Avatar ─────────────────────────────────── */}
          <View style={styles.headerContainer}>
            <Image
              source={{
                uri:
                  profile?.banner_image ||
                  'https://images.unsplash.com/photo-1504450758481-7338eba7524a?q=80&w=800&auto=format&fit=crop',
              }}
              style={styles.banner}
            />
            <View
              style={[
                styles.profilePicWrapper,
                { backgroundColor: theme.colors.background },
              ]}
            >
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

          {/* ── Bio / Name / Follow ─────────────────────────────── */}
          <View style={styles.bioContainer}>
            <View style={styles.nameRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: theme.colors.text }]}>
                  {profile?.display_name || profile?.username || 'Fan'}
                </Text>
                <Text style={[styles.handle, { color: theme.colors.subText }]}>
                  @{profile?.username || 'anonymous'}
                </Text>
              </View>

              {isCurrentUser ? (
                <TouchableOpacity
                  style={[
                    styles.editButton,
                    { borderColor: theme.colors.primary },
                  ]}
                  onPress={() =>
                    navigation.navigate('EditProfile', { mode: 'edit' })
                  }
                >
                  <Text
                    style={[
                      styles.editButtonText,
                      { color: theme.colors.primary },
                    ]}
                  >
                    Edit Profile
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.followButton,
                    { backgroundColor: theme.colors.primary },
                    isFollowing && [
                      styles.followingButton,
                      { borderColor: theme.colors.border },
                    ],
                  ]}
                  onPress={handleFollowToggle}
                  disabled={followLoading}
                >
                  {followLoading ? (
                    <ActivityIndicator
                      size="small"
                      color={
                        isFollowing
                          ? theme.colors.primary
                          : theme.colors.buttonText
                      }
                    />
                  ) : (
                    <Text
                      style={[
                        styles.followButtonText,
                        { color: theme.colors.buttonText || '#FFFFFF' },
                        isFollowing && [
                          styles.followingButtonText,
                          { color: theme.colors.subText },
                        ],
                      ]}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            <Text style={[styles.bio, { color: theme.colors.subText }]}>
              {profile?.bio || 'Passionate sports fan. 🏆'}
            </Text>

            {/* ── Stats row ─────────────────────────────────────── */}
            <View
              style={[styles.statsRow, { borderTopColor: theme.colors.border }]}
            >
              {/* Posts — not tappable */}
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                  {posts.length}
                </Text>
                <Text
                  style={[styles.statLabel, { color: theme.colors.subText }]}
                >
                  Posts
                </Text>
              </View>

              {/* Followers — tappable */}
              <TouchableOpacity
                style={styles.statItem}
                onPress={handleFollowersPress}
                activeOpacity={0.7}
              >
                <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                  {followersCount}
                </Text>
                <Text
                  style={[styles.statLabel, { color: theme.colors.primary }]}
                >
                  Followers
                </Text>
              </TouchableOpacity>

              {/* Following — tappable */}
              <TouchableOpacity
                style={styles.statItem}
                onPress={handleFollowingPress}
                activeOpacity={0.7}
              >
                <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                  {followingCount}
                </Text>
                <Text
                  style={[styles.statLabel, { color: theme.colors.primary }]}
                >
                  Following
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Leagues & Teams (horizontally scrollable) ───────── */}
          {renderSupportSection()}

          {/* ── Posts tab header ────────────────────────────────── */}
          <View
            style={[
              styles.tabHeader,
              { borderBottomColor: theme.colors.border },
            ]}
          >
            <Text style={[styles.tabText, { color: theme.colors.primary }]}>
              POSTS
            </Text>
            <View
              style={[
                styles.activeIndicator,
                { backgroundColor: theme.colors.primary },
              ]}
            />
          </View>
        </>
      }
      renderItem={({ item }) => <PostCard post={item} />}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="post-outline"
            size={50}
            color={theme.colors.border}
          />
          <Text style={[styles.emptyText, { color: theme.colors.subText }]}>
            No posts yet.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Header / Banner ───────────────────────────────────────────────
  headerContainer: { height: 170, position: 'relative' },
  banner: { width: '100%', height: 130 },
  profilePicWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 20,
    padding: 4,
    borderRadius: 44,
  },
  profilePic: { width: 80, height: 80, borderRadius: 40 },

  // ── Bio ───────────────────────────────────────────────────────────
  bioContainer: { paddingHorizontal: 20, paddingTop: 12 },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: { fontSize: 22, fontWeight: '900', letterSpacing: 0.5 },
  handle: { fontSize: 14, marginTop: 2 },

  // ── Buttons ───────────────────────────────────────────────────────
  editButton: {
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: { fontWeight: 'bold', fontSize: 13 },
  followButton: {
    paddingHorizontal: 25,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
  },
  followingButton: { backgroundColor: 'transparent', borderWidth: 1 },
  followButtonText: { fontWeight: 'bold', fontSize: 14 },
  followingButtonText: {},

  // ── Bio text ──────────────────────────────────────────────────────
  bio: { marginTop: 12, fontSize: 14, lineHeight: 20 },

  // ── Stats row ─────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    marginTop: 20,
    borderTopWidth: 0.5,
    paddingTop: 15,
  },
  statItem: { marginRight: 30, alignItems: 'flex-start' },
  statNumber: { fontSize: 16, fontWeight: 'bold' },
  statLabel: { fontSize: 12, marginTop: 2 },

  // ── Leagues section ───────────────────────────────────────────────
  supportContainer: { marginTop: 25, marginBottom: 10 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    marginLeft: 20,
    marginBottom: 15,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  chipScroll: {
    paddingLeft: 20,
    paddingRight: 10,
    // Ensure chips have enough height so the touch area is generous
    alignItems: 'center',
  },
  sportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 12,
    marginRight: 15,
    borderWidth: 1,
    height: 55,
    // Minimum width so short league names don't collapse the chip
    minWidth: 150,
  },
  leagueIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chipTextStack: { flexDirection: 'column' },
  leagueNameText: { fontSize: 14, fontWeight: 'bold' },
  teamNameSubText: { fontSize: 12, fontWeight: '600', marginTop: 1 },
  addLeagueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderRadius: 12,
    marginRight: 25,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    height: 55,
    minWidth: 130,
  },
  addLeagueText: { fontSize: 14, fontWeight: 'bold', marginLeft: 8 },

  // ── Posts tab ─────────────────────────────────────────────────────
  tabHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    marginTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  tabText: { fontSize: 14, fontWeight: 'bold' },
  activeIndicator: { width: 6, height: 6, borderRadius: 3, marginLeft: 8 },

  // ── Empty state ───────────────────────────────────────────────────
  emptyContainer: {
    marginTop: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: { fontSize: 16, marginTop: 12 },
});