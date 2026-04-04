import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  StatusBar,
  Animated,
  Platform,
} from 'react-native';
import Video from 'react-native-video';
import YoutubePlayer from 'react-native-youtube-iframe';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../api/client';
import { useIsFocused } from '@react-navigation/native';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('screen');

// 💡 Extracts YouTube ID from URL
const getYouTubeId = url => {
  const regex =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url?.match(regex);
  return match ? match[1] : null;
};

const ShortItem = React.memo(({ item, isVisible, navigation }) => {
  const [isBuffering, setIsBuffering] = useState(true);
  const [liked, setLiked] = useState(item.liked_by_me || item.user_has_liked);
  const [likesCount, setLikesCount] = useState(item.likes_count || 0);
  const [userPaused, setUserPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const youtubeId = getYouTubeId(item.content);

  // --- HYBRID DATA MAPPING (FIXES USERNAME/TEAM/LEAGUE) ---
  const username =
    item.author?.username || item.author_details?.username || 'user';
  const teamName = item.team?.name || item.team_details?.name || null;
  const leagueName = item.league?.name || item.league_details?.name || 'SPORT';

  // Animation Refs
  const heartScale = useRef(new Animated.Value(0)).current;
  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  const feedbackScale = useRef(new Animated.Value(0)).current;
  const lastTap = useRef(0);

  useEffect(() => {
    if (!isVisible) setUserPaused(false);
  }, [isVisible]);

  const toggleLike = async () => {
    const prevState = liked;
    setLiked(!prevState);
    setLikesCount(prevState ? likesCount - 1 : likesCount + 1);
    try {
      await api.post(`api/posts/${item.id}/like/`);
    } catch (err) {
      setLiked(prevState);
      setLikesCount(prevState ? likesCount : likesCount - 1);
    }
  };

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      // ❤️ DOUBLE TAP: LIKE
      heartScale.setValue(0);
      Animated.sequence([
        Animated.spring(heartScale, {
          toValue: 1,
          useNativeDriver: true,
          bounciness: 12,
        }),
        Animated.timing(heartScale, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
          delay: 400,
        }),
      ]).start();
      if (!liked) toggleLike();
    } else {
      // ⏯️ SINGLE TAP: PLAY/PAUSE
      setUserPaused(!userPaused);
      feedbackOpacity.setValue(1);
      feedbackScale.setValue(0.5);
      Animated.parallel([
        Animated.spring(feedbackScale, {
          toValue: 1.2,
          useNativeDriver: true,
          friction: 4,
        }),
        Animated.timing(feedbackOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
          delay: 200,
        }),
      ]).start();
    }
    lastTap.current = now;
  };

  return (
    <View style={styles.videoContainer}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleTap}
        style={StyleSheet.absoluteFill}
      >
        {youtubeId ? (
          /* 📺 YouTube Player Layer */
          <View style={styles.youtubeWrapper}>
            <YoutubePlayer
              height={SCREEN_HEIGHT}
              width={SCREEN_WIDTH}
              play={isVisible && !userPaused}
              videoId={youtubeId}
              mute={isMuted}
              onReady={() => setIsBuffering(false)}
              initialPlayerParams={{
                loop: true,
                controls: 0,
                modestbranding: 1,
                rel: 0,
              }}
            />
            {/* Transparent layer to catch the tap events over the iframe */}
            <View style={StyleSheet.absoluteFill} />
          </View>
        ) : (
          /* 📹 Native Video Layer */
          <Video
            source={{ uri: item.media_file }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            paused={!isVisible || userPaused}
            repeat={true}
            muted={isMuted}
            onLoad={() => setIsBuffering(false)}
            onBuffer={({ isBuffering }) => setIsBuffering(isBuffering)}
          />
        )}
      </TouchableOpacity>

      {/* 🚀 ANIMATION OVERLAY (Z-INDEX 100) */}
      <View style={styles.overlayContainer} pointerEvents="none">
        <Animated.View
          style={[
            styles.iconWrapper,
            { opacity: feedbackOpacity, transform: [{ scale: feedbackScale }] },
          ]}
        >
          <View style={styles.iconCircle}>
            <Ionicons
              name={userPaused ? 'play' : 'pause'}
              size={40}
              color="white"
            />
          </View>
        </Animated.View>
        <Animated.View
          style={[
            styles.iconWrapper,
            { transform: [{ scale: heartScale }], position: 'absolute' },
          ]}
        >
          <Ionicons name="heart" size={110} color="#FF4B4B" />
        </Animated.View>
      </View>

      {/* 🔊 TOP CONTROLS */}
      <TouchableOpacity
        style={styles.muteBtn}
        onPress={() => setIsMuted(!isMuted)}
      >
        <Ionicons
          name={isMuted ? 'volume-mute' : 'volume-high'}
          size={22}
          color="#fff"
        />
      </TouchableOpacity>

      <View style={styles.leagueBadge}>
        <Text style={styles.leagueBadgeText}>{leagueName}</Text>
      </View>

      {isBuffering && (
        <ActivityIndicator style={styles.loader} size="large" color="#1E90FF" />
      )}

      {/* ❤️ SIDE ACTIONS */}
      <View style={styles.sideActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={toggleLike}>
          <Ionicons name="heart" size={40} color={liked ? '#FF4B4B' : '#fff'} />
          <Text style={styles.actionText}>{likesCount}</Text>
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

      {/* 👤 BOTTOM INFO */}
      <View style={styles.bottomInfo}>
        <View style={styles.userRow}>
          <Text style={styles.username}>@{username}</Text>
          {teamName && (
            <View style={styles.teamTag}>
              <Text style={styles.teamTagText}>{teamName}</Text>
            </View>
          )}
        </View>
        <Text style={styles.caption} numberOfLines={2}>
          {item.content}
        </Text>
      </View>
    </View>
  );
});

export default function ShortsScreen({ navigation }) {
  const [shorts, setShorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewableIndex, setViewableIndex] = useState(0);
  const isFocused = useIsFocused();

  const fetchShorts = async () => {
    try {
      const response = await api.get('api/posts/shorts/');
      setShorts(response.data.results || response.data);
    } catch (err) {
      console.error('Shorts Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShorts();
  }, []);

  useEffect(() => {
    if (isFocused) {
      StatusBar.setHidden(true, 'fade');
    } else {
      StatusBar.setHidden(false, 'fade');
    }
  }, [isFocused]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems?.length > 0) setViewableIndex(viewableItems[0].index);
  }).current;

  if (loading)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E90FF" />
      </View>
    );

  return (
    <View style={styles.mainContainer}>
      <FlatList
        data={shorts}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item, index }) => (
          <ShortItem
            item={item}
            isVisible={isFocused && index === viewableIndex}
            navigation={navigation}
          />
        )}
        pagingEnabled
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum={true}
      />
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="chevron-back" size={30} color="#fff" />
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
  videoContainer: { height: SCREEN_HEIGHT, width: SCREEN_WIDTH },

  // 📺 Fix: Full Screen YouTube wrapper centering the content
  youtubeWrapper: {
    height: SCREEN_HEIGHT,
    width: SCREEN_WIDTH,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },

  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  iconWrapper: { justifyContent: 'center', alignItems: 'center' },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loader: { position: 'absolute', top: '48%', left: '45%', zIndex: 110 },
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 30,
    left: 15,
    zIndex: 110,
  },
  muteBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 65 : 35,
    left: 60,
    zIndex: 110,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 6,
    borderRadius: 20,
  },

  leagueBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 65 : 35,
    right: 15,
    backgroundColor: '#1E90FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 110,
  },
  leagueBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  sideActions: {
    position: 'absolute',
    right: 12,
    bottom: 160,
    alignItems: 'center',
    zIndex: 110,
  },
  actionBtn: { alignItems: 'center', marginBottom: 25 },
  actionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 4,
    textShadowColor: 'black',
    textShadowRadius: 2,
  },

  bottomInfo: {
    position: 'absolute',
    bottom: 100,
    left: 15,
    right: 100,
    zIndex: 110,
  },
  userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  username: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
    textShadowColor: 'black',
    textShadowRadius: 3,
  },
  teamTag: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 5,
    marginLeft: 12,
  },
  teamTagText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  caption: {
    color: '#eee',
    fontSize: 15,
    lineHeight: 21,
    textShadowColor: 'black',
    textShadowRadius: 2,
  },
});
