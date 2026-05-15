import React, { useContext, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Text,
} from 'react-native';
import { Tabs, MaterialTabBar } from 'react-native-collapsible-tab-view';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQueryClient } from '@tanstack/react-query';
import { ThemeContext } from '../store/themeStore';
import FeedList from '../components/FeedList';

export default function HomeScreen({ route, navigation }) {
  // ✅ FIX: Read leagueId from route params.
  // Defaults to null (= global/all-sports feed) when no league is selected.
  const leagueId = route?.params?.leagueId ?? null;

  const queryClient = useQueryClient();
  const prevLeagueIdRef = useRef(leagueId);

  const { theme } = useContext(ThemeContext) || {
    theme: {
      colors: {
        background: '#050B10',
        surface: '#0D1F2D',
        primary: '#1E90FF',
        text: '#FFFFFF',
        subText: '#64748B',
      },
    },
  };

  // ─────────────────────────────────────────────────────────────────
  // ✅ FIX: Invalidate the league feed cache when leagueId changes.
  //
  // React Navigation does NOT re-mount HomeScreen on param changes —
  // it just updates route.params. The component re-renders, and since
  // leagueId flows into FeedList's queryKey it will refetch.
  // But we also proactively invalidate to drop any stale league cache.
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (prevLeagueIdRef.current !== leagueId) {
      console.log(
        '🏆 League changed:',
        prevLeagueIdRef.current,
        '→',
        leagueId,
      );
      // Invalidate only league-type queries so other feeds stay cached
      queryClient.invalidateQueries({
        queryKey: ['posts', 'league'],
        exact: false,
      });
      prevLeagueIdRef.current = leagueId;
    }
  }, [leagueId, queryClient]);

  // ─────────────────────────────────────────────────────────────────
  // Drawer navigation helper (unchanged from your original)
  // ─────────────────────────────────────────────────────────────────
  const findDrawerNavigation = nav => {
    let parent = nav;
    while (parent) {
      if (typeof parent.openDrawer === 'function') return parent;
      if (typeof parent.toggleDrawer === 'function') return parent;
      parent = parent.getParent?.();
    }
    return null;
  };

  const drawerNavigation = findDrawerNavigation(navigation);

  const openDrawer = () => {
    if (drawerNavigation?.openDrawer) {
      drawerNavigation.openDrawer();
    } else if (drawerNavigation?.toggleDrawer) {
      drawerNavigation.toggleDrawer();
    } else {
      console.warn('Drawer navigation not found');
    }
  };

  const renderTabBar = props => (
    <MaterialTabBar
      {...props}
      style={[styles.tabBar, { backgroundColor: theme.colors.surface }]}
      indicatorStyle={[
        styles.indicator,
        { backgroundColor: theme.colors.primary },
      ]}
      activeColor={theme.colors.text}
      inactiveColor={theme.colors.subText}
      labelStyle={styles.label}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SafeAreaView style={{ backgroundColor: theme.colors.surface }} />

      <Tabs.Container
        renderTabBar={renderTabBar}
        headerHeight={0}
        revealHeaderOnScroll={true}
        snapThreshold={0.5}
        // ✅ FIX: Key forces Tabs.Container to fully remount when the league
        // changes. Without this, the collapsible tab view holds onto stale
        // scroll positions and cached tab renders from the previous league.
        key={leagueId ?? 'global'}
      >
        {/* ── GLOBAL / LEAGUE FEED ───────────────────────────────── */}
        <Tabs.Tab
          name={leagueId ? 'League' : 'Global'}
          label={leagueId ? '🏆 League Feed' : '🌍 Global'}
        >
          {/*
           * ✅ FIX: feedType switches to 'league' when leagueId is set.
           *    leagueId only passed to this tab — Following always ignores it.
           *
           *  Global tab behaviour:
           *    leagueId = null → feedType='global'  → all posts
           *    leagueId = 3   → feedType='league'   → NFL posts only
           */}
          <FeedList
            feedType={leagueId ? 'league' : 'global'}
            leagueId={leagueId}
          />
        </Tabs.Tab>

        {/* ── FOLLOWING FEED ─────────────────────────────────────── */}
        <Tabs.Tab name="Following">
          {/*
           * ✅ FIX: leagueId is intentionally NOT passed here.
           *    Following feed always shows posts from followed users,
           *    regardless of which league the drawer has selected.
           */}
          <FeedList feedType="following" leagueId={null} />
        </Tabs.Tab>
      </Tabs.Container>

      {/* ── DRAWER BUTTON ──────────────────────────────────────────── */}
      <View style={styles.drawerButtonWrapper} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.drawerButton}
          onPress={openDrawer}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="menu" size={26} color="#fff" />
        </TouchableOpacity>

        {/* ✅ BONUS: Show active league name under the drawer button */}
        {leagueId && (
          <View style={styles.leagueBadge}>
            <MaterialCommunityIcons
              name="trophy"
              size={11}
              color="#1E90FF"
            />
            <Text style={styles.leagueBadgeText} numberOfLines={1}>
              League feed active
            </Text>
          </View>
        )}
      </View>

      {/* ── CREATE POST FAB ────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreatePost')}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="pencil-plus" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: {
    height: 50,
    elevation: 0,
    shadowOpacity: 0,
  },
  indicator: {
    height: 3,
    borderRadius: 3,
    width: '30%',
    marginLeft: '10%',
  },
  label: {
    fontWeight: '700',
    textTransform: 'none',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  drawerButtonWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    height: Platform.OS === 'ios' ? 90 : 70,
    pointerEvents: 'box-none',
  },
  drawerButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 24,
    left: 18,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#162A3B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E90FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 20,
  },
  leagueBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 28,
    left: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(30,144,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(30,144,255,0.4)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  leagueBadgeText: {
    color: '#1E90FF',
    fontSize: 11,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    backgroundColor: '#1E90FF',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#1E90FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
});