// src/screens/NotificationsScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const MOCK_NOTIFICATIONS = [
  {
    id: '1',
    type: 'like',
    user: 'GreenFan99',
    content: 'liked your post about the finals.',
    time: '2m',
    image: 'https://via.placeholder.com/50',
    read: false,
  },
  {
    id: '2',
    type: 'follow',
    user: 'UltraSoccer',
    content: 'started following you.',
    time: '1h',
    image: 'https://via.placeholder.com/50',
    read: true,
  },
  {
    id: '3',
    type: 'system',
    user: 'ConnectDial',
    content: 'Your profile is 100% complete! Check out new features.',
    time: '3h',
    image: null,
    read: true,
  },
];

export default function NotificationsScreen() {
  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.read && styles.unreadBackground]}
    >
      <View style={styles.leftSection}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.systemIcon]}>
            <Ionicons name="notifications" size={20} color="#1E90FF" />
          </View>
        )}
        <View style={styles.textContainer}>
          <Text style={styles.notificationText}>
            <Text style={styles.username}>{item.user} </Text>
            {item.content}
          </Text>
          <Text style={styles.timeText}>{item.time}</Text>
        </View>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>
      <FlatList
        data={MOCK_NOTIFICATIONS}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No notifications yet.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1F2D' },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#162A3B' },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  listContent: { paddingVertical: 10 },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#162A3B',
  },
  unreadBackground: { backgroundColor: '#112233' },
  leftSection: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#162A3B',
  },
  systemIcon: { justifyContent: 'center', alignItems: 'center' },
  textContainer: { marginLeft: 15, flex: 1 },
  notificationText: { color: '#fff', fontSize: 14, lineHeight: 20 },
  username: { fontWeight: 'bold' },
  timeText: { color: '#888', fontSize: 12, marginTop: 4 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1E90FF',
  },
  emptyText: { color: '#888', textAlign: 'center', marginTop: 50 },
});
