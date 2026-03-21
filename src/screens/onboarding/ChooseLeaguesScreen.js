import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Button,
  Image,
} from 'react-native';

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

export default function ChooseLeaguesScreen({ navigation }) {
  const [selectedLeagues, setSelectedLeagues] = useState([]);

  const toggleLeague = id => {
    setSelectedLeagues(prev =>
      prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id],
    );
  };

  const proceed = () => {
    if (selectedLeagues.length === 0)
      return alert('Select at least one league to continue.');
    navigation.navigate('SelectTeams', { selectedLeagues });
  };

  const renderLeague = ({ item }) => {
    const isSelected = selectedLeagues.includes(item.id);
    return (
      <TouchableOpacity
        onPress={() => toggleLeague(item.id)}
        style={[styles.card, isSelected && styles.cardSelected]}
      >
        <Image source={item.logo} style={styles.logo} resizeMode="contain" />
        <Text style={[styles.name, isSelected && styles.nameSelected]}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Leagues You Follow</Text>
      <FlatList
        data={leagues}
        keyExtractor={item => item.id.toString()}
        renderItem={renderLeague}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
      <View style={{ marginTop: 20 }}>
        <Button title="Next" onPress={proceed} color="#1E90FF" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#0D1F2D' },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  row: { justifyContent: 'space-between', marginBottom: 15 },
  card: {
    flex: 0.48,
    backgroundColor: '#1A2A3D',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSelected: { backgroundColor: '#1E90FF' },
  logo: { width: 60, height: 60, marginBottom: 10 },
  name: { fontSize: 16, color: '#fff' },
  nameSelected: { color: '#fff', fontWeight: 'bold' },
});
