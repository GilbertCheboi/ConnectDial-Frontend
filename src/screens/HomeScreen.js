import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Tabs, MaterialTabBar } from 'react-native-collapsible-tab-view';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { ThemeContext } from '../store/themeStore';
import FeedList from '../components/FeedList';

export default function HomeScreen({ route, navigation }) {
  const [currentLeagueId, setCurrentLeagueId] = useState(route.params?.leagueId);
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

  // Update leagueId when route params change
  useEffect(() => {
    const newLeagueId = route.params?.leagueId;
    if (newLeagueId !== currentLeagueId) {
      setCurrentLeagueId(newLeagueId);
    }
  }, [route.params?.leagueId, currentLeagueId]);

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

  const openDrawer = () => {
    if (drawerNavigation?.openDrawer) {
      drawerNavigation.openDrawer();
    } else if (drawerNavigation?.toggleDrawer) {
      drawerNavigation.toggleDrawer();
    } else {
      console.warn('Drawer navigation not found');
    }
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaView style={{ backgroundColor: theme.colors.surface }} />

      <Tabs.Container
        renderTabBar={renderTabBar}
        headerHeight={0}
        revealHeaderOnScroll={true}
        snapThreshold={0.5}
      >
        <Tabs.Tab name="Global">
          {/* FeedList logic now handles league preferences internally */}
          <FeedList feedType="global" leagueId={currentLeagueId} />
        </Tabs.Tab>
        <Tabs.Tab name="Following">
          <FeedList feedType="following" leagueId={currentLeagueId} />
        </Tabs.Tab>
      </Tabs.Container>

      <View style={styles.drawerButtonWrapper} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.drawerButton}
          onPress={openDrawer}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="menu" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

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
