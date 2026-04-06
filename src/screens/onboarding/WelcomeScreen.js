import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

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
  const handleSelection = type => {
    if (type === 'fan') {
      navigation.navigate('SelectLeagues', { accountType: 'fan' });
    } else {
      navigation.navigate('CreateProfile', {
        mode: 'onboarding',
        accountType: type,
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to ConnectDial</Text>
      <Text style={styles.subtitle}>
        Choose how you want to join the platform. Fans will pick their teams,
        while media and organizations can create a neutral profile.
      </Text>

      {accountOptions.map(option => (
        <TouchableOpacity
          key={option.key}
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => handleSelection(option.key)}
        >
          <Text style={styles.cardTitle}>{option.title}</Text>
          <Text style={styles.cardDescription}>{option.description}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1F2D',
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#112634',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  cardDescription: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
  },
});
