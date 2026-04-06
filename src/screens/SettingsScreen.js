// src/screens/SettingsScreen.js
import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { AuthContext } from '../store/authStore';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { ThemeContext } from '../store/themeStore';

export default function SettingsScreen() {
  const { logout } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext) || {
    theme: {
      colors: {
        background: '#0D1F2D',
        surface: '#0D1F2D',
        text: '#FFFFFF',
        subText: '#94A3B8',
        primary: '#1E90FF',
        border: '#1E293B',
        secondary: '#64748B',
        card: '#112634',
        notificationBadge: '#FF4B4B',
        buttonText: '#FFFFFF',
      },
    },
  };

  const SettingItem = ({ icon, label, onPress, color = theme.colors.text }) => (
    <TouchableOpacity style={styles(theme).item} onPress={onPress}>
      <View style={styles(theme).itemLeft}>
        <Ionicons name={icon} size={22} color={color} />
        <Text style={[styles(theme).label, { color }]}>{label}</Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={20}
        color={theme.colors.secondary}
      />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles(theme).container}>
      <Text style={styles(theme).sectionTitle}>Account</Text>
      <SettingItem
        icon="person-outline"
        label="Edit Profile"
        onPress={() => {}}
      />
      <SettingItem
        icon="notifications-outline"
        label="Notifications"
        onPress={() => {}}
      />
      <SettingItem
        icon="lock-closed-outline"
        label="Privacy"
        onPress={() => {}}
      />

      <Text style={styles(theme).sectionTitle}>Support</Text>
      <SettingItem
        icon="help-circle-outline"
        label="Help Center"
        onPress={() => {}}
      />
      <SettingItem
        icon="information-circle-outline"
        label="About"
        onPress={() => {}}
      />

      <View style={styles(theme).logoutContainer}>
        <SettingItem
          icon="log-out-outline"
          label="Log Out"
          onPress={logout}
          color={theme.colors.notificationBadge}
        />
      </View>
    </ScrollView>
  );
}

const styles = theme =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: 15,
    },
    sectionTitle: {
      color: theme.colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
      marginTop: 25,
      marginBottom: 10,
      marginLeft: 10,
      textTransform: 'uppercase',
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.card,
      padding: 15,
      borderRadius: 12,
      marginBottom: 8,
    },
    itemLeft: { flexDirection: 'row', alignItems: 'center' },
    label: { fontSize: 16, marginLeft: 15 },
    logoutContainer: { marginTop: 20, marginBottom: 40 },
  });
