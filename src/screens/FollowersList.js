/**
 * FollowersList.js - ConnectDial (FINAL)
 * Works with the new backend endpoints you just added
 */

import React, { useEffect, useState, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, StackActions } from '@react-navigation/native';
import client from '../api/client';
import { ThemeContext } from '../store/themeStore';
import { AuthContext } from '../store/authStore';
import { useFollow } from '../store/FollowContext';

export default function FollowersList({ route }) {
  const navigation = useNavigation();
  const { userId, type = 'followers', title = 'Followers' } = route.params;

  const { user: loggedInUser } = useContext(AuthContext);
  const { followingIds, updateFollowStatus } = useFollow();
  const { theme } = useContext(ThemeContext) || {
    theme: {
      colors: {
        background: '#0D1F2D',
        text: '#FFFFFF',
        subText: '#94A3B8',
        primary: '#1E90FF',
        border: '#1E293B',
        card: '#112634',
      },
    },
  };

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [followLoadingIds, setFollowLoadingIds] = useState(new Set());

  const fetchUsers = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const endpoint = `auth/users/${userId}/${type}/`;
      const res = await client.get(endpoint);
      const data = res.data;
      const list = Array.isArray(data) ? data : data.results || [];
      setUsers(list);
    } catch (err) {
      console.error(`Error fetching ${type}:`, err);
      setError(`Could not load ${type}.`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, type]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleFollowToggle = async (item) => {
    const targetId = Number(item.user?.id || item.id);
    if (!targetId || followLoadingIds.has(targetId)) return;

    const isCurrentlyFollowing = followingIds.has(targetId);
    const newStatus = !isCurrentlyFollowing;

    setFollowLoadingIds((prev) => new Set(prev).add(targetId));
    updateFollowStatus(targetId, newStatus);

    try {
      const res = await client.post(`auth/users/${targetId}/toggle-follow/`);
      updateFollowStatus(targetId, res.data.following);
    } catch (err) {
      updateFollowStatus(targetId, isCurrentlyFollowing);
      Alert.alert('Error', 'Could not update follow status.');
    } finally {
      setFollowLoadingIds((prev) => {
        const updated = new Set(prev);
        updated.delete(targetId);
        return updated;
      });
    }
  };

  const handleUserPress = (item) => {
    const targetId = item.user?.id || item.id;
    navigation.dispatch(StackActions.push('Profile', { userId: targetId }));
  };

  const renderItem = ({ item }) => {
    const profile = item.user || item; // support both nested and flat response
    const targetId = Number(profile.id);
    const isOwner = loggedInUser?.id === targetId;

    const isFollowing = followingIds.has(-targetId)
      ? false
      : followingIds.has(targetId)
      ? true
      : profile.is_following === true;

    const avatarUri =
      profile.profile_image ||
      profile.profile_pic ||
      `https://ui-avatars.com/api/?name=${profile.username || 'U'}&background=1E90FF&color=fff`;

    return (
      <TouchableOpacity
        style={[styles.userCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
        onPress={() => handleUserPress(item)}
        activeOpacity={0.85}
      >
        <Image source={{ uri: avatarUri }} style={styles.avatar} />

        <View style={styles.info}>
          <Text style={[styles.displayName, { color: theme.colors.text }]}>
            {profile.display_name || profile.username || 'User'}
          </Text>
          <Text style={[styles.username, { color: theme.colors.subText }]}>
            @{profile.username || 'unknown'}
          </Text>
        </View>

        {!isOwner && (
          <TouchableOpacity
            style={[
              styles.followBtn,
              isFollowing
                ? styles.followingBtn
                : { backgroundColor: theme.colors.primary },
            ]}
            onPress={(e) => {
              e.stopPropagation();
              handleFollowToggle(item);
            }}
            disabled={followLoadingIds.has(targetId)}
          >
            {followLoadingIds.has(targetId) ? (
              <ActivityIndicator
                size="small"
                color={isFollowing ? theme.colors.primary : '#fff'}
              />
            ) : (
              <Text
                style={[
                  styles.followText,
                  { color: isFollowing ? theme.colors.primary : '#fff' },
                ]}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{title}</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}

      {!loading && error && (
        <View style={styles.centered}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={theme.colors.subText} />
          <Text style={[styles.errorText, { color: theme.colors.subText }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => fetchUsers()}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && (
        <FlatList
          data={users}
          keyExtractor={(item) => (item.user?.id || item.id || Math.random()).toString()}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchUsers(true)}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <MaterialCommunityIcons
                name={type === 'followers' ? 'account-group-outline' : 'account-heart-outline'}
                size={52}
                color={theme.colors.subText}
              />
              <Text style={[styles.emptyText, { color: theme.colors.subText }]}>
                {type === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  errorText: { fontSize: 15, textAlign: 'center', marginTop: 12 },
  retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '600' },
  emptyText: { fontSize: 15, marginTop: 12, textAlign: 'center' },
  listContent: { paddingVertical: 8, paddingHorizontal: 12, flexGrow: 1 },

  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1E293B' },
  info: { flex: 1, marginLeft: 14 },
  displayName: { fontSize: 15, fontWeight: '700' },
  username: { fontSize: 13, marginTop: 2 },

  followBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 85,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followingBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#1E90FF',
  },
  followText: {
    fontSize: 13,
    fontWeight: '600',
  },
});