import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  Alert,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const leagues = [
  { id: 1, name: 'Premier League', logo: require('../assets/epl.png') },
  { id: 2, name: 'NBA', logo: require('../assets/NBA.jpeg') },
  { id: 3, name: 'NFL', logo: require('../assets/NFL.png') },
  { id: 4, name: 'F1', logo: require('../assets/F1.png') },
  {
    id: 5,
    name: 'Champions League',
    logo: require('../assets/Champions_League.png'),
  },
  { id: 6, name: 'MLB', logo: require('../assets/MLB.png') },
  { id: 7, name: 'NHL', logo: require('../assets/NHL-logo.jpg') },
  { id: 8, name: 'La Liga', logo: require('../assets/laliga.png') },
  { id: 9, name: 'Serie A', logo: require('../assets/Serie_A.png') },
  { id: 10, name: 'Bundesliga', logo: require('../assets/bundesliga.jpg') },
  { id: 11, name: 'Ligue 1', logo: require('../assets/Ligue1_logo.png') },
  { id: 12, name: 'Afcon', logo: require('../assets/Afcon.png') },
];

export default function ChooseLeaguesScreen({ navigation, route }) {
  const [selectedLeagues, setSelectedLeagues] = useState([]);

  // 🚀 MODE CHECK: Are we adding a new league or starting fresh?
  const isAddingNew = route.params?.mode === 'add';

  const toggleLeague = id => {
    setSelectedLeagues(prev =>
      prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id],
    );
  };

  const proceed = () => {
    if (selectedLeagues.length === 0) {
      return Alert.alert(
        'Selection Required',
        'Please select at least one league to continue.',
      );
    }

    // 🚀 Pass the mode forward to SelectTeams
    navigation.navigate('SelectTeams', {
      selectedLeagues,
      mode: isAddingNew ? 'add' : 'onboarding',
    });
  };

  const renderLeague = ({ item }) => {
    const isSelected = selectedLeagues.includes(item.id);
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => toggleLeague(item.id)}
        style={[styles.card, isSelected && styles.cardSelected]}
      >
        <View style={styles.logoContainer}>
          <Image source={item.logo} style={styles.logo} resizeMode="contain" />
          {isSelected && (
            <View style={styles.checkBadge}>
              <MaterialCommunityIcons
                name="check-circle"
                size={20}
                color="#fff"
              />
            </View>
          )}
        </View>
        <Text style={[styles.name, isSelected && styles.nameSelected]}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {isAddingNew ? 'Add New Leagues' : 'Welcome to ConnectDial'}
        </Text>
        <Text style={styles.subtitle}>
          {isAddingNew
            ? 'Select additional leagues you want to follow'
            : 'Choose the leagues you want to follow to personalize your feed'}
        </Text>
      </View>

      <FlatList
        data={leagues}
        keyExtractor={item => item.id.toString()}
        renderItem={renderLeague}
        numColumns={2}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      <View style={styles.footer}>
        <TouchableOpacity style={styles.nextButton} onPress={proceed}>
          <Text style={styles.nextButtonText}>Next: Select Teams</Text>
          <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1F2D' },
  header: { padding: 25, paddingTop: 40 },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
    lineHeight: 20,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  card: {
    flex: 0.48,
    backgroundColor: '#1A2A3D',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#1E293B',
  },
  cardSelected: {
    backgroundColor: '#0D1F2D',
    borderColor: '#1E90FF',
    borderWidth: 2,
  },
  logoContainer: { position: 'relative', marginBottom: 12 },
  logo: { width: 70, height: 70 },
  checkBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#1E90FF',
    borderRadius: 10,
  },
  name: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
    textAlign: 'center',
  },
  nameSelected: { color: '#fff', fontWeight: 'bold' },

  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: 20,
    backgroundColor: '#0D1F2D',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  nextButton: {
    backgroundColor: '#1E90FF',
    flexDirection: 'row',
    height: 55,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
});
