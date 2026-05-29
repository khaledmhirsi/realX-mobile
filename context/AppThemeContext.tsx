import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Appearance, type ColorSchemeName } from 'react-native';

import { Colors, type AppThemeColors, type AppThemeMode } from '../constants/Colors';
import { logger } from '../utils/logger';

const THEME_STORAGE_KEY = '@realx/theme-mode';

type AppThemeContextValue = {
  mode: AppThemeMode;
  isDark: boolean;
  theme: AppThemeColors;
  setThemeMode: (nextMode: AppThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

function normalizeColorScheme(colorScheme: ColorSchemeName | null | undefined): AppThemeMode {
  return colorScheme === 'dark' ? 'dark' : 'light';
}

function isAppThemeMode(value: string | null): value is AppThemeMode {
  return value === 'light' || value === 'dark';
}

export function AppThemeProvider({ children }: PropsWithChildren) {
  const [mode, setMode] = useState<AppThemeMode>(() => normalizeColorScheme(Appearance.getColorScheme()));
  const hasStoredPreferenceRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const loadStoredTheme = async () => {
      try {
        const storedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);

        if (cancelled) return;

        if (isAppThemeMode(storedMode)) {
          hasStoredPreferenceRef.current = true;
          setMode(storedMode);
          Appearance.setColorScheme(storedMode);
        }
      } catch (error) {
        logger.warn('Error loading theme preference:', error);
      }
    };

    void loadStoredTheme();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      const nextMode = normalizeColorScheme(colorScheme);

      if (!hasStoredPreferenceRef.current && nextMode !== mode) {
        setMode(nextMode);
      }
    });

    return () => subscription.remove();
  }, [mode]);

  const setThemeMode = useCallback(async (nextMode: AppThemeMode) => {
    if (nextMode === mode) {
      return;
    }

    hasStoredPreferenceRef.current = true;
    setMode(nextMode);
    Appearance.setColorScheme(nextMode);

    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode);
    } catch (error) {
      logger.warn('Error saving theme preference:', error);
    }
  }, [mode]);

  const toggleTheme = useCallback(async () => {
    await setThemeMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setThemeMode]);

  const value = useMemo<AppThemeContextValue>(() => ({
    mode,
    isDark: mode === 'dark',
    theme: Colors.themes[mode],
    setThemeMode,
    toggleTheme,
  }), [mode, setThemeMode, toggleTheme]);

  return (
    <AppThemeContext.Provider value={value}>
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used inside AppThemeProvider');
  }

  return context;
}
