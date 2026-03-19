import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../../store/authStore';
import api from '../../api/client';

// Local assets for teams
const teamsByLeague = {
  1: [
    { id: 1, name: 'Arsenal', logo: require('../assets/arsenal.jpeg') },
    { id: 11, name: 'Liverpool', logo: require('../assets/liverpool.png') },
    {
      id: 12,
      name: 'Manchester United',
      logo: require('../assets/manutd.png'),
    },
  ],
  2: [
    { id: 2, name: 'Lakers', logo: require('../assets/lakers.png') },
    { id: 21, name: 'Warriors', logo: require('../assets/warriors.png') },
    { id: 22, name: 'Celtics', logo: require('../assets/celtics.png') },
  ],
  3: [
    { id: 3, name: 'Chiefs', logo: require('../assets/chiefs.png') },
    { id: 31, name: 'Cowboys', logo: require('../assets/cowboys.png') },
    { id: 32, name: '49ers', logo: require('../assets/49ers.png') },
  ],
};

export default function ChooseTeamsScreen({ route }) {
  // --- 1. HOOKS ALWAYS AT THE TOP (Unconditional) ---
  const navigation = useNavigation();
  const { setIsNew } = useContext(AuthContext);

  // --- 2. STATE & PARAMS ---
  const { selectedLeagues } = route.params || { selectedLeagues: [] };
  const [selectedTeams, setSelectedTeams] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- 3. HANDLERS ---
  const selectTeam = (leagueId, teamId) => {
    setSelectedTeams(prev => ({ ...prev, [leagueId]: teamId }));
  };

  const handleOnboardingSubmit = async () => {
    // Validation
    if (Object.keys(selectedTeams).length !== selectedLeagues.length) {
      Alert.alert(
        'Selection Incomplete',
        'Please pick one team for every league you selected.',
      );
      return;
    }

    setIsSubmitting(true);

    const payload = {
      fan_preferences: Object.entries(selectedTeams).map(
        ([leagueId, teamId]) => ({
          league: parseInt(leagueId),
          team: teamId,
        }),
      ),
    };

    try {
      console.log('Step 1: Sending preferences to Django...');
      const response = await api.post('auth/onboarding/', payload);
      console.log('Step 2: Backend Success!', response.status);

      // Navigate to CreateProfile
      console.log('Step 3: Navigating to CreateProfile...');
      navigation.navigate('CreateProfile');
    } catch (error) {
      console.error('Onboarding Submit Error:', error);
      let msg = "We couldn't save your preferences.";
      if (error.response?.data) {
        msg =
          typeof error.response.data === 'object'
            ? JSON.stringify(error.response.data)
            : error.response.data;
      } else {
        msg = error.message;
      }
      Alert.alert('System Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Pick One Team Per League</Text>

        {selectedLeagues.map(leagueId => (
          <View key={leagueId} style={styles.leagueSection}>
            <Text style={styles.leagueTitle}>League {leagueId}</Text>
            <FlatList
              data={teamsByLeague[leagueId] || []}
              keyExtractor={item => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = selectedTeams[leagueId] === item.id;
                return (
                  <TouchableOpacity
                    onPress={() => selectTeam(leagueId, item.id)}
                    style={[
                      styles.teamCard,
                      isSelected && styles.teamCardSelected,
                    ]}
                    activeOpacity={0.7}
                  >
                    <Image source={item.logo} style={styles.teamLogo} />
                    <Text
                      style={[
                        styles.teamName,
                        isSelected && styles.teamNameSelected,
                      ]}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            isSubmitting && styles.submitButtonDisabled,
          ]}
          onPress={handleOnboardingSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Continue to Profile</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#0D1F2D' },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 40 },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 30,
    textAlign: 'center',
  },
  leagueSection: { marginBottom: 30 },
  leagueTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E90FF',
    marginBottom: 12,
  },
  teamCard: {
    width: 110,
    height: 130,
    backgroundColor: '#1A2A3D',
    borderRadius: 12,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: '#2A3A4D',
  },
  teamCardSelected: {
    backgroundColor: '#1E90FF',
    borderColor: '#fff',
    elevation: 5,
  },
  teamLogo: { width: 60, height: 60, resizeMode: 'contain', marginBottom: 8 },
  teamName: { fontSize: 14, color: '#BDC3C7', textAlign: 'center' },
  teamNameSelected: { fontWeight: 'bold', color: '#fff' },
  footer: {
    padding: 20,
    backgroundColor: '#0D1F2D',
    borderTopWidth: 1,
    borderTopColor: '#1A2A3D',
  },
  submitButton: {
    backgroundColor: '#1E90FF',
    height: 55,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: { backgroundColor: '#555' },
  submitText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
