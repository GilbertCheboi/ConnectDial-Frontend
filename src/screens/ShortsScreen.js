import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  FlatList,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Video from 'react-native-video';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../api/client';

const { height, width } = Dimensions.get('window');

// --- SINGLE VIDEO COMPONENT ---
const ShortItem = ({ item, isVisible, navigation }) => {
  const [videoError, setVideoError] = useState(false);

  const videoUrl = item.media_file.startsWith('http')
    ? item.media_file
    : `http://192.168.1.107:8000${item.media_file}`;

  return (
    <View style={styles.videoContainer}>
      <Video
        source={{ uri: videoUrl }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        paused={!isVisible} // Only plays when visible
        repeat={true}
        playInBackground={false}
        playWhenInactive={false}
        ignoreSilentSwitch="ignore"
        // 🚀 Android specific optimizations
        bufferConfig={{
          minBufferMs: 15000,
          maxBufferMs: 50000,
          bufferForPlaybackMs: 2500,
          bufferForPlaybackAfterRebufferMs: 5000,
        }}
        onLoad={() => console.log(`[Video] Playing ID: ${item.id}`)}
        onError={e => {
          console.error(`[Video] Error ID ${item.id}:`, e);
          setVideoError(true);
        }}
      />

      {/* Error State Overlay */}
      {videoError && (
        <View style={styles.errorOverlay}>
          <Ionicons name="alert-circle" size={50} color="#FF4B4B" />
          <Text style={{ color: '#fff', marginTop: 10 }}>
            Video Unavailable
          </Text>
        </View>
      )}

      {/* UI Overlays: Side Actions */}
      <View style={styles.sideActions}>
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons
            name="heart"
            size={38}
            color={item.user_has_liked ? '#FF4B4B' : '#fff'}
          />
          <Text style={styles.actionText}>{item.likes_count || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('Comments', { postId: item.id })}
        >
          <Ionicons name="chatbubble-ellipses" size={35} color="#fff" />
          <Text style={styles.actionText}>{item.comments_count || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="share-social" size={32} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* UI Overlays: Info Section */}
      <View style={styles.bottomInfo}>
        <Text style={styles.username}>
          @{item.author_details?.username || 'user'}
        </Text>
        <Text style={styles.caption} numberOfLines={2}>
          {item.content}
        </Text>

        {item.supporting_info?.league_name && (
          <View style={styles.leagueTag}>
            <Text style={styles.leagueTabText}>
              {item.supporting_info.league_name}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

// --- MAIN FEED SCREEN ---
export default function ShortsScreen({ navigation }) {
  const [shorts, setShorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewableIndex, setViewableIndex] = useState(0);

  const fetchShorts = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const response = await api.get('api/posts/shorts/');
      setShorts(response.data);
    } catch (err) {
      console.log('[API Error]:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchShorts();
    }, []),
  );

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems?.length > 0) {
      setViewableIndex(viewableItems[0].index);
    }
  }).current;

  // 🚀 Logic to ensure FlatList renders at the correct size
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E90FF" />
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      <FlatList
        data={shorts}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item, index }) => (
          <ShortItem
            item={item}
            isVisible={index === viewableIndex}
            navigation={navigation}
          />
        )}
        pagingEnabled
        vertical
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        // 🚀 Optimization for full-screen scrolling
        snapToInterval={height}
        snapToAlignment="start"
        decelerationRate="fast"
        getItemLayout={(data, index) => ({
          length: height,
          offset: height * index,
          index,
        })}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchShorts(true)}
            tintColor="#fff"
          />
        }
      />

      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#000' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  videoContainer: { height: height, width: width, backgroundColor: '#000' },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
  },
  backBtn: { position: 'absolute', top: 50, left: 20, zIndex: 10 },
  sideActions: {
    position: 'absolute',
    right: 15,
    bottom: 120,
    alignItems: 'center',
    zIndex: 5,
  },
  actionBtn: { alignItems: 'center', marginBottom: 20 },
  actionText: { color: '#fff', fontSize: 13, fontWeight: 'bold', marginTop: 5 },
  bottomInfo: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 100,
    zIndex: 5,
  },
  username: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
    marginBottom: 8,
  },
  caption: { color: '#fff', fontSize: 14, lineHeight: 20, marginBottom: 10 },
  leagueTag: {
    backgroundColor: 'rgba(30, 144, 255, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  leagueTabText: { color: '#1E90FF', fontSize: 12, fontWeight: 'bold' },
});
