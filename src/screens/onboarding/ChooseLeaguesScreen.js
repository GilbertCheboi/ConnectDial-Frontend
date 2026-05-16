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
import { ThemeContext } from '../../store/themeStore';

// 🚀 Replace with your HP 290 local IP or production domain
const API_BASE_URL = 'http://api.connectdial.com/api';

export default function ChooseLeaguesScreen({ navigation, route }) {
  const { user } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext) || {
    theme: {
      colors: {
        background: '#0D1F2D',
        surface: '#1A2A3D',
        card: '#0D1F2D',
        text: '#F8FAFC',
        subText: '#64748B',
        border: '#1E293B',
        primary: '#1E90FF',
        secondary: '#64748B',
      },
    },
  };

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
        style={[
          styles.card,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          isSelected && [styles.cardSelected, { borderColor: theme.colors.primary, backgroundColor: theme.colors.card }]
        ]}
      >
        <View style={styles.logoContainer}>
          <Image
            source={{ uri: item.logo }}
            style={styles.logo}
            resizeMode="contain"
          />
          {isSelected && (
            <View style={[styles.checkBadge, { backgroundColor: theme.colors.primary }]}>
              <MaterialCommunityIcons
                name="check-circle"
                size={20}
                color={theme.colors.buttonText}
              />
            </View>
          )}
        </View>
        <Text style={[styles.name, { color: theme.colors.subText }, isSelected && [styles.nameSelected, { color: theme.colors.text }]]}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ color: theme.colors.text, marginTop: 10 }}>Loading Leagues...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {isEditMode ? 'Edit Your Leagues' : 'Welcome to ConnectDial'}
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.subText }]}>
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

      <View style={[styles.footer, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.border }]}>
        <TouchableOpacity style={[styles.nextButton, { backgroundColor: theme.colors.primary }]} onPress={proceed}>
          <Text style={[styles.nextButtonText, { color: theme.colors.buttonText }]}>
            {isEditMode
              ? 'Next: Update Teams'
              : accountType === 'fan'
              ? 'Next: Select Teams'
              : 'Continue to Profile'}
          </Text>
          <MaterialCommunityIcons name="arrow-right" size={20} color={theme.colors.buttonText} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { padding: 25, paddingTop: 40 },
  title: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
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
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  cardSelected: {
    borderWidth: 2,
  },
  logoContainer: { position: 'relative', marginBottom: 12 },
  logo: { width: 70, height: 70, borderRadius: 10 },
  checkBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    borderRadius: 10,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  nameSelected: { fontWeight: 'bold' },
  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: 20,
    borderTopWidth: 1,
  },
  nextButton: {
    flexDirection: 'row',
    height: 55,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
});
