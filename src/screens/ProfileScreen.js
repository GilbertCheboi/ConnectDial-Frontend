// src/screens/ProfileScreen.js
import React, { useContext } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { AuthContext } from '../store/authStore';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function ProfileScreen() {
  const { user } = useContext(AuthContext);

  return (
    <View style={styles.container}>
      {/* Header / Cover Area */}
      <View style={styles.header}>
        <Image
          source={{
            uri: user?.banner_image || 'https://via.placeholder.com/800x200',
          }}
          style={styles.banner}
        />
        <View style={styles.profileImageContainer}>
          <Image
            source={{
              uri: user?.profile_image || 'https://via.placeholder.com/150',
            }}
            style={styles.profileImage}
          />
        </View>
      </View>

      {/* User Info */}
      <View style={styles.infoSection}>
        <Text style={styles.name}>{user?.display_name || user?.username}</Text>
        <Text style={styles.handle}>@{user?.username}</Text>
        <Text style={styles.bio}>
          {user?.bio || 'No bio yet. Add one in settings!'}
        </Text>
      </View>

      {/* Simple Stats or Actions */}
      <View style={styles.statsRow}>
        <TouchableOpacity style={styles.statBox}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Posts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statBox}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1F2D' },
  header: { height: 180, position: 'relative' },
  banner: { width: '100%', height: 120 },
  profileImageContainer: {
    position: 'absolute',
    bottom: 0,
    left: 20,
    borderWidth: 4,
    borderColor: '#0D1F2D',
    borderRadius: 50,
  },
  profileImage: { width: 80, height: 80, borderRadius: 40 },
  infoSection: { padding: 20, marginTop: 10 },
  name: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  handle: { color: '#888', fontSize: 16 },
  bio: { color: '#ccc', marginTop: 10, lineHeight: 20 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 20 },
  statBox: { marginRight: 30, alignItems: 'center' },
  statNumber: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: '#888', fontSize: 14 },
});
