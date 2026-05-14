import React, { useState, useEffect, useContext, useCallback } from 'react';
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
import { ThemeContext } from '../../store/themeStore';

export default function ChooseTeamsScreen({ route, navigation }) {
  const { user } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext) || {
    theme: {
      colors: {
        background: '#0D1F2D',
        surface: '#1A2A3D',
        card: '#162535',
        text: '#F8FAFC',
        subText: '#94A3B8',
        border: '#1E293B',
        primary: '#1E90FF',
        secondary: '#64748B',
        inputBackground: '#1A2A3D',
      },
    },
  };

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

  const fetchTeams = useCallback(async () => {
    try {
      const organized = {};
      const requests = selectedLeagues.map(id =>
        // ✅ No API_BASE_URL needed — client.js baseURL handles it
        api.get(`api/teams/?league_id=${id}&limit=100`),
      );
      const responses = await Promise.all(requests);
      responses.forEach((res, i) => {
        const data = res.data.results || res.data;
        organized[selectedLeagues[i]] = Array.isArray(data) ? data : [];
      });
      setTeamsData(organized);
    } catch (e) {
      Alert.alert('Connection Error', 'Could not reach the ConnectDial server.');
    } finally {
      setLoading(false);
    }
  }, [selectedLeagues]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    if (isEditMode && user?.fan_preferences && Object.keys(teamsData).length > 0) {
      const currentSelected = {};
      user.fan_preferences.forEach(pref => {
        if (selectedLeagues.includes(pref.league)) {
          currentSelected[pref.league] = pref.team;
        }
      });
      setSelectedTeams(currentSelected);
    }
  }, [isEditMode, user, teamsData, selectedLeagues]);

  const handleFinish = async () => {
    if (Object.keys(selectedTeams).length === 0) {
      Alert.alert('Wait!', 'Please select at least one team.');
      return;
    }

    setIsSubmitting(true);
    const payload = {
      account_type: accountType,
      fan_preferences: Object.entries(selectedTeams).map(([lId, tId]) => ({
        league: parseInt(lId, 10),
        team: tId,
      })),

      append_mode: isAddingNew,
    };

    try {
      const response = await api.post('auth/onboarding/', payload);
      console.log('✅ Preferences saved successfully:', response.data);

      if (isEditMode) {
        Alert.alert('Success', 'Your preferences have been updated!');
        navigation.navigate('MainApp', { screen: 'Home' });  // ✅ goes to home
      } else if (isAddingNew) {
        navigation.navigate('MainApp', { screen: 'Profile' });
      } else {
        navigation.navigate('CreateProfile');
      }
    } catch (error) {
      console.error('❌ Save preferences error:');
      console.error('Error response data:', error.response?.data);
      console.error('Error message:', error.message);
      Alert.alert('Error', 'Failed to save preferences. Check console for details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderLeagueRow = ({ item: leagueId }) => {
    const teams = (teamsData[leagueId] || []).filter(t =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    if (teams.length === 0) return null;

    return (
      <View style={styles.leagueSection}>
        <View style={styles.leagueHeader}>
          <MaterialCommunityIcons name="trophy-variant-outline" size={18} color={theme.colors.primary} />
          <Text style={[styles.leagueTitle, { color: theme.colors.text }]}>
            {teams[0]?.league_name || `League ${leagueId}`}
          </Text>
        </View>

        <FlatList
          horizontal
          data={teams}
          keyExtractor={team => team.id.toString()}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalListPadding}
          nestedScrollEnabled={true}
          renderItem={({ item: team }) => {
            const isSelected = selectedTeams[leagueId] === team.id;
            return (
              <TouchableOpacity
                style={[
                  styles.teamCard,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                  isSelected && [styles.selectedCard, { borderColor: theme.colors.primary, backgroundColor: theme.colors.card }]
                ]}
                onPress={() =>
                  setSelectedTeams(prev => ({ ...prev, [leagueId]: team.id }))
                }
                activeOpacity={0.8}
              >
                {team.logo ? (
                  <Image source={{ uri: team.logo }} style={styles.logo} />
                ) : (
                  <View style={[styles.placeholderLogo, { backgroundColor: theme.colors.secondary }]}>
                    <MaterialCommunityIcons name="shield-outline" size={28} color={theme.colors.surface} />
                  </View>
                )}
                <Text
                  style={[styles.teamName, { color: theme.colors.subText }, isSelected && [styles.selectedText, { color: theme.colors.text }]]}
                  numberOfLines={1}
                >
                  {team.name}
                </Text>
                {isSelected && (
                  <View style={styles.checkBadge}>
                    <MaterialCommunityIcons name="check-circle" size={16} color={theme.colors.primary} />
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
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ color: theme.colors.secondary, marginTop: 10 }}>Loading your leagues...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <View style={styles.container}>
        <FlatList
          data={selectedLeagues}
          keyExtractor={item => item.toString()}
          renderItem={renderLeagueRow}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                {isEditMode ? 'Update Your Teams' : 'Pick Your Teams'}
              </Text>
              <View style={[styles.searchBox, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
                <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.secondary} />
                <TextInput
                  style={[styles.input, { color: theme.colors.text }]}
                  placeholder="Search teams..."
                  placeholderTextColor={theme.colors.secondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </View>
          }
          ListFooterComponent={<View style={{ height: 120 }} />}
          showsVerticalScrollIndicator={false}
        />

        <View style={[styles.footer, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.border }]}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: theme.colors.primary }, isSubmitting && { backgroundColor: theme.colors.surface }]}
            onPress={handleFinish}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={theme.colors.buttonText} />
            ) : (
              <Text style={[styles.btnText, { color: theme.colors.buttonText }]}>
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
  safeArea: { flex: 1 },
  container: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: { padding: 20, paddingTop: 30 },
  title: { fontSize: 28, fontWeight: '900', marginBottom: 20 },
  searchBox: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    borderRadius: 15,
    height: 50,
    alignItems: 'center',
    borderWidth: 1,
  },
  input: { flex: 1, marginLeft: 10, fontSize: 16 },
  leagueSection: { marginVertical: 15 },
  leagueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 20,
    marginBottom: 12,
  },
  leagueTitle: {
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
    marginRight: 12,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderWidth: 1.5,
  },
  selectedCard: { },
  logo: { width: 50, height: 50, resizeMode: 'contain', marginBottom: 10 },
  placeholderLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  teamName: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  selectedText: { },
  checkBadge: { position: 'absolute', top: 10, right: 10 },
  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: 20,
    borderTopWidth: 1,
  },
  btn: {
    height: 55,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { },
  btnText: { fontWeight: 'bold', fontSize: 16 },
});