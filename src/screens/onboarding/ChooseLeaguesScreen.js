import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import axios from 'axios';
import api from '../../api/client';
import { AuthContext } from '../../store/authStore';

// 🚀 Replace with your HP 290 local IP or production domain
const API_BASE_URL = 'http://192.168.100.40:8000/api';

export default function ChooseLeaguesScreen({ navigation, route }) {
  const { user } = useContext(AuthContext);
  const [leagues, setLeagues] = useState([]);
  const [selectedLeagues, setSelectedLeagues] = useState([]);
  const [loading, setLoading] = useState(true);

  const accountType = route.params?.accountType || user?.account_type || 'fan';
  const isEditMode = route.params?.mode === 'edit';
  const isAddingNew = route.params?.mode === 'add';

  // 🚀 Fetch leagues from Django on mount
  useEffect(() => {
    fetchLeagues();
    if (isEditMode && user?.fan_preferences) {
      const currentLeagues = user.fan_preferences.map(pref => pref.league);
      setSelectedLeagues(currentLeagues);
    }
  }, [isEditMode, user]);

  const fetchLeagues = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/leagues/`);

      // 🚀 THE FIX: If there are results, use them. Otherwise, fallback to data.
      const leagueData = response.data.results
        ? response.data.results
        : response.data;

      setLeagues(leagueData);
    } catch (error) {
      console.error('Error fetching leagues:', error);
      Alert.alert(
        'Connection Error',
        'Could not load leagues from the server.',
      );
    } finally {
      setLoading(false);
    }
  };

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

    if (accountType === 'fan') {
      navigation.navigate('SelectTeams', {
        selectedLeagues,
        accountType,
        mode: isEditMode ? 'edit' : 'onboarding',
      });
    } else {
      // For news/organization, save leagues directly and skip to profile creation
      saveLeaguesAndProceed();
    }
  };

  const saveLeaguesAndProceed = async () => {
    const payload = {
      account_type: accountType,
      fan_preferences: selectedLeagues.map(leagueId => ({
        league: leagueId,
      })),
      append_mode: isAddingNew,
    };

    console.log('🚀 Saving preferences for:', accountType);
    console.log('📋 Payload being sent:', JSON.stringify(payload, null, 2));

    try {
      setLoading(true);
      const response = await api.post('auth/onboarding/', payload);
      console.log('✅ Preferences saved successfully:', response.data);

      if (isEditMode) {
        // For edit mode, go back to the previous screen
        navigation.goBack();
        Alert.alert('Success', 'Leagues updated successfully!');
      } else {
        // 🚀 THE FIX: Pass selectedLeagues forward so CreateProfile knows they exist
        // This prevents the "Organization accounts must select at least one league" error
        navigation.navigate('CreateProfile', {
          accountType: accountType,
          mode: 'onboarding',
          selectedLeagues: selectedLeagues,
        });
      }
    } catch (error) {
      console.error('❌ Save preferences error:');
      console.error('Error response data:', error.response?.data);
      console.error('Error message:', error.message);

      Alert.alert(
        'Error',
        'Failed to save preferences. Check console for details.',
      );
    } finally {
      setLoading(false);
    }
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
          <Image
            source={{ uri: item.logo }}
            style={styles.logo}
            resizeMode="contain"
          />
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

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#1E90FF" />
        <Text style={{ color: '#fff', marginTop: 10 }}>Loading Leagues...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {isEditMode ? 'Edit Your Leagues' : 'Welcome to ConnectDial'}
        </Text>
        <Text style={styles.subtitle}>
          {isEditMode
            ? 'Update the leagues you want to follow'
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
          <Text style={styles.nextButtonText}>
            {isEditMode
              ? 'Next: Update Teams'
              : accountType === 'fan'
              ? 'Next: Select Teams'
              : 'Continue to Profile'}
          </Text>
          <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1F2D' },
  centered: { justifyContent: 'center', alignItems: 'center' },
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
  logo: { width: 70, height: 70, borderRadius: 10 },
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
