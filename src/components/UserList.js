import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Tabs } from 'react-native-collapsible-tab-view';
import api from '../api/client';
// 🚀 Added StackActions for "Forced" navigation
import { useNavigation, StackActions } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function UserList({ searchQuery }) {
  const navigation = useNavigation();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!searchQuery || searchQuery.trim() === '') {
      setProfiles([]);
      return;
    }
    fetchUsers();
  }, [searchQuery]);

  const fetchUsers = async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else if (profiles.length === 0) setLoading(true);

    try {
      const response = await api.get(
        `auth/search/?search=${encodeURIComponent(searchQuery)}`,
      );
      const data = response.data.results || response.data;
      setProfiles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Search Users Error:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const renderUserItem = ({ item }) => {
    // 🔍 Check your Metro Terminal for this log!
    console.log('👤 User Item Data:', item);

    return (
      <TouchableOpacity
        style={styles.userCard}
onPress={() => {
        // 🚀 Use item.user_id (The Account ID) instead of item.id (The Profile Row ID)
        navigation.dispatch(
          StackActions.push('Profile', { userId: item.user_id })
        );
      }}
      >
        <Image
          source={
            item.profile_image
              ? { uri: item.profile_image }
              : require('../screens/assets/default-avatar.png')
          }
          style={styles.avatar}
        />
        <View style={styles.info}>
          <Text style={styles.username}>
            {item.display_name || (item.username ? `@${item.username}` : 'Fan')}
          </Text>
          <Text style={styles.bio} numberOfLines={1}>
            {item.bio || 'Passionate sports fan. 🏆'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#475569" />
      </TouchableOpacity>
    );
  };

  if (loading && profiles.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1E90FF" />
      </View>
    );
  }

  return (
    <Tabs.FlatList
      data={profiles}
      keyExtractor={(item, index) => item?.id?.toString() || index.toString()}
      renderItem={renderUserItem}
      scrollIndicatorInsets={{ top: 50 }}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => fetchUsers(true)}
          tintColor="#1E90FF"
          progressViewOffset={50}
        />
      }
      ListEmptyComponent={
        <View style={styles.centered}>
          <Text style={styles.emptyText}>
            {!searchQuery ? 'Find fans by username' : 'No fans found'}
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
    backgroundColor: '#0D1F2D',
    paddingTop: 100,
  },
  listContent: {
    backgroundColor: '#0D1F2D',
    minHeight: '100%',
    paddingTop: 60, // 🚀 Keeps content below tab bar
    paddingBottom: 120, // 🚀 Ensures enough space above bottom tabs
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#162A3B',
    marginHorizontal: 15,
    marginBottom: 10,
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  avatar: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: '#0D1F2D',
  },
  info: { flex: 1, marginLeft: 15 },
  username: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  bio: { color: '#94A3B8', fontSize: 13, marginTop: 4 },
  emptyText: { color: '#64748B', textAlign: 'center' },
});
