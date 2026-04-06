import { AuthProvider } from './src/store/authStore';
import { ThemeProvider } from './src/store/themeStore';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppNavigator />
      </ThemeProvider>
    </AuthProvider>
  );
}
