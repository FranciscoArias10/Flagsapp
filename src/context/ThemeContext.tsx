import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemePreference } from '../types';
import { getThemeColors, ThemeColors, LightColors } from '../utils/colors';

const THEME_STORAGE_KEY = '@flagspp_theme_preference_v1';

interface ThemeContextType {
  themePreference: ThemePreference;
  isDark: boolean;
  colors: ThemeColors;
  setThemePreference: (preference: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  themePreference: 'system',
  isDark: false,
  colors: LightColors,
  setThemePreference: async () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadStoredTheme = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (stored === 'system' || stored === 'light' || stored === 'dark') {
          setThemePreferenceState(stored);
        }
      } catch {
        // Fallback to system default
      } finally {
        setIsLoaded(true);
      }
    };
    loadStoredTheme();
  }, []);

  const setThemePreference = async (newPref: ThemePreference) => {
    setThemePreferenceState(newPref);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newPref);
    } catch {}
  };

  const isDark = useMemo(() => {
    if (themePreference === 'dark') return true;
    if (themePreference === 'light') return false;
    return systemColorScheme === 'dark';
  }, [themePreference, systemColorScheme]);

  const colors = useMemo(() => getThemeColors(isDark), [isDark]);

  const value = useMemo(
    () => ({
      themePreference,
      isDark,
      colors,
      setThemePreference,
    }),
    [themePreference, isDark, colors]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
