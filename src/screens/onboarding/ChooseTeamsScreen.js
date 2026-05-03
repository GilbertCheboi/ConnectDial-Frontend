import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
  SafeAreaView,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import api from '../../api/client';
import { AuthContext } from '../../store/authStore';

const API_BASE_URL = 'http://10.199.198.201.40:8000';

export default function ChooseTeamsScreen({ route, navigation }) {
  const { user } = useContext(AuthContext);
  const {
    selectedLeagues,
    accountType = 'fan',
    mode,
  } = route.params || {
    selectedLeagues: [],
    accountType: 'fan',
    mode: 'onboarding',
  };
  const isAddingNew = mode === 'add';
  const isEditMode = mode === 'edit';

  const [teamsData, setTeamsData] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeams, setSelectedTeams] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    if (
      isEditMode &&
      user?.fan_preferences &&
      Object.keys(teamsData).length > 0
    ) {
      const currentSelected = {};
      user.fan_preferences.forEach(pref => {
        if (selectedLeagues.includes(pref.league)) {
          currentSelected[pref.league] = pref.team;
        }
      });
      setSelectedTeams(currentSelected);
    }
  }, [isEditMode, user, teamsData, selectedLeagues]);

  const fetchTeams = async () => {
    try {
      const organized = {};
      const requests = selectedLeagues.map(id =>
        api.get(`${API_BASE_URL}/api/teams/?league_id=${id}&limit=100`),
      );
      const responses = await Promise.all(requests);
      responses.forEach((res, i) => {
        const data = res.data.results || res.data;
        organized[selectedLeagues[i]] = Array.isArray(data) ? data : [];
      });
      setTeamsData(organized);
    } catch (e) {
      Alert.alert(
        'Connection Error',
        'Could not reach the ConnectDial server.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    if (Object.keys(selectedTeams).length === 0) {
      Alert.alert('Wait!', 'Please select at least one team.');
      return;
    }

    setIsSubmitting(true);
    const payload = {
      account_type: accountType,
      fan_preferences: Object.entries(selectedTeams).map(([lId, tId]) => ({
        league: parseInt(lId),
        team: tId,
      })),
      append_mode: isAddingNew,
    };

    console.log('🚀 Fan account - Saving preferences:', accountType);
    console.log('📋 Payload being sent:', JSON.stringify(payload, null, 2));
    console.log('📊 Selected teams:', selectedTeams);

    try {
      const response = await api.post('auth/onboarding/', payload);
      console.log('✅ Preferences saved successfully:', response.data);

      if (isEditMode) {
        Alert.alert('Success', 'Your preferences have been updated!');
        navigation.goBack(); // Go back to the drawer or previous screen
      } else if (isAddingNew) {
        navigation.navigate('MainApp', { screen: 'Profile' });
      } else {
        navigation.navigate('CreateProfile');
      }
    } catch (error) {
      console.error('❌ Save preferences error:');
      console.error('Error response data:', error.response?.data);
      console.error('Error message:', error.message);
      console.error('Full error:', error);

      Alert.alert(
        'Error',
        'Failed to save preferences. Check console for details.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Render Row Component ---
  const renderLeagueRow = ({ item: leagueId }) => {
    const teams = (teamsData[leagueId] || []).filter(t =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    if (teams.length === 0) return null;

    return (
      <View style={styles.leagueSection}>
        <View style={styles.leagueHeader}>
          <MaterialCommunityIcons
            name="trophy-variant-outline"
            size={18}
            color="#1E90FF"
          />
          <Text style={styles.leagueTitle}>
            {teams[0]?.league_name || `League ${leagueId}`}
          </Text>
        </View>

        <FlatList
          horizontal
          data={teams}
          keyExtractor={team => team.id.toString()}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalListPadding}
          // 🚀 This ensures the horizontal list captures the swipe first
          nestedScrollEnabled={true}
          renderItem={({ item: team }) => {
            const isSelected = selectedTeams[leagueId] === team.id;
            return (
              <TouchableOpacity
                style={[styles.teamCard, isSelected && styles.selectedCard]}
                onPress={() =>
                  setSelectedTeams(prev => ({ ...prev, [leagueId]: team.id }))
                }
                activeOpacity={0.8}
              >
                {team.logo ? (
                  <Image source={{ uri: team.logo }} style={styles.logo} />
                ) : (
                  <View style={styles.placeholderLogo}>
                    <MaterialCommunityIcons
                      name="shield-outline"
                      size={28}
                      color="#475569"
                    />
                  </View>
                )}
                <Text
                  style={[styles.teamName, isSelected && styles.selectedText]}
                  numberOfLines={1}
                >
                  {team.name}
                </Text>
                {isSelected && (
                  <View style={styles.checkBadge}>
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={16}
                      color="#1E90FF"
                    />
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1E90FF" />
        <Text style={{ color: '#64748B', marginTop: 10 }}>
          Loading your leagues...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Main Vertical List */}
        <FlatList
          data={selectedLeagues}
          keyExtractor={item => item.toString()}
          renderItem={renderLeagueRow}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.title}>
                {isEditMode ? 'Update Your Teams' : 'Pick Your Teams'}
              </Text>
              <View style={styles.searchBox}>
                <MaterialCommunityIcons
                  name="magnify"
                  size={20}
                  color="#64748B"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Search teams..."
                  placeholderTextColor="#64748B"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </View>
          }
          ListFooterComponent={<View style={{ height: 120 }} />}
          showsVerticalScrollIndicator={false}
        />

        {/* Floating Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.btn, isSubmitting && styles.btnDisabled]}
            onPress={handleFinish}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>
                {isEditMode ? 'Update Preferences' : 'Continue'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0D1F2D' },
  container: { flex: 1 },
  centered: {
    flex: 1,
    backgroundColor: '#0D1F2D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: { padding: 20, paddingTop: 30 },
  title: { fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 20 },
  searchBox: {
    flexDirection: 'row',
    backgroundColor: '#1A2A3D',
    paddingHorizontal: 15,
    borderRadius: 15,
    height: 50,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  input: { flex: 1, color: '#fff', marginLeft: 10, fontSize: 16 },
  leagueSection: { marginVertical: 15 },
  leagueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 20,
    marginBottom: 12,
  },
  leagueTitle: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
    marginLeft: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  horizontalListPadding: { paddingLeft: 20, paddingRight: 10 },
  teamCard: {
    width: 110,
    height: 135,
    backgroundColor: '#1A2A3D',
    marginRight: 12,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderWidth: 1.5,
    borderColor: '#1E293B',
  },
  selectedCard: { borderColor: '#1E90FF', backgroundColor: '#162535' },
  logo: { width: 50, height: 50, resizeMode: 'contain', marginBottom: 10 },
  placeholderLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#243547',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  teamName: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  selectedText: { color: '#fff' },
  checkBadge: { position: 'absolute', top: 10, right: 10 },
  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: 20,
    backgroundColor: '#0D1F2D',
    borderTopWidth: 1,
    borderColor: '#1E293B',
  },
  btn: {
    backgroundColor: '#1E90FF',
    height: 55,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { backgroundColor: '#1A2A3D' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
