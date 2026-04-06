import React, { useState, useEffect, useRef, useContext } from 'react';
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
  RefreshControl,
} from 'react-native';
import Video from 'react-native-video';
import YoutubePlayer from 'react-native-youtube-iframe';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../api/client';
import { useIsFocused } from '@react-navigation/native';
import { ThemeContext } from '../store/themeStore';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('screen');

// 💡 Extracts YouTube ID from URL
const getYouTubeId = url => {
  const regex =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url?.match(regex);
  return match ? match[1] : null;
};

const ShortItem = React.memo(({ item, isVisible, navigation, theme }) => {
  const [isBuffering, setIsBuffering] = useState(true);
  const [liked, setLiked] = useState(item.liked_by_me || item.user_has_liked);
  const [likesCount, setLikesCount] = useState(item.likes_count || 0);
  const [userPaused, setUserPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const youtubeId = getYouTubeId(item.content);
  const support = item.supporting_info || {};

  // --- HYBRID DATA MAPPING (FIXES USERNAME/TEAM/LEAGUE) ---
  const username =
    item.author?.username || item.author_details?.username || 'user';
  const teamName =
    item.team?.name || item.team_details?.name || support.team_name || null;
  const leagueName =
    item.league?.name ||
    item.league_details?.name ||
    support.league_name ||
    'SPORT';

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

      <TouchableOpacity
        activeOpacity={1}
        onPress={handleTap}
        style={styles.tapOverlay}
      />

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
          <Ionicons
            name="heart"
            size={110}
            color={theme.colors.notificationBadge}
          />
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
        <ActivityIndicator
          style={styles.loader}
          size="large"
          color={theme.colors.primary}
        />
      )}

      {/* ❤️ SIDE ACTIONS */}
      <View style={styles.sideActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={toggleLike}>
          <Ionicons
            name="heart"
            size={40}
            color={liked ? theme.colors.notificationBadge : theme.colors.text}
          />
          <Text style={styles.actionText}>{likesCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('Comments', { postId: item.id })}
        >
          <Ionicons
            name="chatbubble-ellipses"
            size={35}
            color={theme.colors.text}
          />
          <Text style={styles.actionText}>{item.comments_count || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="share-social" size={32} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* 👤 BOTTOM INFO */}
      <View style={styles.bottomInfo}>
        <View style={styles.userRow}>
          <Text style={[styles.username, { color: theme.colors.text }]}>
            @{username}
          </Text>
          {teamName && (
            <View style={styles.teamTag}>
              <Text style={[styles.teamTagText, { color: theme.colors.text }]}>
                {teamName}
              </Text>
            </View>
          )}
        </View>
        <Text
          style={[styles.caption, { color: theme.colors.subText }]}
          numberOfLines={2}
        >
          {item.content}
        </Text>
      </View>
    </View>
  );
});

export default function ShortsScreen({ navigation }) {
  const { theme } = useContext(ThemeContext) || {
    theme: {
      colors: {
        background: '#000000',
        primary: '#1E90FF',
        text: '#FFFFFF',
        subText: '#EEEEEE',
        notificationBadge: '#FF4B4B',
      },
    },
  };
  const [shorts, setShorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [viewableIndex, setViewableIndex] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const isFocused = useIsFocused();

  const PAGE_SIZE = 10;

  const fetchShorts = async ({ isRefresh = false, pageOffset = 0 } = {}) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        setOffset(0);
        setHasMore(true);
      } else if (pageOffset > 0) {
        setIsLoadingMore(true);
      }

      // 🚀 Add pagination parameters
      const response = await api.get(
        `api/posts/shorts/?limit=${PAGE_SIZE}&offset=${pageOffset}`,
      );

      const data = response.data;
      const incoming = data.results || data;
      const totalCount = data.count || 0;

      if (pageOffset === 0) {
        // 🚀 First page: replace all
        setShorts(incoming);
      } else {
        // 🚀 Subsequent pages: append
        setShorts(prev => [...prev, ...incoming]);
      }

      // 🚀 Check if there are more pages
      const nextOffset = pageOffset + PAGE_SIZE;
      setHasMore(nextOffset < totalCount);
      setOffset(nextOffset);
    } catch (err) {
      console.error('Shorts Fetch Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchShorts({ pageOffset: 0 });
  }, []);

  const handleRefresh = () => {
    fetchShorts({ isRefresh: true, pageOffset: 0 });
  };

  const handleEndReached = ({ distanceFromEnd }) => {
    // 🚀 Trigger load more when within 500 points of end for shorts
    if (distanceFromEnd < 500 && hasMore && !isLoadingMore && !loading) {
      fetchShorts({ pageOffset: offset });
    }
  };

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
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );

  return (
    <View
      style={[
        styles.mainContainer,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <FlatList
        data={shorts}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item, index }) => (
          <ShortItem
            item={item}
            isVisible={isFocused && index === viewableIndex}
            navigation={navigation}
            theme={theme}
          />
        )}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.loadMoreIndicator}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : null
        }
        pagingEnabled
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      />
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="chevron-back" size={30} color={theme.colors.text} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoContainer: { height: SCREEN_HEIGHT, width: SCREEN_WIDTH },

  // 📺 Fix: Full Screen YouTube wrapper centering the content
  youtubeWrapper: {
    height: SCREEN_HEIGHT,
    width: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },

  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  tapOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
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
  teamTagText: { fontSize: 11, fontWeight: '700' },
  caption: {
    fontSize: 15,
    lineHeight: 21,
    textShadowColor: 'black',
    textShadowRadius: 2,
  },
  loadMoreIndicator: {
    paddingVertical: 20,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
});
