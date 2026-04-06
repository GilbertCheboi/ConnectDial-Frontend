import React, { createContext, useState, useEffect } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ThemeContext = createContext();
const STORAGE_KEY = '@app_theme';

const themes = {
  light: {
    mode: 'light',
    colors: {
      background: '#F8FAFC',
      surface: '#FFFFFF',
      card: '#FFFFFF',
      text: '#0F172A',
      subText: '#334155',
      border: '#E2E8F0',
      primary: '#1E90FF',
      secondary: '#64748B',
      icon: '#1E90FF',
      button: '#1E90FF',
      buttonText: '#FFFFFF',
      inputBackground: '#F1F5F9',
      overlay: 'rgba(15, 23, 42, 0.1)',
      drawerBackground: '#F8FAFC',
      drawerText: '#0F172A',
      drawerIcon: '#1E90FF',
      tabBar: '#FFFFFF',
      tabBarInactive: '#64748B',
      header: '#FFFFFF',
      headerTint: '#0F172A',
      notificationBadge: '#FF4B4B',
      sheetBackground: '#F8FAFC',
    },
  },
  dark: {
    mode: 'dark',
    colors: {
      background: '#0A1624',
      surface: '#0D1F2D',
      card: '#112634',
      text: '#F8FAFC',
      subText: '#94A3B8',
      border: '#1E293B',
      primary: '#1E90FF',
      secondary: '#64748B',
      icon: '#1E90FF',
      button: '#1E90FF',
      buttonText: '#FFFFFF',
      inputBackground: '#112634',
      overlay: 'rgba(255, 255, 255, 0.05)',
      drawerBackground: '#0D1F2D',
      drawerText: '#F8FAFC',
      drawerIcon: '#1E90FF',
      tabBar: '#0D1F2D',
      tabBarInactive: '#64748B',
      header: '#0D1F2D',
      headerTint: '#F8FAFC',
      notificationBadge: '#FF4B4B',
      sheetBackground: '#0D1F2D',
    },
  },
};

export const ThemeProvider = ({ children }) => {
  const [themeName, setThemeName] = useState('dark');
  const [theme, setTheme] = useState(themes.dark);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem(STORAGE_KEY);
        const preferredTheme =
          storedTheme || Appearance.getColorScheme() || 'dark';
        const normalized = ['dark', 'light'].includes(preferredTheme)
          ? preferredTheme
          : 'dark';
        setThemeName(normalized);
        setTheme(themes[normalized]);
      } catch (err) {
        console.error('Theme load error:', err);
        setThemeName('dark');
        setTheme(themes.dark);
      } finally {
        setLoading(false);
      }
    };

    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const nextTheme = themeName === 'dark' ? 'light' : 'dark';
    try {
      await AsyncStorage.setItem(STORAGE_KEY, nextTheme);
    } catch (err) {
      console.error('Theme save error:', err);
    }
    setThemeName(nextTheme);
    setTheme(themes[nextTheme]);
  };

  return (
    <ThemeContext.Provider
      value={{ themeName, theme, toggleTheme, themes, loading }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
