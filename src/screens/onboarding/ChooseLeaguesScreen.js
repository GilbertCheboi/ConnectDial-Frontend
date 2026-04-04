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
  ActivityIndicator,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import axios from 'axios';

// 🚀 Replace with your HP 290 local IP or production domain
const API_BASE_URL = 'http://192.168.100.107:8000/api';

export default function ChooseLeaguesScreen({ navigation, route }) {
  const [leagues, setLeagues] = useState([]);
  const [selectedLeagues, setSelectedLeagues] = useState([]);
  const [loading, setLoading] = useState(true);

  const isAddingNew = route.params?.mode === 'add';

  // 🚀 Fetch leagues from Django on mount
  useEffect(() => {
    fetchLeagues();
  }, []);

const fetchLeagues = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/leagues/`);
      
      // 🚀 THE FIX: If there are results, use them. Otherwise, fallback to data.
      const leagueData = response.data.results ? response.data.results : response.data;
      
      setLeagues(leagueData);
    } catch (error) {
      console.error("Error fetching leagues:", error);
      Alert.alert("Connection Error", "Could not load leagues from the server.");
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
          {/* 🚀 Use { uri: item.logo } for Firebase Cloud URLs */}
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
