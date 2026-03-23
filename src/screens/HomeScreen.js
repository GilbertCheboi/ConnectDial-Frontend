import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Tabs, MaterialTabBar } from 'react-native-collapsible-tab-view';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FeedList from '../components/FeedList';

export default function HomeScreen({ route, navigation }) {
  const leagueId = route.params?.leagueId;

  // 🚀 CUSTOM PREMIUM TAB BAR
  const renderTabBar = props => (
    <MaterialTabBar
      {...props}
      style={styles.tabBar}
      indicatorStyle={styles.indicator}
      activeColor="#FFFFFF" // White text for active
      inactiveColor="#64748B" // Muted slate for inactive
      labelStyle={styles.label}
      // This makes the tabs even across the screen
      getLabelText={name => name}
    />
  );

  return (
    <View style={styles.container}>
      {/* 🚀 Safe Area prevents the tabs from overlapping the clock/battery */}
      <SafeAreaView style={{ backgroundColor: '#0D1F2D' }} />

      <Tabs.Container
        renderTabBar={renderTabBar}
        headerHeight={0}
        revealHeaderOnScroll={true}
        snapThreshold={0.5}
        // 🚀 This adds a subtle "snap" effect for a more native feel
        headerContainerStyle={styles.tabContainerShadow}
      >
        <Tabs.Tab name="Global">
          <FeedList feedType="global" leagueId={leagueId} />
        </Tabs.Tab>
        <Tabs.Tab name="Following">
          <FeedList feedType="following" leagueId={leagueId} />
        </Tabs.Tab>
      </Tabs.Container>

      {/* 🚀 GLOWING FAB (Floating Action Button) */}
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
  container: {
    flex: 1,
    backgroundColor: '#050B10', // 🚀 Darker background for better contrast with cards
  },
  tabBar: {
    backgroundColor: '#0D1F2D',
    height: 50,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1E293B',
    elevation: 0,
    shadowOpacity: 0,
  },
  tabContainerShadow: {
    // Adds a very subtle shadow only when the tab bar is visible
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 5,
  },
  indicator: {
    backgroundColor: '#1E90FF',
    height: 3,
    borderRadius: 3,
    // Makes the indicator slightly shorter than the full tab width for a "chic" look
    width: '30%',
    marginLeft: '10%',
  },
  label: {
    fontWeight: '700',
    textTransform: 'none',
    fontSize: 14,
    letterSpacing: 0.3,
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
    // 🚀 Added a "Glow" effect for the blue button
    shadowColor: '#1E90FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
});
