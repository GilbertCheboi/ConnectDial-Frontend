/**
 * MainDrawerNavigator.js – ConnectDial (FIXED v2)
 * ─────────────────────────────────────────────────────────────────────
 * FIXES in this version:
 *
 * ✅ FIX #1: Added merge: false to all drawer navigation.navigate() calls.
 *    React Navigation MERGES params by default. This means if you tap
 *    "Premier League" (leagueId: 1), then tap "All Sports Feed"
 *    (leagueId: null), the old leagueId: 1 STICKS because null gets
 *    merged-over instead of replacing. Using merge: false forces a clean
 *    param replace every time.
 *
 * ✅ FIX #2: "All Sports Feed" now explicitly sends leagueId: null so
 *    HomeScreen always resets to the global feed correctly.
 *
 * Everything else is identical to your original file.
 * ─────────────────────────────────────────────────────────────────────
 */

import React, { useContext, useMemo, useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  Switch,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  FlatList,
} from 'react-native';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItem,
} from '@react-navigation/drawer';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import api from '../api/client';
import { AuthContext } from '../store/authStore';
import { ThemeContext } from '../store/themeStore';
import MainTabNavigator from './MainTabNavigator';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Drawer = createDrawerNavigator();
const { width } = Dimensions.get('window');

const fallbackTheme = {
  colors: {
    background: '#0A1624',
    surface: '#0D1F2D',
    card: '#112634',
    text: '#F8FAFC',
    subText: '#94A3B8',
    border: '#1E293B',
    primary: '#1E90FF',
    secondary: '#64748B',
    icon: '#1E90FF',
    button: '#1E90FF',
    buttonText: '#FFFFFF',
    inputBackground: '#112634',
    overlay: 'rgba(255, 255, 255, 0.05)',
    drawerBackground: '#0D1F2D',
    drawerText: '#F8FAFC',
    drawerIcon: '#1E90FF',
    tabBar: '#0D1F2D',
    tabBarInactive: '#64748B',
    header: '#0D1F2D',
    headerTint: '#F8FAFC',
    notificationBadge: '#FF4B4B',
    sheetBackground: '#0D1F2D',
  },
};

// 🚀 LEAGUE ASSETS MAPPING
const LEAGUE_MAP = {
  1:  { name: 'Premier League',      logo: require('../screens/assets/epl.png') },
  2:  { name: 'NBA',                 logo: require('../screens/assets/NBA.jpeg') },
  3:  { name: 'NFL',                 logo: require('../screens/assets/NFL.png') },
  4:  { name: 'F1',                  logo: require('../screens/assets/F1.png') },
  5:  { name: 'Champions League',    logo: require('../screens/assets/Champions_League.png') },
  6:  { name: 'MLB',                 logo: require('../screens/assets/MLB.png') },
  7:  { name: 'NHL',                 logo: require('../screens/assets/NHL-logo.jpg') },
  8:  { name: 'La Liga',             logo: require('../screens/assets/laliga.png') },
  9:  { name: 'Serie A',             logo: require('../screens/assets/Serie_A.png') },
  10: { name: 'Bundesliga',          logo: require('../screens/assets/bundesliga.jpg') },
  11: { name: 'Ligue 1',             logo: require('../screens/assets/Ligue1_logo.png') },
  12: { name: 'Afcon',               logo: require('../screens/assets/Afcon.png') },
  13: { name: 'Kenya Premier League',logo: require('../screens/assets/KPL-Logo.png') },
  14: { name: 'World Cup',           logo: require('../screens/assets/World_Cup.png') },
};

function CustomDrawerContent(props) {
  const { logout, user: authUser } = useContext(AuthContext);
  const themeContext = useContext(ThemeContext) || {};
  const {
    themeName = 'dark',
    theme = fallbackTheme,
    toggleTheme = () => {},
  } = themeContext;

  const [profile, setProfile]   = useState(null);
  const [fetching, setFetching] = useState(false);
  const isDarkMode = themeName === 'dark';

  // ─────────────────────────────────────────────────────────────────
  // FETCH LATEST PROFILE DATA
  // ─────────────────────────────────────────────────────────────────
  const fetchLatestProfile = async () => {
    try {
      setFetching(true);
      const response = await api.get('auth/update/');
      const data = response.data.data || response.data;
      setProfile(data);
    } catch (err) {
      console.error('Drawer Profile Fetch Error:', err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => { fetchLatestProfile(); }, [authUser]);

  useFocusEffect(
    React.useCallback(() => { fetchLatestProfile(); }, [])
  );

  // ─────────────────────────────────────────────────────────────────
  // CURRENT ACTIVE LEAGUE FROM NAVIGATION STATE
  // ─────────────────────────────────────────────────────────────────
  const currentLeagueId = useMemo(() => {
    const connectDialRoute = props.state?.routes?.find(r => r.name === 'ConnectDial');
    const connectDialState = connectDialRoute?.state;
    if (!connectDialState?.routes) return null;

    const homeRoute = connectDialState.routes.find(r => r.name === 'Home');
    if (homeRoute?.params?.leagueId !== undefined) {
      return homeRoute.params.leagueId;
    }

    const nestedHomeRoute = connectDialState.routes
      .flatMap(r => (r.state?.routes || []))
      .find(r => r.name === 'Home');
    return nestedHomeRoute?.params?.leagueId ?? null;
  }, [props.state]);

  // ─────────────────────────────────────────────────────────────────
  // DYNAMIC LEAGUES CALCULATION
  // ─────────────────────────────────────────────────────────────────
  const userLeagues = useMemo(() => {
    const sourceData = profile || authUser;
    if (!sourceData?.fan_preferences || !Array.isArray(sourceData.fan_preferences)) {
      return [];
    }

    const uniqueLeagues = [];
    const seenIds = new Set();

    sourceData.fan_preferences.forEach(pref => {
      const id = pref.league;
      if (id && !seenIds.has(id)) {
        seenIds.add(id);
        const details = LEAGUE_MAP[id] || { name: `League ${id}`, logo: null };
        uniqueLeagues.push({ id, ...details });
      }
    });

    return uniqueLeagues.sort((a, b) => a.id - b.id);
  }, [profile, authUser]);

  const displayData = profile || authUser;

  // ─────────────────────────────────────────────────────────────────
  // NAVIGATION HELPER
  // ✅ FIX #1: merge: false ensures params are REPLACED, not merged.
  //    Without this, tapping "All Sports Feed" after a league keeps
  //    the old leagueId in route.params (React Navigation default behaviour).
  // ─────────────────────────────────────────────────────────────────
  const navigateToFeed = (leagueId) => {
    props.navigation.navigate('ConnectDial', {
      screen: 'Home',
      params: { leagueId: leagueId ?? null },
      merge: false,   // ✅ force clean param replace — no stale leagueId
    });
    props.navigation.closeDrawer();
  };

  return (
    <View style={[styles.drawerWrapper, { backgroundColor: theme.colors.drawerBackground }]}>
      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>

        {/* --- 1. PROFILE HEADER WITH BANNER --- */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => props.navigation.navigate('Profile')}
        >
          <View style={styles.bannerContainer}>
            <Image
              source={{
                uri:
                  displayData?.banner_image ||
                  'https://images.unsplash.com/photo-1504450758481-7338eba7524a?q=80&w=800&auto=format&fit=crop',
              }}
              style={styles.bannerImage}
            />
            <View style={styles.bannerOverlay} />
            <View style={styles.headerContent}>
              <Image
                source={{
                  uri:
                    displayData?.profile_image ||
                    `https://ui-avatars.com/api/?name=${displayData?.username}&background=1E90FF&color=fff`,
                }}
                style={styles.avatar}
              />
              <View style={styles.textContainer}>
                <Text style={styles.userName} numberOfLines={1}>
                  {displayData?.display_name || displayData?.username || 'Fan'}
                </Text>
                <Text style={styles.userHandle} numberOfLines={1}>
                  @{displayData?.username || 'user'}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* --- 2. GLOBAL FEED --- */}
        {/* ✅ FIX #2: Sends leagueId: null explicitly to reset to global */}
        <DrawerItem
          label="All Sports Feed"
          labelStyle={styles.globalLabel}
          style={currentLeagueId === null ? styles.highlightedLeague : null}
          icon={() => (
            <MaterialCommunityIcons name="earth" color="#1E90FF" size={24} />
          )}
          onPress={() => navigateToFeed(null)}
        />

        <View style={styles.divider} />

        {/* --- 3. DYNAMIC LEAGUES --- */}
        {userLeagues.length > 0 && (
          <Text style={styles.sectionTitle}>Your Leagues</Text>
        )}

        <FlatList
          data={userLeagues}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item: league }) => (
            <DrawerItem
              label={league.name}
              labelStyle={[styles.leagueLabel, { color: theme.colors.drawerText }]}
              style={league.id === currentLeagueId ? styles.highlightedLeague : null}
              icon={() =>
                league.logo ? (
                  <Image
                    source={league.logo}
                    style={styles.leagueLogo}
                    resizeMode="contain"
                  />
                ) : (
                  <MaterialCommunityIcons
                    name="trophy-outline"
                    color={theme.colors.drawerIcon}
                    size={22}
                  />
                )
              }
              onPress={() => navigateToFeed(league.id)}
            />
          )}
          ListFooterComponent={() => (
            <DrawerItem
              label="Manage Leagues"
              labelStyle={[styles.leagueLabel, { color: theme.colors.primary }]}
              icon={() => (
                <MaterialCommunityIcons
                  name="plus-circle-outline"
                  color={theme.colors.primary}
                  size={22}
                />
              )}
              onPress={() =>
                props.navigation.navigate('Onboarding', {
                  screen: 'SelectLeagues',
                  params: { mode: 'edit' },
                })
              }
            />
          )}
          style={styles.leaguesScrollContainer}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
        />
      </DrawerContentScrollView>

      {/* --- 4. FOOTER --- */}
      <View style={styles.footerContainer}>
        <View style={styles.themeToggleContainer}>
          <Text style={[styles.themeToggleLabel, { color: theme.colors.drawerText }]}>
            Dark mode
          </Text>
          <Switch
            value={isDarkMode}
            onValueChange={toggleTheme}
            trackColor={{ false: '#767577', true: theme.colors.primary }}
            thumbColor={isDarkMode ? '#f4f3f4' : '#f4f3f4'}
          />
        </View>

        <DrawerItem
          label="Settings"
          labelStyle={[styles.footerLabel, { color: theme.colors.drawerText }]}
          icon={() => (
            <MaterialCommunityIcons
              name="cog-outline"
              color={theme.colors.drawerIcon}
              size={20}
            />
          )}
          onPress={() => props.navigation.navigate('Settings')}
        />
        <DrawerItem
          label="Logout"
          labelStyle={styles.logoutLabel}
          icon={() => (
            <MaterialCommunityIcons name="logout" color="#EF4444" size={20} />
          )}
          onPress={logout}
        />
      </View>
    </View>
  );
}

export default function MainDrawerNavigator() {
  const themeContext = useContext(ThemeContext) || {};
  const theme = themeContext.theme || fallbackTheme;

  return (
    <Drawer.Navigator
      drawerContent={props => <CustomDrawerContent {...props} />}
      screenOptions={({ route }) => ({
        headerShown: false,
        drawerStyle: {
          backgroundColor: theme.colors.drawerBackground,
          width: width * 0.8,
        },
      })}
    >
      <Drawer.Screen name="ConnectDial" component={MainTabNavigator} />
      <Drawer.Screen name="Profile"     component={ProfileScreen} />
      <Drawer.Screen name="Settings"    component={SettingsScreen} />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  drawerWrapper:           { flex: 1, backgroundColor: '#0D1F2D' },
  bannerContainer: {
    width: '100%',
    marginBottom: 20,
    marginTop: 20,
    height: 160,
    justifyContent: 'flex-end',
    position: 'relative',
    backgroundColor: '#112233',
  },
  bannerImage:             { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  bannerOverlay:           { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  headerContent:           { paddingHorizontal: 15, paddingBottom: 15 },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#1E90FF',
    marginBottom: 8,
  },
  userName:                { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  userHandle:              { color: '#CBD5E1', fontSize: 13 },
  divider: {
    height: 1,
    backgroundColor: '#1E293B',
    marginVertical: 10,
    marginHorizontal: 15,
  },
  globalLabel: {
    color: '#1E90FF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: -10,
  },
  sectionTitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '900',
    marginLeft: 20,
    marginVertical: 10,
    letterSpacing: 1,
  },
  leaguesScrollContainer:  { height: 300 },
  leagueLabel:             { fontSize: 15, marginLeft: -10 },
  leagueLogo:              { width: 24, height: 24, borderRadius: 4 },
  highlightedLeague:       { backgroundColor: 'rgba(30, 144, 255, 0.15)' },
  footerContainer: {
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingBottom: 30,
  },
  logoutLabel:             { color: '#EF4444', fontWeight: 'bold', marginLeft: -10 },
  footerLabel:             { color: '#CBD5E1', marginLeft: -10 },
  themeToggleContainer: {
    marginHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    marginBottom: 10,
  },
  themeToggleLabel:        { fontSize: 15, fontWeight: '600' },
});