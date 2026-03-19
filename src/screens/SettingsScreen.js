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

export default function SettingsScreen() {
  const { logout } = useContext(AuthContext);

  const SettingItem = ({ icon, label, onPress, color = '#fff' }) => (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <View style={styles.itemLeft}>
        <Ionicons name={icon} size={22} color={color} />
        <Text style={[styles.label, { color }]}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#444" />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>Account</Text>
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

      <Text style={styles.sectionTitle}>Support</Text>
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

      <View style={styles.logoutContainer}>
        <SettingItem
          icon="log-out-outline"
          label="Log Out"
          onPress={logout}
          color="#FF4B4B"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1F2D', padding: 15 },
  sectionTitle: {
    color: '#1E90FF',
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
    backgroundColor: '#162A3B',
    padding: 15,
    borderRadius: 12,
    marginBottom: 8,
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center' },
  label: { fontSize: 16, marginLeft: 15 },
  logoutContainer: { marginTop: 20, marginBottom: 40 },
});
