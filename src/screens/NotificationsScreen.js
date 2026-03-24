import React, {
  useEffect,
  useState,
  useCallback,
  useLayoutEffect,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../api/client';
import { useNotifications } from '../store/NotificationContext';

export default function NotificationScreen({ navigation }) {
  const { setUnreadCount, fetchUnreadCount } = useNotifications();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const markAllAsRead = async () => {
    try {
      await api.post('api/notifications/mark-all-read/');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Clear notifications error:', error);
      Alert.alert('Notice', 'Could not clear notifications at this time.');
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: 'Notifications',
      headerStyle: { backgroundColor: '#0D1F2D' },
      headerTintColor: '#fff',
      headerRight: () => (
        <TouchableOpacity onPress={markAllAsRead} style={styles.headerButton}>
          <Ionicons name="checkmark-done" size={24} color="#1E90FF" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, notifications]);

  const fetchNotifications = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) setIsRefreshing(true);
      try {
        const response = await api.get('api/notifications/');
        const data = response.data.results || response.data;
        setNotifications(data);
        fetchUnreadCount();
      } catch (error) {
        console.error('Fetch Error:', error);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [fetchUnreadCount],
  );

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handlePress = async item => {
    // 🚀 Navigation based on type
    if (item.notification_type === 'follow') {
      navigation.navigate('Profile', { userId: item.sender });
    } else if (item.post) {
      navigation.navigate('PostDetail', { postId: item.post });
    }

    if (!item.is_read) {
      try {
        await api.patch(`api/notifications/${item.id}/`, { is_read: true });
        setNotifications(prev =>
          prev.map(n => (n.id === item.id ? { ...n, is_read: true } : n)),
        );
        fetchUnreadCount();
      } catch (e) {
        console.log('Status update failed', e);
      }
    }
  };

  const renderItem = ({ item }) => {
    const profile = item.sender_profile;

    const getIconConfig = () => {
      switch (item.notification_type) {
        case 'like':
          return { name: 'heart', color: '#FF4B4B' };
        case 'follow':
          return { name: 'person-add', color: '#1E90FF' };
        case 'comment':
          return { name: 'chatbubble-ellipses', color: '#10B981' };
        case 'mention':
          return { name: 'at-circle', color: '#F59E0B' }; // Orange
        case 'repost':
          return { name: 'repeat', color: '#8B5CF6' };
        default:
          return { name: 'notifications', color: '#94A3B8' };
      }
    };

    const icon = getIconConfig();

    return (
      <TouchableOpacity
        style={[styles.item, !item.is_read && styles.unreadBg]}
        onPress={() => handlePress(item)}
      >
        <View style={styles.avatarWrapper}>
          <Image
            source={{
              uri:
                profile?.profile_image ||
                `https://ui-avatars.com/api/?name=${profile?.username}`,
            }}
            style={styles.avatar}
          />
          <View style={[styles.badge, { backgroundColor: icon.color }]}>
            <Ionicons name={icon.name} size={10} color="#fff" />
          </View>
        </View>

        <View style={styles.textWrapper}>
          <Text style={styles.message} numberOfLines={2}>
            <Text style={styles.username}>
              {profile?.display_name || profile?.username || 'User'}{' '}
            </Text>
            {item.notification_type === 'like' && 'liked your post.'}
            {item.notification_type === 'follow' && 'started following you.'}
            {item.notification_type === 'comment' && 'replied to your post.'}
            {item.notification_type === 'repost' && 'reposted your content.'}
            {item.notification_type === 'mention' && 'mentioned you in a post.'}
          </Text>
          <Text style={styles.time}>{item.time_ago}</Text>
        </View>

        {!item.is_read && <View style={styles.dot} />}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1E90FF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchNotifications(true)}
            tintColor="#1E90FF"
          />
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <Ionicons
              name="notifications-off-outline"
              size={60}
              color="#1E293B"
            />
            <Text style={styles.emptyText}>No activity to show.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050B10' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#050B10',
  },
  headerButton: { marginRight: 15, padding: 5 },
  listContainer: { paddingBottom: 20 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#162A3B',
  },
  unreadBg: { backgroundColor: 'rgba(30, 144, 255, 0.04)' },
  avatarWrapper: { position: 'relative' },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#162A3B',
  },
  badge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#050B10',
  },
  textWrapper: { flex: 1, marginLeft: 16 },
  username: { color: '#fff', fontWeight: '700' },
  message: { color: '#CBD5E1', fontSize: 14, lineHeight: 20 },
  time: { color: '#64748B', fontSize: 12, marginTop: 4 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1E90FF',
    marginLeft: 10,
  },
  emptyText: { color: '#475569', fontSize: 16, marginTop: 12 },
});
