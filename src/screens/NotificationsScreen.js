import React, {
  useEffect,
  useState,
  useCallback,
  useLayoutEffect,
  useContext,
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
import { ThemeContext } from '../store/themeStore';

export default function NotificationScreen({ navigation }) {
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
      headerStyle: { backgroundColor: theme.colors.background },
      headerTintColor: theme.colors.text,
      headerRight: () => (
        <TouchableOpacity
          onPress={markAllAsRead}
          style={styles(theme).headerButton}
        >
          <Ionicons
            name="checkmark-done"
            size={24}
            color={theme.colors.primary}
          />
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
      navigation.navigate('Profile', { userId: item.sender_profile?.id });
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
          return { name: 'heart', color: theme.colors.notificationBadge };
        case 'follow':
          return { name: 'person-add', color: theme.colors.primary };
        case 'comment':
          return { name: 'chatbubble-ellipses', color: '#10B981' };
        case 'mention':
          return { name: 'at-circle', color: '#F59E0B' }; // Orange
        case 'repost':
          return { name: 'repeat', color: '#8B5CF6' };
        default:
          return { name: 'notifications', color: theme.colors.subText };
      }
    };

    const icon = getIconConfig();

    return (
      <TouchableOpacity
        style={[styles(theme).item, !item.is_read && styles(theme).unreadBg]}
        onPress={() => handlePress(item)}
      >
        <View style={styles(theme).avatarWrapper}>
          <Image
            source={{
              uri:
                profile?.profile_image ||
                `https://ui-avatars.com/api/?name=${profile?.username}`,
            }}
            style={styles(theme).avatar}
          />
          <View style={[styles(theme).badge, { backgroundColor: icon.color }]}>
            <Ionicons
              name={icon.name}
              size={10}
              color={theme.colors.buttonText}
            />
          </View>
        </View>

        <View style={styles(theme).textWrapper}>
          <Text style={styles(theme).message} numberOfLines={2}>
            <Text style={styles(theme).username}>
              {profile?.display_name || profile?.username || 'User'}{' '}
            </Text>
            {item.notification_type === 'like' && 'liked your post.'}
            {item.notification_type === 'follow' && 'started following you.'}
            {item.notification_type === 'comment' && 'replied to your post.'}
            {item.notification_type === 'repost' && 'reposted your content.'}
            {item.notification_type === 'mention' && 'mentioned you in a post.'}
          </Text>
          <Text style={styles(theme).time}>{item.time_ago}</Text>
        </View>

        {!item.is_read && <View style={styles(theme).dot} />}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles(theme).centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles(theme).container}>
      <FlatList
        data={notifications}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles(theme).listContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchNotifications(true)}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles(theme).centered}>
            <Ionicons
              name="notifications-off-outline"
              size={60}
              color={theme.colors.border}
            />
            <Text style={styles(theme).emptyText}>No activity to show.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = theme =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
    headerButton: { marginRight: 15, padding: 5 },
    listContainer: { paddingBottom: 20 },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 0.5,
      borderBottomColor: theme.colors.border,
    },
    unreadBg: { backgroundColor: theme.colors.card + '40' }, // Semi-transparent card color
    avatarWrapper: { position: 'relative' },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: theme.colors.card,
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
      borderColor: theme.colors.background,
    },
    textWrapper: { flex: 1, marginLeft: 16 },
    username: { color: theme.colors.text, fontWeight: '700' },
    message: { color: theme.colors.subText, fontSize: 14, lineHeight: 20 },
    time: { color: theme.colors.secondary, fontSize: 12, marginTop: 4 },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.primary,
      marginLeft: 10,
    },
    emptyText: { color: theme.colors.secondary, fontSize: 16, marginTop: 12 },
  });
