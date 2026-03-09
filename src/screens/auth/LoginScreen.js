import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { loginUser} from '../../api/auth';
import { googleLogin } from '../../services/auth';
import { AuthContext } from '../../store/authStore';
import { configureGoogleSignin } from '../../services/googleSignIn';

export default function LoginScreen({ navigation }) {
  const { login } = useContext(AuthContext);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Initialize Google SignIn on component mount
  useEffect(() => {
    configureGoogleSignin();
  }, []);

  // Email / username login
  const handleLogin = async () => {
    try {
      const data = await loginUser(username, password);
      await login(data.access);
    } catch (err) {
      alert('Invalid credentials');
    }
  };

  // Google login
  const handleGoogleLogin = async () => {
    try {
      const user = await googleLogin();
      alert(`Welcome ${user.username}`);
      // You can store JWT via AuthContext
      await login(user.access); // if your googleLogin returns access
    } catch (err) {
      console.error(err);
      alert('Google login failed');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

      {/* Email Login */}
      <TextInput
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        style={styles.input}
      />
      <TextInput
        placeholder="Password"
        value={password}
        secureTextEntry
        onChangeText={setPassword}
        style={styles.input}
      />
      <Button title="Login" onPress={handleLogin} />

      <Text style={{ textAlign: 'center', marginVertical: 10 }}>or</Text>

      {/* Social Login */}
      <Button title="Continue with Google" color="#DB4437" onPress={handleGoogleLogin} />

      <Text
        onPress={() => navigation.navigate('Register')}
        style={styles.link}
      >
        Create account
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 24, marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, padding: 10, marginBottom: 12 },
  link: { marginTop: 15, textAlign: 'center', color: 'blue' },
});
