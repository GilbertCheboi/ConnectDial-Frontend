import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemeContext } from '../../store/themeStore';

const accountOptions = [
  {
    key: 'fan',
    title: 'Fan',
    description:
      'Follow your favourite teams and leagues, and join the fan community.',
  },
  {
    key: 'news',
    title: 'News / Media',
    description:
      'Create a professional news presence without choosing a favorite team.',
  },
  {
    key: 'organization',
    title: 'Club / Organization',
    description:
      'Represent your club or organization with a dedicated profile.',
  },
];

export default function WelcomeScreen({ navigation }) {
  const { theme } = useContext(ThemeContext) || {
    theme: {
      colors: {
        background: '#0D1F2D',
        card: '#112634',
        text: '#F8FAFC',
        subText: '#94A3B8',
        border: '#1E293B',
        primary: '#1E90FF',
      },
    },
  };

  const handleSelection = type => {
    // 🚀 FIXED: Everyone now goes to SelectLeagues first.
    // We pass the actual 'type' variable so ChooseLeagues knows who is onboarding.
    navigation.navigate('SelectLeagues', {
      accountType: type,
      mode: 'onboarding',
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Welcome to ConnectDial</Text>
      <Text style={[styles.subtitle, { color: theme.colors.subText }]}>
        Choose how you want to join the platform. Fans will pick their teams,
        while media and organizations can create a neutral profile.
      </Text>

      {accountOptions.map(option => (
        <TouchableOpacity
          key={option.key}
          style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
          activeOpacity={0.85}
          onPress={() => handleSelection(option.key)}
        >
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{option.title}</Text>
          <Text style={[styles.cardDescription, { color: theme.colors.subText }]}>{option.description}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
});
