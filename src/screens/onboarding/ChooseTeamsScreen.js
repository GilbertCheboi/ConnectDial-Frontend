import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Button, Image, ScrollView } from 'react-native';
import axios from 'axios';

// Example static teams; in production, fetch from backend
const teamsByLeague = {
  1: [ // Premier League
    { id: 10, name: "Arsenal", logo: require('../assets/arsenal.png') },
    { id: 11, name: "Liverpool", logo: require('../assets/liverpool.png') },
    { id: 12, name: "Manchester United", logo: require('../assets/manutd.png') },
  ],
  2: [ // NBA
    { id: 20, name: "Lakers", logo: require('../assets/lakers.png') },
    { id: 21, name: "Warriors", logo: require('../assets/warriors.png') },
    { id: 22, name: "Celtics", logo: require('../assets/celtics.png') },
  ],
  3: [ // NFL
    { id: 30, name: "Chiefs", logo: require('../assets/chiefs.png') },
    { id: 31, name: "Cowboys", logo: require('../assets/cowboys.png') },
    { id: 32, name: "49ers", logo: require('../assets/49ers.png') },
  ],
  // add other leagues...
};

export default function ChooseTeamsScreen({ route, navigation }) {
  const { selectedLeagues } = route.params; // array of league IDs
  const [selectedTeams, setSelectedTeams] = useState({}); // { leagueId: teamId }

  // Toggle selection: only one team per league
  const selectTeam = (leagueId, teamId) => {
    setSelectedTeams(prev => ({ ...prev, [leagueId]: teamId }));
  };

  // Submit onboarding
  const submitOnboarding = async () => {
    if (Object.keys(selectedTeams).length !== selectedLeagues.length) {
      return alert("Please select one team for each league.");
    }

    const payload = {
      fan_preferences: Object.entries(selectedTeams).map(([leagueId, teamId]) => ({
        league: parseInt(leagueId),
        team: teamId
      }))
    };

    try {
      await axios.post("http://YOUR_IP:8000/accounts/onboarding/", payload, {
        headers: { Authorization: `Bearer ${token}` } // replace with auth token
      });
      navigation.replace("Home"); // go to main app
    } catch (error) {
      console.error(error);
      alert("Error submitting preferences.");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Pick One Team Per League</Text>
      
      {selectedLeagues.map(leagueId => (
        <View key={leagueId} style={styles.leagueSection}>
          <Text style={styles.leagueTitle}>League {leagueId}</Text>
          <FlatList
            data={teamsByLeague[leagueId]}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => {
              const isSelected = selectedTeams[leagueId] === item.id;
              return (
                <TouchableOpacity
                  onPress={() => selectTeam(leagueId, item.id)}
                  style={[styles.teamCard, isSelected && styles.teamCardSelected]}
                >
                  <Image source={item.logo} style={styles.teamLogo} />
                  <Text style={[styles.teamName, isSelected && styles.teamNameSelected]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      ))}

      <View style={{ marginVertical: 30, alignItems: 'center' }}>
        <Button title="Submit" onPress={submitOnboarding} color="#1E90FF" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#0D1F2D' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 20, textAlign: 'center' },
  leagueSection: { marginBottom: 25 },
  leagueTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 10 },
  teamCard: {
    width: 100,
    height: 120,
    backgroundColor: '#1A2A3D',
    borderRadius: 10,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
  },
  teamCardSelected: { backgroundColor: '#1E90FF' },
  teamLogo: { width: 60, height: 60, marginBottom: 5 },
  teamName: { fontSize: 14, color: '#fff', textAlign: 'center' },
  teamNameSelected: { fontWeight: 'bold', color: '#fff' },
});