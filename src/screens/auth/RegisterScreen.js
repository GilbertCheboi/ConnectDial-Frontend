import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { registerUser } from '../../api/auth';

export default function RegisterScreen({ navigation }) {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
  });

  const handleRegister = async () => {
    try {
      await registerUser(form);
      navigation.navigate('Login');
    } catch {
      alert('Registration failed');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register</Text>

      <TextInput placeholder="Username" onChangeText={v => setForm({ ...form, username: v })} style={styles.input} />
      <TextInput placeholder="Email" onChangeText={v => setForm({ ...form, email: v })} style={styles.input} />
      <TextInput placeholder="Password" secureTextEntry onChangeText={v => setForm({ ...form, password: v })} style={styles.input} />

      <Button title="Register" onPress={handleRegister} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 24, marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, padding: 10, marginBottom: 12 },
});
