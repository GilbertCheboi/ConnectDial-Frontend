import React, { useContext } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItem,
} from '@react-navigation/drawer';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Internal Imports
import { AuthContext } from '../store/authStore';
import MainTabNavigator from './MainTabNavigator';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Drawer = createDrawerNavigator();
const { width } = Dimensions.get('window');

function CustomDrawerContent(props) {
  const { logout, user } = useContext(AuthContext);

  // This list matches your onboarding/backend IDs
  const leagues = [
    { id: 1, name: 'Premier League', icon: 'soccer' },
    { id: 2, name: 'La Liga', icon: 'soccer' },
    { id: 3, name: 'NBA', icon: 'basketball' },
    { id: 4, name: 'Champions League', icon: 'trophy' },
  ];

  return (
    <View style={styles.drawerWrapper}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={{ paddingTop: 0 }}
      >
        {/* --- 1. PROFILE HEADER --- */}
        <TouchableOpacity
          style={styles.profileHeader}
          onPress={() => props.navigation.navigate('Profile')}
        >
          <Image
            source={{
              uri: `https://ui-avatars.com/api/?name=${
                user?.username || 'G'
              }&background=1E90FF&color=fff&bold=true`,
            }}
            style={styles.avatar}
          />
          <View>
            <Text style={styles.userName}>{user?.username || 'Gilly'}</Text>
            <Text style={styles.userHandle}>
              @{user?.username?.toLowerCase() || 'gilly'}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <Text style={styles.statText}>
              <Text style={styles.statNumber}>128</Text> Following
            </Text>
            <Text style={[styles.statText, { marginLeft: 15 }]}>
              <Text style={styles.statNumber}>450</Text> Followers
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* --- 2. GLOBAL FEED (ALL POSTS) --- */}
        <DrawerItem
          label="All Sports Feed"
          labelStyle={styles.globalLabel}
          icon={({ color, size }) => (
            <MaterialCommunityIcons name="earth" color="#1E90FF" size={24} />
          )}
          onPress={() => {
            // Passing leagueId: null clears the filter in your Home screen
            props.navigation.navigate('ConnectDial', {
              screen: 'Home',
              params: { leagueId: null, leagueName: 'All Sports' },
            });
          }}
        />

        <View style={styles.divider} />

        {/* --- 3. LEAGUE NAVIGATION --- */}
        <Text style={styles.sectionTitle}>Your Leagues</Text>
        {leagues.map(league => (
          <DrawerItem
            key={league.id}
            label={league.name}
            labelStyle={styles.leagueLabel}
            icon={({ color, size }) => (
              <MaterialCommunityIcons
                name={league.icon}
                color="#94A3B8"
                size={22}
              />
            )}
            onPress={() => {
              // Navigates to Home and filters by the specific League ID
              props.navigation.navigate('ConnectDial', {
                screen: 'Home',
                params: { leagueId: league.id, leagueName: league.name },
              });
            }}
          />
        ))}
      </DrawerContentScrollView>

      {/* --- 4. FOOTER: SETTINGS & LOGOUT --- */}
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
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#1E293B',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
          letterSpacing: 0.5,
        },
        drawerStyle: {
          backgroundColor: '#0D1F2D',
          width: width * 0.75, // Responsive width
        },
        drawerType: 'front',
        overlayColor: 'rgba(0,0,0,0.7)',
      }}
    >
      <Drawer.Screen
        name="ConnectDial"
        component={MainTabNavigator}
        options={{ title: 'ConnectDial' }}
      />
      <Drawer.Screen name="Profile" component={ProfileScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  drawerWrapper: {
    flex: 1,
    backgroundColor: '#0D1F2D',
  },
  profileHeader: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#1E90FF',
    backgroundColor: '#1E293B',
  },
  userName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userHandle: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 15,
  },
  statsRow: {
    flexDirection: 'row',
  },
  statText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  statNumber: {
    color: '#fff',
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#1E293B',
    marginVertical: 5,
    marginHorizontal: 10,
  },
  globalLabel: {
    color: '#1E90FF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: -10, // Adjusts label closer to icon
  },
  sectionTitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 20,
    marginVertical: 15,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  leagueLabel: {
    color: '#CBD5E1',
    fontSize: 15,
    fontWeight: '500',
    marginLeft: -10,
  },
  footerContainer: {
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingBottom: 20,
    backgroundColor: '#0D1F2D',
  },
  footerLabel: {
    color: '#CBD5E1',
    marginLeft: -10,
  },
  logoutLabel: {
    color: '#EF4444',
    fontWeight: 'bold',
    marginLeft: -10,
  },
});
