// src/screens/ShortsScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { height, width } = Dimensions.get('window');

// Mock data for videos
const VIDEO_DATA = [
  { id: '1', title: 'Epic Goal!', user: 'Striker09', likes: '12k' },
  { id: '2', title: 'Gym Motivation', user: 'FitFan', likes: '8k' },
  { id: '3', title: 'New Stadium Tour', user: 'ArenaVibes', likes: '25k' },
];

export default function ShortsScreen() {
  const renderItem = ({ item }) => (
    <View style={styles.videoContainer}>
      {/* Placeholder for Video Component (e.g., react-native-video) */}
      <View style={styles.videoPlaceholder}>
        <Ionicons name="play-circle" size={80} color="rgba(255,255,255,0.3)" />
      </View>

      {/* Overlay Information */}
      <View style={styles.overlay}>
        <Text style={styles.username}>@{item.user}</Text>
        <Text style={styles.description}>{item.title}</Text>
      </View>

      {/* Right Side Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="heart" size={35} color="white" />
          <Text style={styles.actionText}>{item.likes}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="chatbubble-ellipses" size={32} color="white" />
          <Text style={styles.actionText}>432</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="share-social" size={32} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={VIDEO_DATA}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        pagingEnabled // This makes it snap to each item like TikTok
        showsVerticalScrollIndicator={false}
        snapToInterval={height}
        snapToAlignment="start"
        decelerationRate="fast"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  videoContainer: { width: width, height: height - 70 }, // Adjust for TabBar height
  videoPlaceholder: {
    flex: 1,
    backgroundColor: '#162A3B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 80,
  },
  username: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  description: { color: '#fff', fontSize: 14, marginTop: 5 },
  actions: {
    position: 'absolute',
    bottom: 100,
    right: 15,
    alignItems: 'center',
  },
  actionButton: { marginBottom: 20, alignItems: 'center' },
  actionText: { color: '#fff', fontSize: 12, marginTop: 5 },
});
