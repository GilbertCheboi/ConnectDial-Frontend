import React, { useContext, useMemo, useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItem,
} from '@react-navigation/drawer';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Internal Imports
import api from '../api/client';
import { AuthContext } from '../store/authStore';
import MainTabNavigator from './MainTabNavigator';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Drawer = createDrawerNavigator();
const { width } = Dimensions.get('window');

// 🚀 LEAGUE ASSETS MAPPING
const LEAGUE_MAP = {
  1: { name: 'Premier League', logo: require('../screens/assets/epl.png') },
  2: { name: 'NBA', logo: require('../screens/assets/NBA.jpeg') },
  3: { name: 'NFL', logo: require('../screens/assets/NFL.png') },
  4: { name: 'F1', logo: require('../screens/assets/F1.png') },
  5: {
    name: 'Champions League',
    logo: require('../screens/assets/Champions_League.png'),
  },
  6: { name: 'MLB', logo: require('../screens/assets/MLB.png') },
  7: { name: 'NHL', logo: require('../screens/assets/NHL-logo.jpg') },
  8: { name: 'La Liga', logo: require('../screens/assets/laliga.png') },
  9: { name: 'Serie A', logo: require('../screens/assets/Serie_A.png') },
  10: { name: 'Bundesliga', logo: require('../screens/assets/bundesliga.jpg') },
  11: { name: 'Ligue 1', logo: require('../screens/assets/Ligue1_logo.png') },
  12: { name: 'Afcon', logo: require('../screens/assets/Afcon.png') },
};

function CustomDrawerContent(props) {
  const { logout, user: authUser } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [fetching, setFetching] = useState(false);

  // 🚀 1. FETCH LATEST PROFILE DATA (Same logic as ProfileScreen)
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

  useEffect(() => {
    fetchLatestProfile();
  }, [authUser]); // Re-run if auth state changes

  // 🚀 2. DYNAMIC LEAGUES CALCULATION
  const userLeagues = useMemo(() => {
    // Use profile data if fetched, otherwise fallback to authUser
    const sourceData = profile || authUser;
    if (
      !sourceData?.fan_preferences ||
      !Array.isArray(sourceData.fan_preferences)
    )
      return [];

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

  // Use profile for display, fallback to authUser
  const displayData = profile || authUser;

  return (
    <View style={styles.drawerWrapper}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={{ paddingTop: 0 }}
      >
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
        <DrawerItem
          label="All Sports Feed"
          labelStyle={styles.globalLabel}
          icon={() => (
            <MaterialCommunityIcons name="earth" color="#1E90FF" size={24} />
          )}
          onPress={() =>
            props.navigation.navigate('ConnectDial', {
              screen: 'Home',
              params: { leagueId: null },
            })
          }
        />

        <View style={styles.divider} />

        {/* --- 3. DYNAMIC LEAGUES --- */}
        {userLeagues.length > 0 && (
          <Text style={styles.sectionTitle}>Your Leagues</Text>
        )}

        {userLeagues.map(league => (
          <DrawerItem
            key={league.id}
            label={league.name}
            labelStyle={styles.leagueLabel}
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
                  color="#94A3B8"
                  size={22}
                />
              )
            }
            onPress={() =>
              props.navigation.navigate('ConnectDial', {
                screen: 'Home',
                params: { leagueId: league.id },
              })
            }
          />
        ))}

        <DrawerItem
          label="Manage Leagues"
          labelStyle={[styles.leagueLabel, { color: '#1E90FF' }]}
          icon={() => (
            <MaterialCommunityIcons
              name="plus-circle-outline"
              color="#1E90FF"
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
      </DrawerContentScrollView>

      {/* --- 4. FOOTER --- */}
      <View style={styles.footerContainer}>
        <DrawerItem
          label="Settings"
          labelStyle={styles.footerLabel}
          icon={() => (
            <MaterialCommunityIcons
              name="cog-outline"
              color="#CBD5E1"
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
  return (
    <Drawer.Navigator
      drawerContent={props => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0D1F2D',
          borderBottomWidth: 1,
          borderBottomColor: '#1E293B',
        },
        headerTintColor: '#fff',
        drawerStyle: { backgroundColor: '#0D1F2D', width: width * 0.8 },
      }}
    >
      <Drawer.Screen name="ConnectDial" component={MainTabNavigator} />
      <Drawer.Screen name="Profile" component={ProfileScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  drawerWrapper: { flex: 1, backgroundColor: '#0D1F2D' },
  bannerContainer: {
    width: '100%',
    marginBottom: 20,
    marginTop: 20,
    height: 160,
    justifyContent: 'flex-end',
    position: 'relative',
    backgroundColor: '#112233',
  },
  bannerImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  headerContent: { paddingHorizontal: 15, paddingBottom: 15 },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#1E90FF',
    marginBottom: 8,
  },
  userName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  userHandle: { color: '#CBD5E1', fontSize: 13 },
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
  leagueLabel: { color: '#CBD5E1', fontSize: 15, marginLeft: -10 },
  leagueLogo: { width: 24, height: 24, borderRadius: 4 },
  footerContainer: {
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingBottom: 30,
  },
  logoutLabel: { color: '#EF4444', fontWeight: 'bold', marginLeft: -10 },
  footerLabel: { color: '#CBD5E1', marginLeft: -10 },
});
