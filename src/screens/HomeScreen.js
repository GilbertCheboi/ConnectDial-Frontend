import React from 'react';
import { View, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Tabs, MaterialTabBar } from 'react-native-collapsible-tab-view';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FeedList from '../components/FeedList';

export default function HomeScreen({ route, navigation }) {
  const leagueId = route.params?.leagueId;

  const renderTabBar = props => (
    <MaterialTabBar
      {...props}
      style={styles.tabBar}
      indicatorStyle={styles.indicator}
      activeColor="#FFFFFF"
      inactiveColor="#64748B"
      labelStyle={styles.label}
    />
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ backgroundColor: '#0D1F2D' }} />

      <Tabs.Container
        renderTabBar={renderTabBar}
        headerHeight={0}
        revealHeaderOnScroll={true}
        snapThreshold={0.5}
      >
        <Tabs.Tab name="Global">
          {/* FeedList logic now handles league preferences internally */}
          <FeedList feedType="global" leagueId={leagueId} />
        </Tabs.Tab>
        <Tabs.Tab name="Following">
          <FeedList feedType="following" leagueId={leagueId} />
        </Tabs.Tab>
      </Tabs.Container>

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
  container: { flex: 1, backgroundColor: '#050B10' },
  tabBar: {
    backgroundColor: '#0D1F2D',
    height: 50,
    elevation: 0,
    shadowOpacity: 0,
  },
  indicator: {
    backgroundColor: '#1E90FF',
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
